import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import type { Lang, MountAttrs } from "../contract/types";
import { PHONE_PATTERN } from "../forms/shared-fields";
import { resolveDict } from "../i18n";
import { choiceLabel } from "./fields";
import { renderForm, readValues, showFieldErrors, type RenderInput } from "./render";

const FIELDS = ["firstName", "lastName", "email", "diallingCode", "phone", "country", "choice", "accepted"] as const;
const LANGS: readonly Lang[] = ["es", "en", "pt"];

afterEach(() => {
  document.body.innerHTML = "";
});

function attrs(overrides: Partial<MountAttrs> = {}): MountAttrs {
  return {
    form: "lead",
    lang: "es",
    theme: "light",
    zoomLink: null,
    webinarTopic: null,
    webinarDate: null,
    webinarTz: null,
    leadSource: null,
    bdmOwner: null,
    opensAt: null,
    closesAt: null,
    closedUrl: null,
    scheduleInvalid: false,
    country: null,
    ...overrides,
  };
}

function input(overrides: Partial<RenderInput> = {}): RenderInput {
  return { definition: { key: "lead" }, attrs: attrs(), dict: resolveDict("es"), instanceId: "one", ...overrides };
}

function field(form: HTMLFormElement, name: string): HTMLElement {
  return form.querySelector<HTMLElement>(`[data-atfx-field="${name}"]`)!;
}

function errorOf(form: HTMLFormElement, name: string): HTMLElement {
  return form.querySelector<HTMLElement>(`[data-atfx-field-error="${name}"]`)!;
}

