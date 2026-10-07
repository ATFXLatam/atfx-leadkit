// Distribucion (D-13): cada release guarda bytes inmutables y su sha384; el sitio de Vercel se
// re-arma completo con todos los releases porque un deploy reemplaza el conjunto servido.
//
//   node scripts/release.mjs prepare <X.Y.Z> <outDir>     dist/ -> archivos del GitHub Release
//   node scripts/release.mjs assemble <downloadsDir> <siteDir>
//   node scripts/release.mjs smoke <siteDir> [origin]
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// D-31: dominio vercel.app del proyecto, sin dominio propio.
export const ORIGIN = "https://atfx-leadkit-cdn.vercel.app";
export const FORMS = ["lead", "interest"];
const LANGS = ["es", "en", "pt"];
const VERSION_RE = /^\d+\.\d+\.\d+$/;
const PATH_RE = /^\/releases\/(\d+\.\d+\.\d+)\/(lead|interest)-[A-Z0-9]+\.js$/;
const INTEGRITY_RE = /^sha384-[A-Za-z0-9+/]{64}$/;

/** @param {Uint8Array} bytes */
export function integrityOf(bytes) {
  return `sha384-${createHash("sha384").update(bytes).digest("base64")}`;
}

/** @param {string} version */
function assertVersion(version) {
  if (!VERSION_RE.test(version)) throw new Error(`version no es X.Y.Z exacta: ${version}`);
}

/** @param {string} path */
function basename(path) {
  return path.split("/").pop() ?? "";
}

/**
 * @param {{ version: string, commit: string, manifest: Record<string, { js?: string }>, read: (path: string) => Uint8Array }} input
 */
export function prepareRelease({ version, commit, manifest, read }) {
  assertVersion(version);
  const files = FORMS.map((form) => {
    const js = manifest[form]?.js;
    if (!js) throw new Error(`manifest sin el formulario ${form}`);
    const bytes = read(js);
    const path = `/releases/${version}/${basename(js)}`;
    if (!PATH_RE.test(path)) throw new Error(`nombre de archivo inesperado: ${js}`);
    return { form, path, bytes, integrity: integrityOf(bytes) };
  });
  const entries = files.map(({ form, path, integrity }) => [form, { path, integrity }]);
  return { files, releaseJson: { version, commit, files: Object.fromEntries(entries) } };
}

/**
 * Rocket Loader solo respeta data-cfasync si va antes de src; sin crossorigin el SRI falla siempre.
 * @param {{ form: string, path: string, integrity: string, lang?: string, origin?: string }} input
 */
export function renderSnippet({ form, path, integrity, lang = "es", origin = ORIGIN }) {
  if (!FORMS.includes(form)) throw new Error(`formulario desconocido: ${form}`);
  if (!LANGS.includes(lang)) throw new Error(`idioma desconocido: ${lang}`);
  if (!origin.startsWith("https://")) throw new Error(`origen sin https: ${origin}`);
  const match = PATH_RE.exec(path);
  if (!match || match[2] !== form) throw new Error(`ruta sin version exacta o de otro formulario: ${path}`);
  if (!INTEGRITY_RE.test(integrity)) throw new Error(`integrity no es sha384: ${integrity}`);
  return [
    `<div data-atfx-leadkit="${form}" data-lang="${lang}"></div>`,
    `<script data-cfasync="false" defer nowprocket data-wpmeteor-nooptimize="true"`,
    `  src="${origin}${path}"`,
    `  integrity="${integrity}"`,
    `  crossorigin="anonymous"></script>`,
  ].join("\n");
}

/** @param {{ version: string, files: Record<string, { path: string, integrity: string }> }} releaseJson */
export function renderSnippetsDoc(releaseJson) {
  const sections = FORMS.map((form) => {
    const file = releaseJson.files[form];
    if (!file) throw new Error(`release ${releaseJson.version} sin el formulario ${form}`);
    return [`## ${form}`, "", "```html", renderSnippet({ form, ...file }), "```"].join("\n");
  });
  return [`# atfx-leadkit ${releaseJson.version}`, "", ...sections, ""].join("\n");
}

/**
 * @param {{ tag: string, releaseJson: any, bytesByName: Map<string, Uint8Array> }} release
 * @returns {{ path: string, bytes: Uint8Array, integrity: string }[]}
 */
function verifyRelease({ tag, releaseJson, bytesByName }) {
  if (!releaseJson) throw new Error(`${tag}: falta release.json`);
  assertVersion(releaseJson.version);
  if (tag !== `v${releaseJson.version}`) throw new Error(`${tag}: release.json dice ${releaseJson.version}`);
  return FORMS.map((form) => {
    const file = releaseJson.files?.[form];
    if (!file || !PATH_RE.test(file.path)) throw new Error(`${tag}: ${form} sin ruta valida`);
    if (PATH_RE.exec(file.path)?.[1] !== releaseJson.version) throw new Error(`${tag}: ${file.path} fuera de su version`);
    const bytes = bytesByName.get(basename(file.path));
    if (!bytes) throw new Error(`${tag}: falta ${basename(file.path)}`);
    if (integrityOf(bytes) !== file.integrity) throw new Error(`${tag}: hash distinto en ${file.path}`);
    return { path: file.path, bytes, integrity: file.integrity };
  });
}

