// Builds the form bundles and writes a QA kit to dist/qa: Elementor snippets that inline each
// bundle (staging needs no hosting or CDN yet) and a local preview whose admin-ajax is mocked, so
// a local run never reaches WordPress or Salesforce.
//   node scripts/qa-kit.mjs          build and write the kit
//   node scripts/qa-kit.mjs --serve  also serve dist/ on 127.0.0.1 with the mocked endpoint
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const QA = join(DIST, "qa");
const ENDPOINT = "/wp-admin/admin-ajax.php";
const FORMS = ["lead", "interest"];
// A copy of the real success fixture whose redirect_url is local: the mock never points a browser at production.
const SUCCESS_BODY = readFileSync(join(ROOT, "scripts/qa-success.json"), "utf8");
const MAX_BODY = 256 * 1024;
const MAX_SUBMISSIONS = 100;
const KEPT_HEADERS = ["content-type", "x-requested-with", "origin", "host"];
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json" };

const OPTIONAL_ATTRS = `<!--
  Atributos opcionales del contenedor (ver docs/specs/01-requisitos.md):
  data-lang="es|en|pt"  data-theme="light|dark"  data-country="MX"
  data-lead-source="Website|Webinar|..."  data-bdm-owner="005..."
  Webinar: data-zoom-link="https://...zoom.us/j/..."  data-webinar-topic="..."
           data-webinar-date="2026-10-20 18:00:00"  data-webinar-tz="America/Mexico_City"
-->`;

export function inlineScript(js) {
  // An inline bundle must not close its own <script> element early, and "<!--" can open a
  // script-data comment state that swallows the closing tag; both match case-insensitively.
  return js.replace(/<\/(script)/gi, "<\\/$1").replaceAll("<!--", "<\\!--");
}

function elementorSnippet(key, js) {
  return `<!-- atfx-leadkit ${key} (QA): pegar completo en un widget HTML de Elementor. -->
${OPTIONAL_ATTRS}
<div data-atfx-leadkit="${key}" data-lang="es" data-lead-source="Website"></div>
<script data-cfasync="false">${inlineScript(js)}</script>
`;
}

function previewPage(manifest) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>atfx-leadkit QA</title></head>
<body style="font-family:system-ui;max-width:640px;margin:2rem auto;padding:0 16px">
<h1>atfx-leadkit QA local</h1>
<p>admin-ajax está simulado: nada sale de esta máquina.</p>
<h2>lead</h2><div id="lead" data-atfx-leadkit="lead" data-lang="es" data-lead-source="Website" data-debug></div>
<h2>interest</h2><div id="interest" data-atfx-leadkit="interest" data-lang="pt" data-theme="dark"></div>
<h2>popup tardío</h2><div id="late-slot"></div>
<script>
  // Simulates an Elementor popup that inserts the container after load.
  setTimeout(() => {
    const host = document.createElement("div");
    host.id = "late";
    host.dataset.atfxLeadkit = "lead";
    host.dataset.lang = "en";
    document.getElementById("late-slot").append(host);
  }, 1000);
</script>
${FORMS.map((key) => `<script data-cfasync="false" src="/${manifest[key].js}"></script>`).join("\n")}
</body></html>
`;
}

export function buildKit() {
  execFileSync(process.execPath, [join(ROOT, "esbuild.config.mjs")], { stdio: "inherit", cwd: ROOT });
  const manifest = JSON.parse(readFileSync(join(DIST, "manifest.json"), "utf8"));
  mkdirSync(QA, { recursive: true });
  for (const key of FORMS) {
    const js = readFileSync(join(DIST, manifest[key].js), "utf8");
    writeFileSync(join(QA, `${key}-elementor.html`), elementorSnippet(key, js));
  }
  writeFileSync(join(QA, "preview.html"), previewPage(manifest));
  return manifest;
}

function serveStatic(pathname, res) {
  let file;
  try {
    file = resolve(DIST, `.${decodeURIComponent(pathname)}`);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (!file.startsWith(DIST + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = readFileSync(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}

function pick(headers) {
  return Object.fromEntries(KEPT_HEADERS.filter((name) => name in headers).map((name) => [name, headers[name]]));
}

export function startServer(port = 4173) {
  const submissions = [];
  const server = createServer((req, res) => {
    let pathname;
    try {
      ({ pathname } = new URL(req.url ?? "/", "http://127.0.0.1"));
    } catch {
      res.writeHead(400).end();
      return;
    }
    const isQa = pathname === ENDPOINT || pathname === "/__qa/submissions";
    // Blocks DNS rebinding: a foreign page resolving its own name to 127.0.0.1 cannot read or fill the mock.
    const { port: actual } = server.address();
    if (isQa && ![`127.0.0.1:${actual}`, `localhost:${actual}`].includes(req.headers.host ?? "")) {
      res.writeHead(403).end();
      return;
    }
    if (req.method === "POST" && pathname === ENDPOINT) {
      const chunks = [];
      let size = 0;
      let rejected = false;
      req.on("data", (chunk) => {
        size += chunk.length;
        if (rejected) return;
        if (size > MAX_BODY) {
          rejected = true;
          chunks.length = 0;
          res.writeHead(413, { connection: "close" }).end();
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => {
        if (rejected) return;
        submissions.push({ headers: pick(req.headers), body: Buffer.concat(chunks).toString("utf8") });
        if (submissions.length > MAX_SUBMISSIONS) submissions.shift();
        res.writeHead(200, { "content-type": "application/json" }).end(SUCCESS_BODY);
      });
      return;
    }
    if (req.method === "GET" && pathname === "/__qa/submissions") {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(submissions));
      return;
    }
    serveStatic(pathname === "/" ? "/qa/preview.html" : pathname, res);
  });
  return new Promise((ready) => {
    server.listen(port, "127.0.0.1", () => ready({ server, submissions, port: server.address().port }));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildKit();
  console.log(`Kit escrito en ${QA}`);
  if (process.argv.includes("--serve")) {
    const { port } = await startServer(Number(process.env.QA_PORT ?? 4173));
    console.log(`Preview: http://127.0.0.1:${port}/  (Ctrl+C para cerrar)`);
  }
}