describe("point 1: errors become visible", () => {
  test("every field error is unhidden with text, then hidden and empty after clearing", () => {
    const form = renderForm(input({ instanceId: "vis" }));
    document.body.append(form);
    showFieldErrors(form, Object.fromEntries(FIELDS.map((name) => [name, "x"])));
    for (const name of FIELDS) {
      expect(errorOf(form, name).hidden, name).toBe(false);
      expect(errorOf(form, name).textContent, name).toBe("x");
    }
    showFieldErrors(form, {});
    for (const name of FIELDS) {
      expect(errorOf(form, name).hidden, name).toBe(true);
      expect(errorOf(form, name).textContent, name).toBe("");
    }
  });

  test("css keeps [hidden] errors hidden even if the host sets display on paragraphs", () => {
    const css = readFileSync("src/styles/leadkit.css", "utf8");
    expect(css).toMatch(/\.atfx-leadkit__error\[hidden\]\s*\{\s*display:\s*none;/);
  });
});

describe("point 2: labels in both directions", () => {
  test("every non-honeypot control has exactly one label with the dictionary text", () => {
    for (const lang of LANGS) {
      const dict = resolveDict(lang);
      const form = renderForm(input({ attrs: attrs({ lang }), dict, instanceId: `lab-${lang}` }));
      const expected: Record<string, string> = {
        firstName: dict.labels.firstName,
        lastName: dict.labels.lastName,
        email: dict.labels.email,
        diallingCode: dict.labels.diallingCode,
        phone: dict.labels.phone,
        country: dict.labels.country,
        choice: choiceLabel(dict, "lead"),
        accepted: dict.acceptance,
      };
      const controls = Array.from(form.querySelectorAll<HTMLElement>("input, select")).filter(
        (el) => !el.closest(".atfx-leadkit__honeypot-container"),
      );
      expect(controls).toHaveLength(8);
      for (const control of controls) {
        const labels = form.querySelectorAll<HTMLLabelElement>(`label[for="${control.id}"]`);
        const name = control.dataset.atfxField!;
        expect(labels, name).toHaveLength(1);
        expect(labels[0]!.textContent, name).not.toBe("");
        expect(labels[0]!.textContent, name).toBe(expected[name]);
      }
    }
  });

  test("the consent label points to the checkbox", () => {
    const form = renderForm(input({ instanceId: "cons" }));
    const checkbox = field(form, "accepted") as HTMLInputElement;
    const label = form.querySelector<HTMLLabelElement>(`label[for="${checkbox.id}"]`)!;
    expect(checkbox.type).toBe("checkbox");
    expect(label.textContent).toBe(resolveDict("es").acceptance);
  });

  test("with two instances aria-describedby resolves inside the same form", () => {
    const a = renderForm(input({ instanceId: "a" }));
    const b = renderForm(input({ instanceId: "b" }));
    document.body.append(a, b);
    for (const form of [a, b]) {
      showFieldErrors(form, Object.fromEntries(FIELDS.map((name) => [name, "bad"])));
      for (const name of FIELDS) {
        const ids = field(form, name).getAttribute("aria-describedby")!.split(" ");
        for (const id of ids) {
          expect(form.querySelector(`#${id}`), `${name} ${id}`).toBe(document.getElementById(id));
          expect(form.querySelector(`#${id}`)).not.toBeNull();
        }
      }
    }
  });
});

describe("point 3: root form contract", () => {
  test.each(["dark", "light"] as const)("form root for theme %s", (theme) => {
    const form = renderForm(input({ attrs: attrs({ theme }) }));
    expect(form.tagName).toBe("FORM");
    expect(form.classList.contains("atfx-leadkit")).toBe(true);
    expect(form.noValidate).toBe(true);
    expect(form.dataset.theme).toBe(theme);
    expect(form.hasAttribute("action")).toBe(false);
    expect(form.hasAttribute("id")).toBe(false);
  });
});

describe("point 4: honeypot", () => {
  test("the input is inert for assistive tech, autofill and validation", () => {
    const form = renderForm(input({ instanceId: "hp" }));
    const hp = form.querySelector<HTMLInputElement>(".atfx-leadkit__honeypot")!;
    expect(hp.required).toBe(false);
    expect(hp.hasAttribute("id")).toBe(false);
    expect(hp.hasAttribute("data-atfx-field")).toBe(false);
    expect(form.querySelectorAll("label[for]").length).toBe(8);
  });

  test("name is unique per instance because it embeds the instance id", () => {
    const a = renderForm(input({ instanceId: "a" })).querySelector<HTMLInputElement>(".atfx-leadkit__honeypot")!;
    const b = renderForm(input({ instanceId: "b" })).querySelector<HTMLInputElement>(".atfx-leadkit__honeypot")!;
    expect(a.name).toBe("atfx_hp_a");
    expect(b.name).not.toBe(a.name);
  });

  test("a human submit leaves the honeypot empty in readValues", () => {
    const form = renderForm(input({ instanceId: "human" }));
    expect(readValues(form, "human").honeypot).toBe("");
  });

  test("css hides the container with position absolute and clip, and the input off screen", () => {
    const css = readFileSync("src/styles/leadkit.css", "utf8");
    const rules = parseRuleLists(css);
    const container = rules.find((r) => r.selectors.includes(".atfx-leadkit .atfx-leadkit__honeypot-container"))!;
    const hpInput = rules.find((r) => r.selectors.includes(".atfx-leadkit .atfx-leadkit__honeypot"))!;
    expect(container.body).toContain("position: absolute");
    expect(container.body).toMatch(/clip: rect\(0 0 0 0\)/);
    expect(hpInput.body).toContain("left: -9999px");
  });
});

interface RuleList {
  readonly selectors: readonly string[];
  readonly body: string;
}

function parseRuleLists(css: string): RuleList[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  const out: RuleList[] = [];
  const pattern = /([^{}@][^{}]*)\{([^{}]*)\}/g;
  for (let m = pattern.exec(clean); m; m = pattern.exec(clean)) {
    out.push({ selectors: (m[1] ?? "").split(",").map((s) => s.trim()), body: m[2] ?? "" });
  }
  return out;
}

describe("point 5: iOS 15 css safety", () => {
  const css = readFileSync("src/styles/leadkit.css", "utf8");

  test("no selector list mixes :focus-visible with a bare :focus", () => {
    const lists = parseRuleLists(css).filter((r) => r.selectors.some((s) => s.includes(":focus-visible")));
    for (const list of lists) {
      // :not(:focus-visible) is a separate compound; only a bare :focus sibling would be dropped with the list.
      const bare = list.selectors.filter((s) => /:focus(?![-\w])/.test(s.replace(/:not\([^)]*\)/g, "")));
      expect(bare, list.selectors.join(", ")).toEqual([]);
    }
  });

  test("a plain :focus rule keeps the outline on browsers without :focus-visible", () => {
    expect(parseRuleLists(css).some((r) => r.selectors.some((s) => /:focus$/.test(s)))).toBe(true);
  });

  test.each([
    "@layer",
    ":has(",
    ":is(",
    ":where(",
    "inset:",
    "aspect-ratio",
    "dvh",
    "color-mix",
    "@container",
    "accent-color",
  ])("does not use %s", (token) => {
    expect(css).not.toContain(token);
  });

  test("does not use css nesting", () => {
    expect(css).not.toContain("&");
    const withoutKeyframes = css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
    const withoutMedia = withoutKeyframes.replace(/@media[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
    expect(withoutMedia).not.toMatch(/\{[^{}]*\{/);
  });
});

describe("point 7: input types", () => {
  test("email and phone use native types and keyboards; choice is not autofilled", () => {
    const form = renderForm(input());
    const email = field(form, "email") as HTMLInputElement;
    const phone = field(form, "phone") as HTMLInputElement;
    expect(email.type).toBe("email");
    expect(email.inputMode).toBe("email");
    expect(phone.type).toBe("tel");
    expect(phone.inputMode).toBe("tel");
    expect(field(form, "choice").getAttribute("autocomplete")).toBe("off");
  });

  test("PHONE_PATTERN compiles with the v flag that browsers use for the pattern attribute", () => {
    const regex = new RegExp(`^(?:${PHONE_PATTERN})$`, "v");
    expect(regex.test("3001234567")).toBe(true);
    expect(regex.test("abc")).toBe(false);
    expect(regex.test("12345")).toBe(false);
  });
});

describe("point 8: PENDIENTE_LEGAL on the privacy link", () => {
  test.each(LANGS)("link text for %s", (lang) => {
    const form = renderForm(input({ attrs: attrs({ lang }), dict: resolveDict(lang) }));
    expect(form.querySelector('a[data-atfx-consent-privacy="true"]')!.textContent).toContain("PENDIENTE_LEGAL");
  });
});

describe("point 9: aria-describedby keeps pre-existing tokens", () => {
  test("hint stays while the error is shown and after it is cleared", () => {
    const form = renderForm(input({ instanceId: "hint" }));
    const email = field(form, "email");
    email.setAttribute("aria-describedby", "hint-1");
    showFieldErrors(form, { email: "bad" });
    expect(email.getAttribute("aria-describedby")).toBe(`hint-1 ${errorOf(form, "email").id}`);
    showFieldErrors(form, {});
    expect(email.getAttribute("aria-describedby")).toBe("hint-1");
  });

  test("a hand-built form without error elements does not throw", () => {
    const form = document.createElement("form");
    form.innerHTML = '<input data-atfx-field="email" aria-describedby="x">';
    expect(() => showFieldErrors(form, { email: "bad" })).not.toThrow();
    expect(form.querySelector("input")!.getAttribute("aria-describedby")).toBe("x");
  });
});

const PRIVACY_PDF =
  "https://www.atfx.com/wp-content/uploads/2024/04/AT-Global-Markets-MU_EN_Privacy-and-Internal-Privacy-Controls-Policy.pdf";

describe("round 3: real privacy url", () => {
  test.each(LANGS)("the %s link points exactly at the delivered PDF", (lang) => {
    const form = renderForm(input({ attrs: attrs({ lang }), dict: resolveDict(lang) }));
    const link = form.querySelector('a[data-atfx-consent-privacy="true"]')!;
    expect(link.getAttribute("href")).toBe(PRIVACY_PDF);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  test("the node:fs shim is gone, real node types are used", () => {
    expect(readFileSync("src/styles/css.d.ts", "utf8")).not.toContain("node:fs");
  });
});

function channel(hex: string, index: number): number {
  const c = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe("point 12: control border contrast (WCAG 1.4.11)", () => {
  const css = readFileSync("src/styles/leadkit.css", "utf8");
  const rules = parseRuleLists(css);

  function tokens(selector: string): Record<string, string> {
    const rule = rules.find((r) => r.selectors.includes(selector))!;
    return Object.fromEntries(Array.from(rule.body.matchAll(/(--atfx-[\w-]+):\s*(#[0-9a-f]{6})/gi), (m) => [m[1]!, m[2]!]));
  }

  test("border is at least 3:1 against both the form and the control background", () => {
    const light = tokens(".atfx-leadkit");
    const dark = { ...light, ...tokens('.atfx-leadkit[data-theme="dark"]') };
    for (const theme of [light, dark]) {
      expect(contrast(theme["--atfx-border"]!, theme["--atfx-bg"]!)).toBeGreaterThanOrEqual(3);
      expect(contrast(theme["--atfx-border"]!, theme["--atfx-input-bg"]!)).toBeGreaterThanOrEqual(3);
    }
  });
});

function mixedFocusLists(css: string): string[][] {
  return parseRuleLists(css)
    .filter((r) => r.selectors.some((s) => s.includes(":focus-visible")))
    // :not(:focus-visible) is a separate compound; only a bare :focus sibling would be dropped with the list.
    .filter((r) => r.selectors.some((s) => /:focus(?![-\w])/.test(s.replace(/:not\([^)]*\)/g, ""))))
    .map((r) => [...r.selectors]);
}

function focusRuleViolations(css: string): string[] {
  const out: string[] = [];
  for (const rule of parseRuleLists(css).filter((r) => r.selectors.some((s) => s.includes(":focus")))) {
    const label = rule.selectors.join(", ");
    const outline = /(?:^|[\s;])outline:\s*([^;]+)/.exec(rule.body)?.[1]?.trim() ?? "";
    const width = /(\d+(?:\.\d+)?)px/.exec(outline);
    if (!width || Number(width[1]) < 2) out.push(`${label}: outline width < 2px`);
    if (/\b(none|hidden)\b/.test(outline) || /(^|\s)0(px)?(\s|$)/.test(outline) || !/\b(solid|dashed|dotted|double)\b/.test(outline)) {
      out.push(`${label}: outline style`);
    }
    if (!outline.includes("var(--atfx-focus)")) out.push(`${label}: outline color`);
    const offset = /outline-offset:\s*(-?\d+(?:\.\d+)?)/.exec(rule.body)?.[1];
    if (offset !== undefined && Number(offset) < 0) out.push(`${label}: negative outline-offset`);
  }
  return out;
}

describe("round 4: focus indicator", () => {
  const css = readFileSync("src/styles/leadkit.css", "utf8");
  const rules = parseRuleLists(css);

  test("every :focus rule draws a visible var(--atfx-focus) outline", () => {
    expect(rules.flatMap((r) => r.selectors).filter((s) => s.includes(":focus")).length).toBeGreaterThanOrEqual(4);
    expect(focusRuleViolations(css)).toEqual([]);
  });

  test.each([
    ["outline none", ".atfx-leadkit input:focus { outline: none; }"],
    ["outline 0", ".atfx-leadkit input:focus { outline: 0; }"],
    ["thin width", ".atfx-leadkit input:focus { outline: 1px solid var(--atfx-focus); }"],
    ["wrong color", ".atfx-leadkit input:focus { outline: 3px solid red; }"],
    ["negative offset", ".atfx-leadkit input:focus { outline: 3px solid var(--atfx-focus); outline-offset: -2px; }"],
    ["no outline at all", ".atfx-leadkit input:focus { color: red; }"],
  ])("the checker detects a regression: %s", (_name, bad) => {
    expect(focusRuleViolations(bad).length).toBeGreaterThan(0);
  });

  test("the checker accepts a compliant rule", () => {
    expect(focusRuleViolations(".atfx-leadkit input:focus { outline: 2px solid var(--atfx-focus); outline-offset: 0; }")).toEqual([]);
  });

  test("the consent checkbox has its own focus rule beating (0,4,1)", () => {
    const rule = rules.find((r) => r.selectors.some((s) => s.includes("input.atfx-leadkit__checkbox") && s.includes(":focus")));
    expect(rule).toBeDefined();
    const sel = rule!.selectors[0]!;
    const classes = (sel.match(/\.[\w-]+|\[[^\]]+\]|:(?!not)[\w-]+/g) ?? []).length;
    expect(classes).toBeGreaterThanOrEqual(5);
    expect(rule!.body).toContain("var(--atfx-focus)");
  });

  test("--atfx-focus has at least 3:1 against bg and input-bg in light and dark", () => {
    const tok = (selector: string): Record<string, string> => {
      const rule = rules.find((r) => r.selectors.includes(selector))!;
      return Object.fromEntries(Array.from(rule.body.matchAll(/(--atfx-[\w-]+):\s*(#[0-9a-f]{6})/gi), (m) => [m[1]!, m[2]!]));
    };
    const light = tok(".atfx-leadkit");
    const dark = { ...light, ...tok('.atfx-leadkit[data-theme="dark"]') };
    for (const theme of [light, dark]) {
      expect(contrast(theme["--atfx-focus"]!, theme["--atfx-bg"]!)).toBeGreaterThanOrEqual(3);
      expect(contrast(theme["--atfx-focus"]!, theme["--atfx-input-bg"]!)).toBeGreaterThanOrEqual(3);
    }
  });

  test("the :focus-visible mixing check detects a mixed list and ignores a :not(:focus-visible) sibling", () => {
    expect(mixedFocusLists(".atfx-leadkit input:focus, .atfx-leadkit input:focus-visible { outline: 3px solid red; }")).toHaveLength(1);
    expect(mixedFocusLists(".atfx-leadkit input:hover:not(:focus-visible), .atfx-leadkit input:focus-visible { outline: 0; }")).toHaveLength(0);
    expect(mixedFocusLists(css)).toEqual([]);
  });
});
