import { afterEach, describe, expect, it, vi } from "vitest";
import type { MountAttrs } from "../contract/types";
import { resolveDict } from "../i18n/index";
import { createFormUi } from "./form-ui";
import { renderForm } from "./render";

const ZOOM = "https://atfx.zoom.us/webinar/register/WN_x";

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

function instance(instanceId: string, overrides: Partial<MountAttrs> = {}) {
  const dict = resolveDict("es");
  const mountAttrs = attrs(overrides);
  const form = renderForm({ definition: { key: "lead" }, attrs: mountAttrs, dict, instanceId });
  const status = document.createElement("div");
  status.setAttribute("role", "status");
  const host = document.createElement("div");
  host.append(form, status);
  document.body.append(host);
  return { form, status, host, ui: createFormUi({ form, status, instanceId, dict, attrs: mountAttrs }) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createFormUi", () => {
  it("focusFirstInvalid focuses the control of its own instance", () => {
    const a = instance("a");
    const b = instance("b");
    b.ui.focusFirstInvalid("email");
    expect(document.activeElement).toBe(b.form.querySelector('[data-atfx-field="email"]'));
    a.ui.focusFirstInvalid("email");
    expect(document.activeElement).toBe(a.form.querySelector('[data-atfx-field="email"]'));
  });

  it("readValues, setBusy and showFieldErrors act on the bound form", () => {
    const { form, ui } = instance("a");
    const firstName = form.querySelector<HTMLInputElement>('[data-atfx-field="firstName"]');
    if (firstName) firstName.value = "Ana";
    expect(ui.readValues().firstName).toBe("Ana");
    ui.setBusy(true);
    expect(form.getAttribute("aria-busy")).toBe("true");
    ui.showFieldErrors({ firstName: "mal" });
    expect(form.querySelector('[data-atfx-field-error="firstName"]')?.textContent).toBe("mal");
  });

  it("thank-you hides the form and paints only the status region, with the zoom link when asked", () => {
    const { form, status, host, ui } = instance("a", { zoomLink: ZOOM });
    ui.showState({ kind: "thank-you", zoomCta: true });
    expect(form.hidden).toBe(true);
    expect(form.style.display).toBe("none");
    expect(form.isConnected).toBe(true);
    expect(host.children).toHaveLength(2);
    expect(status.textContent).toContain(resolveDict("es").thankYou.title);
    expect(status.querySelector("a")?.getAttribute("href")).toBe(ZOOM);
  });

  it("thank-you without zoomCta has no link even if the attrs have one", () => {
    const { status, ui } = instance("a", { zoomLink: ZOOM });
    ui.showState({ kind: "thank-you", zoomCta: false });
    expect(status.querySelector("a")).toBeNull();
  });

  it("rejected keeps the form visible and connected", () => {
    const { form, status, ui } = instance("a");
    ui.showState({ kind: "rejected", message: "no" });
    expect(status.textContent).toBe("no");
    expect(form.hidden).toBe(false);
    expect(form.isConnected).toBe(true);
  });

  it("unknown keeps the form connected and the retry label comes from the dictionary", () => {
    const { form, status, ui } = instance("a");
    const onRetry = vi.fn();
    ui.showState({ kind: "unknown", message: "?", onRetry });
    const button = status.querySelector("button");
    expect(button?.textContent).toBe(resolveDict("es").errors.retry);
    button?.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(form.isConnected).toBe(true);
  });

  it("closed hides the form and shows the message", () => {
    const { form, status, ui } = instance("a");
    ui.showState({ kind: "closed", schedule: "expired", message: "fin" });
    expect(form.hidden).toBe(true);
    expect(status.textContent).toBe("fin");
  });
});
