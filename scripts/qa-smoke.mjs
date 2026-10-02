// Smoke run of the QA kit in real engines (Chromium and WebKit, the iOS Safari engine): mounting,
// the late popup container, the delivered inline snippet and full submits against the local mock,
// with the payload checked value by value against docs/specs/03-contrato-salesforce.md. Exits
// non-zero on any failure so it can gate a staging hand-off.
//   node scripts/qa-smoke.mjs
import { request } from "node:http";
import { readFileSync } from "node:fs";
import { chromium, webkit } from "@playwright/test";
import { buildKit, inlineScript, startServer } from "./qa-kit.mjs";

const TIMEOUT = 10_000;
const SETTLE_MS = 500;
const PERSON = { first_name: "Karentest", last_name: "Pruebaqa", email: "qa@karentest.com", phone: "5512345678" };

function check(condition, message) {
  if (!condition) throw new Error(message);
}

// Contract language table: data-lang -> [Email_language_lead__c, Landing_Page_Language__c].
const LANG = { es: ["ESP", "esp"], en: ["ENG", "en"], pt: ["PTG", "pt"] };

function parseMultipart(submission) {
  const type = submission.headers["content-type"] ?? "";
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(type);
  check(type.startsWith("multipart/form-data") && boundary, `payload is not multipart: ${type}`);
  const fields = {};
  for (const part of submission.body.split(`--${boundary[1] ?? boundary[2]}`)) {
    const match = /name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n$/.exec(part);
    if (match) fields[match[1]] = match[2];
  }
  return fields;
}

function assertPayload(submission, { choice, lang }) {
  check(submission.headers["x-requested-with"] === "XMLHttpRequest", "missing X-Requested-With header");
  const fields = parseMultipart(submission);
  const [emailLang, landingLang] = LANG[lang];
  const expected = {
    action: "elementor_pro_forms_send_form",
    "form_fields[first_name]": PERSON.first_name,
    "form_fields[last_name]": PERSON.last_name,
    "form_fields[email]": PERSON.email,
    "form_fields[dialling_code]": "52",
    "form_fields[phone]": PERSON.phone,
    "form_fields[country_of_residence]": "MEX",
    "form_fields[Trading_Experience__c]": choice,
    "form_fields[field_8f8f3d5]": "on",
    "form_fields[Landing_Page_Language__c]": landingLang,
    "form_fields[Email_language_lead__c]": emailLang,
  };
  for (const [key, value] of Object.entries(expected)) {
    check(fields[key] === value, `payload ${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(fields[key])}`);
  }
}

async function fillForm(scope, { choice, email = PERSON.email, submit = true }) {
  const form = scope.locator("form");
  await form.locator('[name="firstName"]').fill(PERSON.first_name);
  await form.locator('[name="lastName"]').fill(PERSON.last_name);
  await form.locator('[name="email"]').fill(email);
  await form.locator('[name="phone"]').fill(PERSON.phone);
  await form.locator('[name="diallingCode"]').selectOption("52");
  await form.locator('[name="country"]').selectOption("MEX");
  await form.locator('[name="choice"]').selectOption(choice);
  await form.locator('[name="accepted"]').check();
  if (submit) await form.locator('button[type="submit"]').click();
}

// Waits for the thank-you, then lets stray duplicate requests land before counting.
async function submitAndSettle(page, scope, title, options, submissions) {
  const before = submissions.length;
  await fillForm(scope, options);
  await scope.locator("[role=status]").getByText(title).waitFor({ timeout: TIMEOUT });
  await page.waitForTimeout(SETTLE_MS);
  check(submissions.length === before + 1, `expected exactly one POST, got ${submissions.length - before}`);
  return submissions.at(-1);
}

async function scenarioInvalid(page, submissions) {
  const lead = page.locator("#lead");
  const before = submissions.length;
  await lead.locator('button[type="submit"]').click();
  await lead.getByText("Ingresa tu nombre").waitFor({ timeout: TIMEOUT });
  await fillForm(lead, { choice: "Intermedio", email: "no-es-un-correo" });
  await lead.getByText("Correo electrónico no válido").waitFor({ timeout: TIMEOUT });
  await page.waitForTimeout(SETTLE_MS);
  check(submissions.length === before, "invalid form must not POST");
}

async function runPreview(page, submissions) {
  await page.goto(`${page.baseUrl}/`);
  await page.locator("#late form").waitFor({ timeout: TIMEOUT });
  check((await page.locator("form").count()) === 3, "expected 3 mounted forms (lead, interest, late)");
  await scenarioInvalid(page, submissions);
  const lead = await submitAndSettle(page, page.locator("#lead"), "¡Registro confirmado!", { choice: "Intermedio" }, submissions);
  assertPayload(lead, { choice: "Intermedio", lang: "es" });

  const late = await submitAndSettle(page, page.locator("#late"), "Registration confirmed!", { choice: "Avanzado" }, submissions);
  assertPayload(late, { choice: "Avanzado", lang: "en" });

  const interest = await submitAndSettle(page, page.locator("#interest"), "Inscrição confirmada!", { choice: "Copytrade" }, submissions);
  assertPayload(interest, { choice: "Copytrade", lang: "pt" });
}