/** @param {{ tag: string, releaseJson: any, bytesByName: Map<string, Uint8Array> }[]} releases */
export function assembleStore(releases) {
  if (releases.length === 0) throw new Error("no hay releases publicados");
  const files = releases.flatMap(verifyRelease);
  const seen = new Set();
  for (const { path } of files) {
    if (seen.has(path)) throw new Error(`ruta repetida entre releases: ${path}`);
    seen.add(path);
  }
  const versions = releases.map((release) => release.releaseJson.version).sort(compareVersions);
  return { files, index: { versions } };
}

/** @param {string} a @param {string} b */
function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  return (pa[0] - pb[0]) || (pa[1] - pb[1]) || (pa[2] - pb[2]);
}

/**
 * Un header faltante apaga todos los forms a la vez (sin CORS el SRI falla), por eso se revisa
 * tras cada deploy contra el dominio real.
 * @param {{ path: string, integrity: string }[]} files
 * @param {(url: string) => Promise<{ status: number, headers: { get(name: string): string | null }, arrayBuffer(): Promise<ArrayBuffer> }>} fetchImpl
 */
export async function smoke(files, fetchImpl, origin = ORIGIN) {
  const errors = [];
  for (const { path, integrity } of files) {
    const res = await fetchImpl(`${origin}${path}`);
    const header = (name) => res.headers.get(name) ?? "";
    if (res.status !== 200) errors.push(`${path}: status ${res.status}`);
    if (header("access-control-allow-origin") !== "*") errors.push(`${path}: sin access-control-allow-origin *`);
    if (!header("cache-control").includes("immutable")) errors.push(`${path}: cache-control sin immutable`);
    if (header("x-content-type-options") !== "nosniff") errors.push(`${path}: sin nosniff`);
    if (!header("content-type").includes("javascript")) errors.push(`${path}: content-type ${header("content-type")}`);
    if (integrityOf(new Uint8Array(await res.arrayBuffer())) !== integrity) errors.push(`${path}: hash distinto`);
  }
  return errors;
}

/** @param {string} version @param {string} outDir */
function cliPrepare(version, outDir) {
  const manifest = JSON.parse(readFileSync("dist/manifest.json", "utf8"));
  const commit = process.env.GITHUB_SHA ?? "local";
  const { files, releaseJson } = prepareRelease({ version, commit, manifest, read: (p) => readFileSync(join("dist", p)) });
  mkdirSync(outDir, { recursive: true });
  for (const { path, bytes } of files) writeFileSync(join(outDir, basename(path)), bytes);
  writeFileSync(join(outDir, "release.json"), `${JSON.stringify(releaseJson, null, 2)}\n`);
  writeFileSync(join(outDir, "snippets.md"), renderSnippetsDoc(releaseJson));
}

/** @param {string} downloadsDir */
function readDownloads(downloadsDir) {
  return readdirSync(downloadsDir).map((tag) => {
    const dir = join(downloadsDir, tag);
    const names = readdirSync(dir);
    const releaseJson = names.includes("release.json") ? JSON.parse(readFileSync(join(dir, "release.json"), "utf8")) : null;
    const bytesByName = new Map(names.filter((n) => n.endsWith(".js")).map((n) => [n, readFileSync(join(dir, n))]));
    return { tag, releaseJson, bytesByName };
  });
}

/** @param {string} downloadsDir @param {string} siteDir */
function cliAssemble(downloadsDir, siteDir) {
  const { files, index } = assembleStore(readDownloads(downloadsDir));
  for (const { path, bytes } of files) {
    const target = join(siteDir, "public", path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
  const manifest = files.map(({ path, integrity }) => ({ path, integrity }));
  writeFileSync(join(siteDir, "public", "releases.json"), `${JSON.stringify(index, null, 2)}\n`);
  writeFileSync(join(siteDir, "files.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  copyFileSync(fileURLToPath(new URL("../deploy/vercel.json", import.meta.url)), join(siteDir, "vercel.json"));
}

/** @param {string} siteDir @param {string | undefined} origin */
async function cliSmoke(siteDir, origin) {
  const files = JSON.parse(readFileSync(join(siteDir, "files.json"), "utf8"));
  const errors = await smoke(files, fetch, origin ?? ORIGIN);
  if (errors.length > 0) throw new Error(`smoke fallo:\n${errors.join("\n")}`);
  console.log(`smoke ok: ${files.length} archivos`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, a, b] = process.argv.slice(2);
  if (command === "prepare" && a && b) cliPrepare(a, b);
  else if (command === "assemble" && a && b) cliAssemble(a, b);
  else if (command === "smoke" && a) await cliSmoke(a, b);
  else throw new Error("uso: prepare <X.Y.Z> <outDir> | assemble <downloadsDir> <siteDir> | smoke <siteDir> [origin]");
}
