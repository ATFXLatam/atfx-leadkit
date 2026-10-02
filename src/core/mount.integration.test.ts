import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { leadDefinition } from "../forms/lead/config";
import { interestDefinition } from "../forms/interest/config";
import { resolveDict } from "../i18n/index";
import type { Lang } from "../i18n/types";
import type { SubmitResult } from "./submit";

vi.mock("./submit", () => ({ submitLead: vi.fn() }));

import { observe } from "./mount";
import { submitLead } from "./submit";

const submit = vi.mocked(submitLead);
let stop: (() => void) | undefined;
const extraStops: Array<() => void> = [];

function mountHost(attrs: Readonly<Record<string, string>> = {}, key = "lead"): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("data-atfx-leadkit", key);
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  document.body.append(element);
  stop = observe(key === "lead" ? leadDefinition : interestDefinition);
  return element;
}

function control(form: HTMLFormElement, field: string): HTMLInputElement | HTMLSelectElement {
  const found = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-atfx-field="${field}"]`);
  if (found === null) throw new Error(`missing ${field}`);
  return found;
}

function fill(form: HTMLFormElement, choice = "Principiante"): void {
  control(form, "firstName").value = "Ana";
  control(form, "lastName").value = "Lopez";
  control(form, "email").value = "ana@example.com";
  control(form, "diallingCode").value = "52";
  control(form, "phone").value = "5512345678";
  control(form, "country").value = "MEX";
  control(form, "choice").value = choice;
  (control(form, "accepted") as HTMLInputElement).checked = true;
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

function resolveWith(result: SubmitResult): void {
  submit.mockResolvedValue(result);
}

function statusOf(element: HTMLElement): HTMLElement {
  const status = element.querySelector<HTMLElement>('[role="status"]');
  if (status === null) throw new Error("no status region");
  return status;
}

beforeEach(() => {
  submit.mockReset();
  vi.stubGlobal("__LEADKIT_VERSION__", "0.0.0-test");
});

afterEach(() => {
  stop?.();
  stop = undefined;
  for (const disconnect of extraStops.splice(0)) disconnect();
  delete window.atfxLeadkit;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("render + controller", () => {
  it("fills, submits through the mock and shows thank-you in the status region, hiding the form", async () => {
    resolveWith({ kind: "ok", aanumber: "AA-1" });
    const element = mountHost();
    const form = element.querySelector("form") as HTMLFormElement;
    const status = statusOf(element);
    fill(form);
    form.requestSubmit();
    await settle();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(statusOf(element)).toBe(status);
    expect(status.textContent).toContain(resolveDict("es").thankYou.title);
    expect(form.hidden).toBe(true);
    expect(form.getAttribute("aria-busy")).toBe("false");
  });

  it("an invalid submit shows field errors, focuses the first one and does not call submit", async () => {
    const element = mountHost();
    const form = element.querySelector("form") as HTMLFormElement;
    form.requestSubmit();
    await settle();
    expect(submit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(control(form, "firstName"));
    expect(form.querySelector('[data-atfx-field-error="firstName"]')?.textContent).toBe(
      resolveDict("es").validation.firstName,
    );
  });

  it("rejected leaves the form connected and visible, and a new submit reaches the mock", async () => {
    resolveWith({ kind: "rejected", fieldErrors: {} });
    const element = mountHost();
    const form = element.querySelector("form") as HTMLFormElement;
    fill(form);
    form.requestSubmit();
    await settle();
    expect(statusOf(element).textContent).toBe(resolveDict("es").errors.rejected);
    expect(form.isConnected).toBe(true);
    expect(form.hidden).toBe(false);
    form.requestSubmit();
    await settle();
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("unknown leaves the form connected and the retry button triggers a new submit", async () => {
    resolveWith({ kind: "unknown", reason: "timeout" });
    const element = mountHost();
    const form = element.querySelector("form") as HTMLFormElement;
    fill(form);
    form.requestSubmit();
    await settle();
    expect(form.isConnected).toBe(true);
    const retry = statusOf(element).querySelector("button");
    expect(retry?.textContent).toBe("Intentar de nuevo");
    resolveWith({ kind: "ok" });
    retry?.click();
    await settle();
    expect(submit).toHaveBeenCalledTimes(2);
    expect(statusOf(element).textContent).toContain(resolveDict("es").thankYou.title);
  });

  it.each([
    ["es", "Intentar de nuevo"],
    ["en", "Try again"],
    ["pt", "Tentar novamente"],
  ] as const)("the retry label comes from the %s dictionary", async (lang: Lang, label) => {
    resolveWith({ kind: "unknown", reason: "network" });
    const element = mountHost({ "data-lang": lang });
    const form = element.querySelector("form") as HTMLFormElement;
    fill(form);
    form.requestSubmit();
    await settle();
    expect(resolveDict(lang).errors.retry).toBe(label);
    expect(statusOf(element).querySelector("button")?.textContent).toBe(label);
  });

  it("the interest form submits with its own choice", async () => {
    resolveWith({ kind: "ok" });
    const element = mountHost({}, "interest");
    const form = element.querySelector("form") as HTMLFormElement;
    fill(form, "Abrir cuenta");
    form.requestSubmit();
    await settle();
    expect(submit).toHaveBeenCalledTimes(1);
  });
});

describe("duplicate script", () => {
  // vi.mock keeps one ./submit mock across resetModules, so the top-level mock counts both copies.
  async function secondCopy(): Promise<void> {
    vi.resetModules();
    const copy = await import("./mount");
    extraStops.push(copy.observe(leadDefinition));
  }

  it("a submit calls submitLead exactly once after two evaluations with an early container", async () => {
    resolveWith({ kind: "ok" });
    const element = mountHost();
    const form = element.querySelector("form") as HTMLFormElement;
    await secondCopy();
    // Same node: a remount would detach the form the user is holding.
    expect(element.querySelector("form")).toBe(form);
    fill(form);
    form.requestSubmit();
    await settle();
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("a submit calls submitLead exactly once after two evaluations with a late container", async () => {
    resolveWith({ kind: "ok" });
    stop = observe(leadDefinition);
    await secondCopy();
    const element = document.createElement("div");
    element.setAttribute("data-atfx-leadkit", "lead");
    const render = vi.spyOn(element, "replaceChildren");
    document.body.append(element);
    await settle();
    expect(render).toHaveBeenCalledTimes(1);
    const forms = element.querySelectorAll("form");
    expect(forms).toHaveLength(1);
    const form = forms[0] as HTMLFormElement;
    fill(form);
    form.requestSubmit();
    await settle();
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
