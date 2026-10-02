import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import type { MountAttrs } from "../contract/types";
import { resolveDict } from "../i18n";
import { PHONE_PATTERN } from "../forms/shared-fields";
import { renderForm, readValues, setBusy, showFieldErrors, type RenderInput } from "./render";
import { injectStylesOnce } from "../styles/styles";

const PRIVACY_BY_LANG = {
  es: "https://www.atfx.com/wp-content/uploads/2024/04/AT-Global-Markets-MU_EN_Privacy-and-Internal-Privacy-Controls-Policy.pdf",
  en: "https://www.atfx.com/wp-content/uploads/2024/04/AT-Global-Markets-MU_EN_Privacy-and-Internal-Privacy-Controls-Policy.pdf",
  pt: "https://www.atfx.com/wp-content/uploads/2024/04/AT-Global-Markets-MU_EN_Privacy-and-Internal-Privacy-Controls-Policy.pdf",
} as const;

afterEach(() => {
  document.body.innerHTML = "";
});

function createAttrs(overrides: Partial<MountAttrs> = {}): MountAttrs {
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

function createRenderInput(overrides: Partial<RenderInput> = {}): RenderInput {
  return {
    definition: { key: "lead" },
    attrs: createAttrs(),
    dict: resolveDict("es"),
    instanceId: "one",
    ...overrides,
  };
}

describe("renderForm", () => {
  test("creates two forms without duplicate ids and labels stay in scope", () => {
    const formA = renderForm(createRenderInput({ instanceId: "a1" }));
    const formB = renderForm(createRenderInput({ instanceId: "b2" }));
    document.body.append(formA, formB);

    const ids = Array.from(document.querySelectorAll("[id]"), (element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const form of [formA, formB]) {
      const labels = form.querySelectorAll<HTMLLabelElement>("label[for]");
      for (const label of labels) {
        const targetId = label.getAttribute("for");
        expect(targetId).toBeTruthy();
        const targetInForm = targetId ? form.querySelector<HTMLElement>(`#${targetId}`) : null;
        expect(targetInForm).toBeTruthy();
      }
    }
  });

  test("sets autocomplete attributes and phone pattern", () => {
    const form = renderForm(createRenderInput());

    expect(form.querySelector<HTMLInputElement>('input[name="firstName"]')?.getAttribute("autocomplete")).toBe(
      "given-name",
    );
    expect(form.querySelector<HTMLInputElement>('input[name="lastName"]')?.getAttribute("autocomplete")).toBe(
      "family-name",
    );
    expect(form.querySelector<HTMLInputElement>('input[name="email"]')?.getAttribute("autocomplete")).toBe("email");
    expect(form.querySelector<HTMLInputElement>('input[name="phone"]')?.getAttribute("autocomplete")).toBe(
      "tel-national",
    );
    expect(form.querySelector<HTMLInputElement>('input[name="phone"]')?.pattern).toBe(PHONE_PATTERN);
    expect(form.querySelector<HTMLSelectElement>('select[name="country"]')?.getAttribute("autocomplete")).toBe(
      "country",
    );
    expect(form.querySelector<HTMLSelectElement>('select[name="diallingCode"]')?.getAttribute("autocomplete")).toBe(
      "tel-country-code",
    );
  });

  test("preselects country and dialling code from attrs.country", () => {
    const form = renderForm(
      createRenderInput({
        attrs: createAttrs({ country: "CO" }),
      }),
    );
    const country = form.querySelector<HTMLSelectElement>('select[name="country"]');
    const diallingCode = form.querySelector<HTMLSelectElement>('select[name="diallingCode"]');

    expect(country?.value).toBe("COL");
    expect(diallingCode?.value).toBe("57");
  });

  test("renders one unchecked required consent checkbox in every language", () => {
    for (const lang of ["es", "en", "pt"] as const) {
      const form = renderForm(
        createRenderInput({
          attrs: createAttrs({ lang }),
          dict: resolveDict(lang),
          instanceId: `consent-${lang}`,
        }),
      );
      const checks = form.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="accepted"]');
      expect(checks).toHaveLength(1);
      expect(checks[0]?.checked).toBe(false);
      expect(checks[0]?.required).toBe(true);
    }
  });

  test("renders privacy link outside consent label by language", () => {
    for (const lang of ["es", "en", "pt"] as const) {
      const form = renderForm(
        createRenderInput({
          attrs: createAttrs({ lang }),
          dict: resolveDict(lang),
          instanceId: `privacy-${lang}`,
        }),
      );
      const label = form.querySelector<HTMLLabelElement>('label[for^="atfx-accepted-"]');
      const link = form.querySelector<HTMLAnchorElement>('a[data-atfx-consent-privacy="true"]');

      expect(link?.getAttribute("href")).toBe(PRIVACY_BY_LANG[lang]);
      expect(label?.contains(link ?? null)).toBe(false);
    }
  });
});

describe("showFieldErrors", () => {
  test("renders server errors as text and sets aria attributes", () => {
    const form = renderForm(createRenderInput({ instanceId: "errors-1" }));
    showFieldErrors(form, {
      email: '<img src=x onerror=alert(1)>',
      accepted: "PENDIENTE_LEGAL: Debes autorizar el contacto.",
    });

    const emailError = form.querySelector<HTMLElement>('[data-atfx-field-error="email"]');
    const emailInput = form.querySelector<HTMLElement>('[data-atfx-field="email"]');

    expect(emailError?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(emailError?.querySelector("img")).toBeNull();
    expect(emailInput?.getAttribute("aria-invalid")).toBe("true");
    expect(emailInput?.getAttribute("aria-describedby")).toContain(emailError?.id ?? "");
  });
});

describe("showFieldErrors injection", () => {
  test("paints every field message as text and never creates an element", () => {
    const form = renderForm(createRenderInput({ instanceId: "xss-all" }));
    document.body.append(form);
    const payload = "<img src=x onerror=alert(1)>";
    const messages = Object.fromEntries(
      ["firstName", "lastName", "email", "diallingCode", "phone", "country", "choice", "accepted"].map((name) => [name, payload]),
    );

    showFieldErrors(form, messages);

    expect(document.querySelectorAll("img")).toHaveLength(0);
    const errors = form.querySelectorAll<HTMLElement>("[data-atfx-field-error]");
    expect(errors).toHaveLength(8);
    for (const error of errors) {
      expect(error.textContent).toBe(payload);
      expect(error.children).toHaveLength(0);
    }
  });
});

describe("readValues and busy state", () => {
  test("returns submitted values including honeypot", () => {
    const form = renderForm(createRenderInput({ instanceId: "read-1" }));
    document.body.append(form);

    const get = <T extends HTMLElement>(selector: string) => form.querySelector<T>(selector);
    get<HTMLInputElement>('input[name="firstName"]')!.value = "Ana";
    get<HTMLInputElement>('input[name="lastName"]')!.value = "Diaz";
    get<HTMLInputElement>('input[name="email"]')!.value = "ana@example.com";
    get<HTMLSelectElement>('select[name="diallingCode"]')!.value = "57";
    get<HTMLInputElement>('input[name="phone"]')!.value = "3001234567";
    get<HTMLSelectElement>('select[name="country"]')!.value = "COL";
    get<HTMLSelectElement>('select[name="choice"]')!.value = "Principiante";
    get<HTMLInputElement>('input[name="accepted"]')!.checked = true;
    const honeypot = get<HTMLInputElement>('input[name="atfx_hp_read-1"]');
    const honeypotContainer = form.querySelector<HTMLElement>(".atfx-leadkit__honeypot-container");
    expect(honeypot?.tabIndex).toBe(-1);
    expect(honeypot?.getAttribute("autocomplete")).toBe("off");
    expect(honeypotContainer?.getAttribute("aria-hidden")).toBe("true");
    honeypot!.value = "bot";

    const values = readValues(form, "read-1");
    expect(values).toMatchObject({
      firstName: "Ana",
      lastName: "Diaz",
      email: "ana@example.com",
      diallingCode: "57",
      phone: "3001234567",
      country: "COL",
      choice: "Principiante",
      accepted: true,
      honeypot: "bot",
    });
  });

  test("setBusy toggles submit disabled and aria-busy", () => {
    const form = renderForm(createRenderInput({ instanceId: "busy-1" }));
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(button?.disabled).toBe(false);

    setBusy(form, true);
    expect(form.getAttribute("aria-busy")).toBe("true");
    expect(button?.disabled).toBe(true);

    setBusy(form, false);
    expect(form.getAttribute("aria-busy")).toBe("false");
    expect(button?.disabled).toBe(false);
  });
});

describe("styles", () => {
  test("injectStylesOnce injects a single style tag per document", () => {
    injectStylesOnce(".atfx-leadkit{color:red;}");
    injectStylesOnce(".atfx-leadkit{color:blue;}");

    const styleTags = document.querySelectorAll('style[data-atfx-leadkit-style="true"]');
    expect(styleTags).toHaveLength(1);
    expect(styleTags[0]?.textContent).toContain("color:red");
  });
})

type Specificity = readonly [number, number, number];

interface CssRule {
  readonly selector: string;
  readonly body: string;
}

function readCssRules(css: string): CssRule[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutKeyframes = withoutComments.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  const rules: CssRule[] = [];
  const pattern = /([^{}@][^{}]*)\{([^{}]*)\}/g;
  for (let match = pattern.exec(withoutKeyframes); match; match = pattern.exec(withoutKeyframes)) {
    const selectorList = (match[1] ?? "").trim();
    for (const selector of selectorList.split(",")) {
      rules.push({ selector: selector.trim(), body: match[2] ?? "" });
    }
  }
  return rules;
}

function specificity(selector: string): Specificity {
  const stripped = selector.replace(/:not\(([^)]*)\)/g, " $1 ");
  const ids = (stripped.match(/#[\w-]+/g) ?? []).length;
  const attrs = (stripped.match(/\[[^\]]*\]/g) ?? []).length;
  const classes = (stripped.replace(/\[[^\]]*\]/g, "").match(/\.[\w-]+/g) ?? []).length;
  const pseudoClasses = (stripped.match(/(?<!:):[\w-]+/g) ?? []).length;
  const types = (stripped.replace(/\[[^\]]*\]/g, "").match(/(?:^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
  return [ids, classes + attrs + pseudoClasses, types];
}

function isAbove(actual: Specificity, floor: Specificity): boolean {
  for (let i = 0; i < 3; i += 1) {
    if (actual[i]! !== floor[i]!) {
      return actual[i]! > floor[i]!;
    }
  }
  return false;
}

describe("leadkit.css", () => {
  const css = readFileSync("src/styles/leadkit.css", "utf8");
  const rules = readCssRules(css);
  const controlRules = rules.filter((rule) => /\b(input|select|button)\.atfx-leadkit__(control|checkbox|submit)/.test(rule.selector));

  test("has no :root, @layer, :focus-visible-only dependency or accent-color", () => {
    expect(css).not.toContain(":root");
    expect(css).not.toContain("@layer");
    expect(css).not.toContain("accent-color");
    expect(css).not.toContain("inert");
    expect(css).toContain("[data-atfx-leadkit]");
  });

  test("grid items declare min-width: 0 so controls cannot blow out the form column", () => {
    const hasMinWidth = (pattern: RegExp) =>
      rules.some((rule) => pattern.test(rule.selector) && /min-width:\s*0\s*(;|$)/.test(rule.body));
    expect(hasMinWidth(/__field$/)).toBe(true);
    expect(hasMinWidth(/input\.atfx-leadkit__control$/)).toBe(true);
    expect(hasMinWidth(/select\.atfx-leadkit__control$/)).toBe(true);
    expect(hasMinWidth(/__consent-row$/) || /grid-template-columns:\s*24px minmax\(0,\s*1fr\)/.test(css)).toBe(true);
  });

  test("the root keeps border-box: it is not part of the box-sizing: inherit rule", () => {
    const inheritRules = rules.filter((rule) => /box-sizing:\s*inherit/.test(rule.body));
    expect(inheritRules.length).toBeGreaterThan(0);
    for (const rule of inheritRules) expect(rule.selector).not.toBe(".atfx-leadkit");
    expect(css).toMatch(/\.atfx-leadkit \{[^}]*box-sizing:\s*border-box/);
  });

  test("every selector starts at the widget root", () => {
    expect(rules.length).toBeGreaterThan(10);
    for (const rule of rules) {
      expect(rule.selector, rule.selector).toMatch(/^(\.atfx-leadkit|\[data-atfx-leadkit\])(?![\w-])/);
    }
  });

  test("control rules beat the Elementor kit selector (0,3,1)", () => {
    const plain = controlRules.filter((rule) => !rule.selector.includes(":focus"));
    expect(plain.length).toBeGreaterThanOrEqual(3);
    for (const rule of plain) {
      expect(isAbove(specificity(rule.selector), [0, 3, 1]), rule.selector).toBe(true);
    }
  });

  test("focus rules beat the kit focus selector (0,4,1)", () => {
    const focus = controlRules.filter((rule) => rule.selector.includes(":focus"));
    expect(focus.length).toBeGreaterThanOrEqual(4);
    for (const rule of focus) {
      expect(isAbove(specificity(rule.selector), [0, 4, 1]), rule.selector).toBe(true);
    }
  });

  test("pairs -webkit-appearance with appearance in every rule that sets appearance", () => {
    const withAppearance = rules.filter((rule) => /(^|[\s;])appearance:/.test(rule.body));
    expect(withAppearance.length).toBeGreaterThan(0);
    for (const rule of withAppearance) {
      expect(rule.body, rule.selector).toContain("-webkit-appearance:");
    }
  });

  test("uses !important only for the honeypot", () => {
    for (const rule of rules) {
      if (rule.body.includes("!important")) {
        expect(rule.selector, rule.selector).toContain("honeypot");
      }
    }
    const honeypot = rules.filter((rule) => rule.selector.includes("honeypot")).map((rule) => rule.body).join(";");
    expect(honeypot).toContain("clip");
    expect(honeypot).not.toContain("display: none");
    expect(honeypot).not.toContain("display:none");
  });

  test("checkbox target is at least 24x24 CSS px", () => {
    const checkbox = rules.filter((rule) => rule.selector.includes("__checkbox")).map((rule) => rule.body).join(";");
    expect(checkbox).toMatch(/width:\s*(2[4-9]|[3-9]\d)px/);
    expect(checkbox).toMatch(/height:\s*(2[4-9]|[3-9]\d)px/);
  });

  test("defines tokens on the root and dark theme, and drops the entry animation for reduced motion", () => {
    expect(rules.some((rule) => rule.selector === ".atfx-leadkit" && rule.body.includes("--atfx-bg:"))).toBe(true);
    expect(rules.some((rule) => rule.selector === '.atfx-leadkit[data-theme="dark"]' && rule.body.includes("--atfx-bg:"))).toBe(true);
    expect(css).toContain("@keyframes atfx-leadkit-enter");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.atfx-leadkit\s*\{\s*animation: none;/);
  });
});

describe("provisional consent copy and safety", () => {
  test("every language marks the consent texts PENDIENTE_LEGAL and drops the marketing and terms wording", () => {
    for (const lang of ["es", "en", "pt"] as const) {
      const dict = resolveDict(lang);
      expect(dict.acceptance).toContain("PENDIENTE_LEGAL");
      expect(dict.validation.acceptance).toContain("PENDIENTE_LEGAL");
      expect(dict.acceptance).not.toMatch(/productos|products|produtos/i);
      expect(dict.validation.acceptance).not.toMatch(/t[eé]rminos|terms|termos/i);
    }
  });

  test("renders the provisional privacy link marked PENDIENTE_LEGAL", () => {
    const form = renderForm(createRenderInput({ instanceId: "legal-1" }));
    expect(form.querySelector('a[data-atfx-consent-privacy="true"]')?.textContent).toContain("PENDIENTE_LEGAL");
  });

  test("leaves the dialling placeholder selected when the country has no prefix", () => {
    const form = renderForm(createRenderInput({ attrs: createAttrs({ country: "ZZ" }), instanceId: "zz" }));
    expect(form.querySelector<HTMLSelectElement>('select[name="diallingCode"]')?.value).toBe("");
    expect(form.querySelector<HTMLSelectElement>('select[name="country"]')?.value).toBe("");
  });

  test("clears previous errors when showFieldErrors runs again", () => {
    const form = renderForm(createRenderInput({ instanceId: "again" }));
    showFieldErrors(form, { email: "bad" });
    showFieldErrors(form, {});
    const email = form.querySelector<HTMLElement>('[data-atfx-field="email"]');
    expect(email?.hasAttribute("aria-invalid")).toBe(false);
    expect(email?.hasAttribute("aria-describedby")).toBe(false);
    expect(form.querySelector<HTMLElement>('[data-atfx-field-error="email"]')?.hidden).toBe(true);
  });

  test("ignores unknown field names in showFieldErrors", () => {
    const form = renderForm(createRenderInput({ instanceId: "unk" }));
    expect(() => showFieldErrors(form, { nope: "x" })).not.toThrow();
  });

  test("src/ui never assigns innerHTML or outerHTML", () => {
    for (const file of ["src/ui/render.ts", "src/ui/fields.ts"]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
    }
  });

  test("PHONE_PATTERN compiles with the u flag used by Safari 15 and 16", () => {
    expect(() => new RegExp(`^(?:${PHONE_PATTERN})$`, "u")).not.toThrow();
  });

  test("injectStylesOnce ignores blank css", () => {
    document.head.querySelectorAll("style").forEach((node) => node.remove());
    injectStylesOnce("   ");
    expect(document.querySelectorAll("style")).toHaveLength(0);
  });
});