async function runSnippet(page, submissions) {
  const snippet = readFileSync(new URL("../dist/qa/lead-elementor.html", import.meta.url), "utf8");
  const url = `${page.baseUrl}/qa/snippet-host.html`;
  await page.route(url, (route) =>
    route.fulfill({ contentType: "text/html; charset=utf-8", body: `<!doctype html><html><body>${snippet}</body></html>` }),
  );
  await page.goto(url);
  const scope = page.locator('[data-atfx-leadkit="lead"]');
  await scope.locator("form").waitFor({ timeout: TIMEOUT });
  const sent = await submitAndSettle(page, scope, "¡Registro confirmado!", { choice: "Principiante" }, submissions);
  assertPayload(sent, { choice: "Principiante", lang: "es" });
}

const NARROW_VIEWPORT = { width: 360, height: 800 };
const OVERFLOW_TOLERANCE_PX = 1;

// Grid items default to min-width:auto, so a control can grow past the form's inner edge; measured
// per form (light and dark) at a phone width, plus page-level horizontal scroll.
async function runLayout(page) {
  await page.setViewportSize(NARROW_VIEWPORT);
  await page.goto(`${page.baseUrl}/`);
  await page.locator("#late form").waitFor({ timeout: TIMEOUT });
  const rows = await page.evaluate(() =>
    ["#lead", "#interest", "#late"].flatMap((id) => {
      const form = document.querySelector(`${id} form`);
      const style = getComputedStyle(form);
      const inner = form.getBoundingClientRect().right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth);
      return [...form.querySelectorAll("input.atfx-leadkit__control, select.atfx-leadkit__control, button.atfx-leadkit__submit")].map((el) => ({
        id,
        name: el.getAttribute("name") ?? el.className,
        over: Math.round((el.getBoundingClientRect().right - inner) * 100) / 100,
      }));
    }),
  );
  check(rows.length >= 3 * 7, `layout: expected controls in 3 forms, found ${rows.length}`);
  const bad = rows.filter((row) => row.over > OVERFLOW_TOLERANCE_PX);
  check(bad.length === 0, `controls overflow the form inner edge: ${bad.map((r) => `${r.id} ${r.name} +${r.over}px`).join(", ")}`);
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(scroll <= 0, `document has horizontal scroll (${scroll}px)`);
}

async function runEngine(engine, baseUrl, submissions) {
  const browser = await engine.launch();
  const errors = [];
  try {
    for (const run of [runPreview, runSnippet, runLayout]) {
      const page = await browser.newPage();
      page.baseUrl = baseUrl;
      page.setDefaultTimeout(TIMEOUT);
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      page.on("console", (msg) => msg.type() === "error" && errors.push(`console: ${msg.text()}`));
      page.on("requestfailed", (req) => errors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText}`));
      submissions.length = 0;
      await run(page, submissions);
    }
    check(errors.length === 0, "browser errors");
  } catch (error) {
    const detail = errors.length ? ` [browser errors: ${errors.join("; ")}]` : "";
    throw new Error(`${error.message}${detail}`, { cause: error });
  } finally {
    await browser.close();
  }
}

function rawGet(port, path, headers) {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, method: "GET", headers }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
    req.end();
  });
}

function rawPost(port, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, method: "POST", headers }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
    req.end(body);
  });
}

async function runServerChecks(baseUrl, port, submissions) {
  submissions.length = 0;
  check((await fetch(`${baseUrl}/%E0%A4%A`)).status === 400, "malformed URI must answer 400");
  check((await fetch(`${baseUrl}/qa/preview.html`)).status === 200, "server must survive a malformed URI");

  const big = Buffer.alloc(1024 * 1024, "a");
  const bigStatus = await rawPost(port, "/wp-admin/admin-ajax.php", { host: `127.0.0.1:${port}` }, big).catch(() => 413);
  check(bigStatus === 413, `1 MB POST must answer 413, got ${bigStatus}`);
  check(submissions.length === 0, "oversized POST must not be stored");
  check((await fetch(`${baseUrl}/qa/preview.html`)).status === 200, "server must survive an oversized POST");

  const evil = { host: "evil.example" };
  check((await rawGet(port, "/__qa/submissions", evil)) === 403, "foreign Host must get 403 on submissions");
  check((await rawPost(port, "/wp-admin/admin-ajax.php", evil, "x")) === 403, "foreign Host must get 403 on the endpoint");
  check((await rawGet(port, "/__qa/submissions", { host: `localhost:${port}` })) === 200, "localhost Host must be accepted");

  const out = inlineScript("a</SCRIPT>b</Script >c<!--d");
  check(!/<\/script/i.test(out) && !out.includes("<!--"), `inlineScript left a closing tag or comment: ${out}`);

  const success = JSON.parse(readFileSync(new URL("./qa-success.json", import.meta.url), "utf8"));
  check(success.data.data.redirect_url.startsWith("http://127.0.0.1/"), "mock fixture must not redirect to production");
}

buildKit();
const { server, submissions, port } = await startServer(0);
const baseUrl = `http://127.0.0.1:${port}`;
let failed = false;
try {
  await runServerChecks(baseUrl, port, submissions);
  console.log("ok   server");
} catch (error) {
  failed = true;
  console.error(`FAIL server: ${error.message}`);
}
for (const [name, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  try {
    await runEngine(engine, baseUrl, submissions);
    console.log(`ok   ${name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
server.close();
process.exit(failed ? 1 : 0);
