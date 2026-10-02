import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPayload } from "../contract/payload";
import type { FormKey, LeadValues, MountAttrs, PageContext, PayloadEntries } from "../contract/types";
import { resolveDict } from "../i18n/index";
import type { Dict } from "../i18n/types";
import { renderRejected, renderThankYou, renderUnknownResult } from "../ui/states";
import { DEFAULT_INTEGRATIONS as ANALYTICS_HOOKS, runIntegrations as runAnalytics } from "./analytics";
import {
  DEFAULT_INTEGRATIONS,
  bindController,
  openAboutBlank,
  runIntegrations,
  type ControllerDeps,
  type FieldKey,
  type InstanceContext,
  type IntegrationHook,
  type ScheduleState,
  type UiState,
} from "./controller";
import type { SubmitResult } from "./submit";

const ZOOM = "https://atfx.zoom.us/webinar/register/WN_x";
const EVIL_REDIRECT = "https://evil.example/phish";
const SERVER_HTML = '<img src=x onerror=alert(1)>';
const PAGE: PageContext = { href: "https://landing.example/webinar", title: "Webinar LATAM" };
const NOW = 1_735_689_600_000;

const dict: Dict = resolveDict("es");

interface PopupState {
  opener: unknown;
  closed: boolean;
  href: string;
}

interface PopupDouble {
  readonly popup: Window;
  readonly close: ReturnType<typeof vi.fn>;
  readonly state: PopupState;
}

interface Harness {
  readonly form: HTMLFormElement;
  readonly host: HTMLElement;
  readonly ctx: InstanceContext;
  readonly deps: ControllerDeps;
  readonly log: string[];
  readonly states: UiState[];
  readonly busy: boolean[];
  readonly focused: FieldKey[];
  readonly fieldErrors: Array<Partial<Record<FieldKey, string>>>;
  readonly popup: PopupDouble;
  readonly submit: ReturnType<typeof vi.fn>;
  readonly submitted: PayloadEntries[];
  readonly openPopup: ReturnType<typeof vi.fn>;
  readonly schedule: ReturnType<typeof vi.fn>;
  setResult(result: SubmitResult): void;
  setPage(read: () => PageContext): void;
  setNow(read: () => number): void;
  setSubmit(impl: (entries: PayloadEntries) => Promise<SubmitResult>): void;
  setOpenPopup(impl: () => Window | null): void;
  setReadValues(read: () => Readonly<Record<string, unknown>>): void;
  setShowState(show: (state: UiState) => void): void;
  setBusy(set: (busy: boolean) => void): void;
  hold(): { resolve(result: SubmitResult): void };
  fire(): Event;
}

function toRecord(values: LeadValues): Readonly<Record<string, unknown>> {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    diallingCode: values.diallingCode,
    phone: values.phone,
    country: values.country,
    choice: values.choice,
    accepted: values.accepted,
  };
}

function baseAttrs(form: FormKey, zoomLink: string | null): MountAttrs {
  return {
    form,
    lang: "es",
    theme: "light",
    zoomLink,
    webinarTopic: zoomLink === null ? null : "Sesion",
    webinarDate: zoomLink === null ? null : "2026-10-02T15:00:00Z",
    webinarTz: null,
    leadSource: null,
    bdmOwner: null,
    opensAt: null,
    closesAt: null,
    closedUrl: null,
    scheduleInvalid: false,
    country: null,
  };
}

function leadValues(form: FormKey): LeadValues {
  return {
    firstName: "Ana",
    lastName: "Lopez",
    email: "ana@example.com",
    diallingCode: "52",
    phone: "5512345678",
    country: "MEX",
    choice: form === "interest" ? "Abrir cuenta" : "Principiante",
    accepted: true,
  };
}

function createPopup(log: string[]): PopupDouble {
  const state: PopupState = { opener: { page: "landing" }, closed: false, href: "about:blank" };
  const close = vi.fn();
  const popup = {
    get opener() {
      return state.opener;
    },
    set opener(value: unknown) {
      state.opener = value;
    },
    get closed() {
      return state.closed;
    },
    close,
    location: {
      get href() {
        return state.href;
      },
      set href(value: string) {
        log.push(`navigate:${value}`);
        state.href = value;
      },
    },
  };
  return { popup: popup as unknown as Window, close, state };
}

function mount(options?: {
  readonly form?: FormKey;
  readonly zoomLink?: string | null;
  readonly raw?: Readonly<Record<string, unknown>>;
  readonly scheduleState?: ScheduleState;
  readonly integrations?: readonly IntegrationHook[];
  readonly openReturnsNull?: boolean;
}): Harness {
  const formKey = options?.form ?? "lead";
  const zoomLink = options?.zoomLink === undefined ? null : options.zoomLink;
  const log: string[] = [];
  const states: UiState[] = [];
  const busy: boolean[] = [];
  const focused: FieldKey[] = [];
  const fieldErrors: Array<Partial<Record<FieldKey, string>>> = [];
  const popup = createPopup(log);
  const ctx: InstanceContext = { attrs: baseAttrs(formKey, zoomLink), dict };
  const values = leadValues(formKey);
  let raw: Readonly<Record<string, unknown>> = options?.raw ?? toRecord(values);
  let result: SubmitResult = { kind: "ok", aanumber: "AA-100" };
  let pending: Promise<SubmitResult> | undefined;
  let readPage = (): PageContext => PAGE;
  let readNow = (): number => NOW;
  let submitImpl: ((entries: PayloadEntries) => Promise<SubmitResult>) | undefined;
  let openImpl: (() => Window | null) | undefined;
  const submitted: PayloadEntries[] = [];
  let readValues = (): Readonly<Record<string, unknown>> => raw;
  let setBusy = (value: boolean): void => {
    busy.push(value);
  };
  let showState = (state: UiState): void => {
    log.push(state.kind);
    states.push(state);
  };

  const submit = vi.fn(async (entries: PayloadEntries): Promise<SubmitResult> => {
    log.push(popup.state.opener === null ? "opener-null" : "opener-set");
    log.push("submit");
    submitted.push(entries);
    if (submitImpl !== undefined) return submitImpl(entries);
    const waiting = pending;
    pending = undefined;
    return waiting ?? result;
  });

  const openPopup = vi.fn((): Window | null => {
    log.push("open");
    if (openImpl !== undefined) return openImpl();
    if (options?.openReturnsNull) return null;
    return popup.popup;
  });

  const schedule = vi.fn(() => options?.scheduleState ?? "open");
  const form = document.createElement("form");
  const button = document.createElement("button");
  button.type = "submit";
  form.append(button);
  const host = document.createElement("div");
  document.body.append(form, host);

  const deps: ControllerDeps = {
    submit,
    now: () => readNow(),
    openPopup,
    page: () => readPage(),
    integrations: options?.integrations ?? [
      () => {
        log.push("hook");
      },
    ],
    schedule,
    ui: {
      readValues: () => readValues(),
      setBusy: (value) => {
        setBusy(value);
      },
      showFieldErrors: (errors) => {
        fieldErrors.push(errors);
      },
      focusFirstInvalid: (field) => {
        focused.push(field);
      },
      showState: (state) => {
        showState(state);
      },
    },
  };

  bindController(form, ctx, deps);

  return {
    form,
    host,
    ctx,
    deps,
    log,
    states,
    busy,
    focused,
    fieldErrors,
    popup,
    submit,
    submitted,
    openPopup,
    schedule,
    setResult(next) {
      result = next;
    },
    setPage(read) {
      readPage = read;
    },
    setNow(read) {
      readNow = read;
    },
    setSubmit(impl) {
      submitImpl = impl;
    },
    setOpenPopup(impl) {
      openImpl = impl;
    },
    setReadValues(read) {
      readValues = read;
    },
    setShowState(show) {
      showState = show;
    },
    setBusy(set) {
      setBusy = set;
    },
    hold() {
      let resolve!: (value: SubmitResult) => void;
      pending = new Promise<SubmitResult>((done) => {
        resolve = done;
      });
      return { resolve };
    },
    fire() {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
      return event;
    },
  };
}

async function settle(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

beforeEach(() => {
  vi.spyOn(window, "open").mockReturnValue(null);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("bindController", () => {
  it("prevents the default submit before a later step throws", () => {
    const harness = mount();
    const href = window.location.href;
    harness.setReadValues(() => {
      throw new Error("read failed");
    });
    const event = new Event("submit", { bubbles: true, cancelable: true });
    expect(() => harness.form.dispatchEvent(event)).not.toThrow();
    expect(event.defaultPrevented).toBe(true);
    expect(window.location.href).toBe(href);
    expect(window.open).not.toHaveBeenCalled();
    expect(harness.submit).not.toHaveBeenCalled();
    expect(harness.busy).toEqual([]);
  });

  it("drops the lock when setBusy throws after the submit is accepted", async () => {
    const harness = mount();
    harness.setBusy((value) => {
      harness.busy.push(value);
      if (value) throw new Error("busy failed");
    });
    const event = harness.fire();
    expect(event.defaultPrevented).toBe(true);
    expect(harness.submit).not.toHaveBeenCalled();
    expect(harness.busy).toEqual([true, false]);
    harness.setBusy((value) => {
      harness.busy.push(value);
    });
    harness.fire();
    await settle();
    expect(harness.submit).toHaveBeenCalledTimes(1);
  });

  it("ignores a validation issue that does not name a field", () => {
    const harness = mount({ zoomLink: ZOOM });
    harness.setReadValues(() => "nope" as unknown as Readonly<Record<string, unknown>>);
    harness.fire();
    expect(harness.fieldErrors).toEqual([{}]);
    expect(harness.focused).toEqual([]);
    expect(harness.openPopup).not.toHaveBeenCalled();
    expect(harness.submit).not.toHaveBeenCalled();
  });

  it("one in-flight submit ignores a second submit, requestSubmit, and click", async () => {
    const harness = mount({ zoomLink: ZOOM });
    const pending = harness.hold();
    harness.fire();
    harness.fire();
    harness.form.requestSubmit();
    harness.form.querySelector("button")?.click();
    expect(harness.submit).toHaveBeenCalledTimes(1);
    expect(harness.openPopup).toHaveBeenCalledTimes(1);
    pending.resolve({ kind: "ok", aanumber: "AA-100" });
    await settle();
    expect(harness.busy).toEqual([true, false]);
    harness.fire();
    await settle();
    expect(harness.submit).toHaveBeenCalledTimes(2);
  });

  it.each(["ok", "rejected", "unknown"] as const)("releases the lock after %s", async (kind) => {
    const harness = mount();
    const pending = harness.hold();
    harness.fire();
    const result: SubmitResult =
      kind === "ok"
        ? { kind: "ok", aanumber: "AA-100" }
        : kind === "rejected"
          ? { kind: "rejected", fieldErrors: {} }
          : { kind: "unknown", reason: "timeout" };
    pending.resolve(result);
    await settle();
    expect(harness.busy).toEqual([true, false]);
    harness.setResult(result);
    harness.fire();
    await settle();
    expect(harness.submit).toHaveBeenCalledTimes(2);
  });

  it("releases the lock when the success step throws", async () => {
    const harness = mount();
    harness.setShowState(() => {
      throw new Error("paint failed");
    });
    harness.fire();
    await settle();
    expect(harness.busy).toEqual([true, false]);
    harness.setShowState((state) => {
      harness.states.push(state);
    });
    harness.fire();
    await settle();
    expect(harness.submit).toHaveBeenCalledTimes(2);
    expect(harness.states[harness.states.length - 1]).toEqual({ kind: "thank-you", zoomCta: false });
  });

  it("keeps a separate lock for each instance", async () => {
    const first = mount();
    const second = mount();
    const pending = first.hold();
    first.fire();
    second.fire();
    await settle();
    expect(first.submit).toHaveBeenCalledTimes(1);
    expect(second.submit).toHaveBeenCalledTimes(1);
    pending.resolve({ kind: "ok", aanumber: "AA-100" });
    await settle();
  });

  it("shows thank-you for a filled honeypot without submit, popup, or analytics", () => {
    const harness = mount({
      zoomLink: ZOOM,
      raw: { ...leadValues("lead"), honeypot: "bot" },
    });
    const event = harness.fire();
    expect(event.defaultPrevented).toBe(true);
    expect(harness.submit).not.toHaveBeenCalled();
    expect(harness.openPopup).not.toHaveBeenCalled();
    expect(harness.schedule).not.toHaveBeenCalled();
    expect(harness.log).not.toContain("hook");
    expect(harness.states).toEqual([{ kind: "thank-you", zoomCta: false }]);
    expect(harness.busy).toEqual([]);
    expect(window.open).not.toHaveBeenCalled();
  });

  it("still submits when the honeypot is empty", async () => {
    const harness = mount({ raw: { ...leadValues("lead"), honeypot: "" } });
    harness.fire();
    await settle();
    expect(harness.submit).toHaveBeenCalledTimes(1);
  });

  it("focuses the first invalid field in DOM order and does not open a popup", () => {
    const harness = mount({
      zoomLink: ZOOM,
      raw: { ...leadValues("lead"), choice: "nope", accepted: false, honeypot: "" },
    });
    harness.fire();
    expect(harness.focused).toEqual(["choice"]);
    expect(harness.fieldErrors[0]?.choice).toBe(dict.validation.tradingExperience);
    expect(harness.fieldErrors[0]?.accepted).toBe(dict.validation.acceptance);
    expect(harness.submit).not.toHaveBeenCalled();
    expect(harness.openPopup).not.toHaveBeenCalled();
    expect(harness.schedule).not.toHaveBeenCalled();
    expect(harness.log).not.toContain("hook");
  });

  it("unchecked acceptance shows the dictionary message and does not submit", () => {
    const harness = mount({
      raw: { ...leadValues("lead"), accepted: false },
    });
    harness.fire();
    expect(harness.fieldErrors[0]?.accepted).toBe(dict.validation.acceptance);
    expect(harness.focused).toEqual(["accepted"]);
    expect(harness.submit).not.toHaveBeenCalled();
    expect(harness.states).toEqual([]);
  });

  it.each([
    ["not-started", dict.schedule.notStarted],
    ["expired", dict.schedule.expired],
    ["invalid", dict.errors.generic],
  ] as const)("a %s schedule does not submit or open a popup", (scheduleState, message) => {
    const harness = mount({ zoomLink: ZOOM, scheduleState });
    harness.fire();
    expect(harness.schedule).toHaveBeenCalledWith(harness.ctx.attrs, NOW);
    expect(harness.submit).not.toHaveBeenCalled();
    expect(harness.openPopup).not.toHaveBeenCalled();
    expect(harness.log).not.toContain("hook");
    expect(harness.states).toEqual([{ kind: "closed", schedule: scheduleState, message }]);
  });

  it("opens the webinar popup before submit, with no features, and clears opener", async () => {
    const harness = mount({ zoomLink: ZOOM });
    const pending = harness.hold();
    harness.fire();
    expect(harness.log).toEqual(["open", "opener-null", "submit"]);
    expect(harness.openPopup.mock.calls[0]).toEqual([]);
    expect(harness.popup.state.opener).toBeNull();
    expect(harness.popup.state.href).toBe("about:blank");
    expect(window.open).not.toHaveBeenCalled();
    pending.resolve({ kind: "ok", aanumber: "AA-100", redirect_url: EVIL_REDIRECT } as SubmitResult);
    await settle();
    expect(harness.log).toEqual([
      "open",
      "opener-null",
      "submit",
      "thank-you",
      `navigate:${ZOOM}`,
      "hook",
    ]);
    expect(harness.popup.state.href).toBe(ZOOM);
    expect(harness.states[0]).toEqual({ kind: "thank-you", zoomCta: true });
    expect(harness.submitted).toEqual([buildPayload("lead", harness.ctx.attrs, leadValues("lead"), PAGE)]);
  });

  it("submits an interest form with the page captured at send time", async () => {
    const harness = mount({ form: "interest" });
    harness.fire();
    await settle();
    const entries = harness.submitted[0] as PayloadEntries;
    expect(harness.submitted).toEqual([buildPayload("interest", harness.ctx.attrs, leadValues("interest"), PAGE)]);
    expect(entries).toContainEqual(["form_fields[Trading_Experience__c]", "Abrir cuenta"]);
    expect(entries).toContainEqual(["referrer", PAGE.href]);
    expect(entries).toContainEqual(["form_fields[email]", "ana@example.com"]);
    expect(harness.states[0]).toEqual({ kind: "thank-you", zoomCta: false });
  });

  it("maps elementor field ids and shows only the dictionary rejection", async () => {
    const harness = mount({ zoomLink: ZOOM });
    const serverFields: Readonly<Record<string, string>> = {
      first_name: "Nombre",
      last_name: "Apellido",
      email: SERVER_HTML,
      dialling_code: "Prefijo",
      phone: "Telefono",
      country_of_residence: "Pais",
      Trading_Experience__c: "Experiencia",
      field_8f8f3d5: "Terminos",
      not_a_field: SERVER_HTML,
    };
    harness.setResult({ kind: "rejected", fieldErrors: serverFields, message: `${SERVER_HTML}<br>admin` });
    harness.fire();
    await settle();
    expect(harness.fieldErrors).toEqual([
      {
        firstName: "Nombre",
        lastName: "Apellido",
        email: SERVER_HTML,
        diallingCode: "Prefijo",
        phone: "Telefono",
        country: "Pais",
        choice: "Experiencia",
        accepted: "Terminos",
      },
    ]);
    expect(harness.states).toEqual([{ kind: "rejected", message: dict.errors.rejected }]);
    expect(JSON.stringify(harness.states)).not.toContain(SERVER_HTML);
    expect(harness.popup.close).toHaveBeenCalledTimes(1);
    expect(harness.log).not.toContain("hook");
    expect(harness.popup.state.href).toBe("about:blank");
  });

  it("does not show field errors when every server key is unmapped", async () => {
    const harness = mount();
    harness.setResult({ kind: "rejected", fieldErrors: { not_a_field: SERVER_HTML }, message: SERVER_HTML });
    harness.fire();
    await settle();
    expect(harness.fieldErrors).toEqual([]);
    expect(harness.states).toEqual([{ kind: "rejected", message: dict.errors.rejected }]);
  });

  it("closes nothing when a rejected webinar popup is already closed", async () => {
    const harness = mount({ zoomLink: ZOOM });
    harness.popup.state.closed = true;
    harness.setResult({ kind: "rejected", fieldErrors: { email: "Correo" } });
    harness.fire();
    await settle();
    expect(harness.popup.close).not.toHaveBeenCalled();
    expect(harness.popup.state.href).toBe("about:blank");
  });

  it.each(["timeout", "network", "invalid-response"] as const)(
    "unknown %s shows the dictionary message and does not auto retry",
    async (reason) => {
      const harness = mount({ zoomLink: ZOOM });
      harness.setResult({ kind: "unknown", reason });
      harness.fire();
      await settle();
      expect(harness.submit).toHaveBeenCalledTimes(1);
      expect(harness.states[0]).toMatchObject({ kind: "unknown", message: dict.errors.unknownResult });
      expect(harness.states[0]).toEqual({
        kind: "unknown",
        message: dict.errors.unknownResult,
        onRetry: expect.any(Function),
      });
      expect(harness.popup.close).toHaveBeenCalledTimes(1);
      expect(harness.log).not.toContain("hook");
      expect(harness.busy).toEqual([true, false]);
    },
  );

  it("unknown result waits for the retry button before a second submit", async () => {
    const harness = mount({ zoomLink: ZOOM });
    harness.setShowState((state) => {
      harness.states.push(state);
      if (state.kind === "unknown") {
        renderUnknownResult(harness.host, state.message, state.onRetry);
      }
    });
    harness.setResult({ kind: "unknown", reason: "timeout" });
    harness.fire();
    await settle();
    expect(harness.submit).toHaveBeenCalledTimes(1);
    expect(harness.openPopup).toHaveBeenCalledTimes(1);
    const button = harness.host.querySelector("button");
    expect(button?.textContent).toBe("Intentar de nuevo");
    expect(harness.host.textContent).toContain(dict.errors.unknownResult);
    expect(harness.host.querySelector("img")).toBeNull();
    harness.setResult({ kind: "ok", aanumber: "AA-200" });
    button?.click();
    expect(harness.openPopup).toHaveBeenCalledTimes(2);
    expect(harness.submit).toHaveBeenCalledTimes(2);
    await settle();
    expect(harness.popup.state.href).toBe(ZOOM);
  });

  it("shows the webinar backup flag when the popup is blocked or already closed", async () => {
    const blocked = mount({ zoomLink: ZOOM, openReturnsNull: true });
    blocked.fire();
    await settle();
    expect(blocked.states[0]).toEqual({ kind: "thank-you", zoomCta: true });
    expect(blocked.openPopup).toHaveBeenCalledTimes(1);
    expect(blocked.openPopup.mock.results[0]?.value).toBeNull();
    expect(blocked.log.some((entry) => entry.startsWith("navigate:"))).toBe(false);
    expect(blocked.popup.state.href).toBe("about:blank");

    const closed = mount({ zoomLink: ZOOM });
    closed.popup.state.closed = true;
    closed.fire();
    await settle();
    expect(closed.states[0]).toEqual({ kind: "thank-you", zoomCta: true });
    expect(closed.log.some((entry) => entry.startsWith("navigate:"))).toBe(false);
  });

  it("passes hooks only the form and aanumber", async () => {
    const seen: unknown[] = [];
    const harness = mount({
      integrations: [
        (event) => {
          seen.push(event);
        },
      ],
    });
    harness.fire();
    await settle();
    expect(seen).toEqual([{ form: "lead", aanumber: "AA-100" }]);
    expect(JSON.stringify(seen)).not.toContain("ana@example.com");
    expect(JSON.stringify(seen)).not.toContain("5512345678");
    expect(JSON.stringify(seen)).not.toContain("Lopez");
  });

  it("omits aanumber on the hook when the success payload has none", async () => {
    const seen: Array<{ readonly form: FormKey; readonly aanumber?: string }> = [];
    const harness = mount({
      integrations: [
        (event) => {
          seen.push(event);
        },
      ],
    });
    harness.setResult({ kind: "ok" });
    harness.fire();
    await settle();
    expect(seen).toEqual([{ form: "lead" }]);
    expect(seen[0]).not.toHaveProperty("aanumber");
  });
});

describe("round 2: failures before the result arrives", () => {
  const failures: ReadonlyArray<readonly [string, (harness: Harness) => void]> = [
    [
      "submit rejects",
      (harness) => {
        harness.setSubmit(() => Promise.reject(new Error("socket")));
      },
    ],
    [
      "buildPayload throws",
      (harness) => {
        // A null title makes the real buildPayload throw on the page context.
        harness.setPage(() => null as unknown as PageContext);
      },
    ],
    [
      "page() throws",
      (harness) => {
        harness.setPage(() => {
          throw new Error("page failed");
        });
      },
    ],
  ];

  it.each(failures)("%s shows unknown, closes the popup once, and frees the lock", async (_name, arrange) => {
    const harness = mount({ zoomLink: ZOOM });
    arrange(harness);
    harness.fire();
    await settle();
    expect(harness.states).toEqual([
      { kind: "unknown", message: dict.errors.unknownResult, onRetry: expect.any(Function) },
    ]);
    expect(harness.popup.close).toHaveBeenCalledTimes(1);
    expect(harness.busy).toEqual([true, false]);
    expect(harness.log).not.toContain("hook");
    harness.setPage(() => PAGE);
    harness.setSubmit(() => Promise.resolve({ kind: "ok", aanumber: "AA-100" }));
    harness.fire();
    await settle();
    expect(harness.states[harness.states.length - 1]).toEqual({ kind: "thank-you", zoomCta: true });
  });

  it("retry after a failed send works through the unknown state", async () => {
    const harness = mount({ zoomLink: ZOOM });
    harness.setSubmit(() => Promise.reject(new Error("socket")));
    harness.fire();
    await settle();
    const first = harness.states[0];
    harness.setSubmit(() => Promise.resolve({ kind: "ok", aanumber: "AA-100" }));
    if (first?.kind === "unknown") first.onRetry();
    await settle();
    expect(harness.states[1]).toEqual({ kind: "thank-you", zoomCta: true });
  });
});

describe("round 2: CA-21 recalculates on every submit", () => {
  it("uses the now() and the schedule of each submit", async () => {
    const harness = mount({ zoomLink: ZOOM });
    harness.schedule.mockReturnValueOnce("open").mockReturnValueOnce("expired");
    let clock = 1000;
    harness.setNow(() => clock);
    harness.fire();
    await settle();
    clock = 2000;
    harness.fire();
    await settle();
    expect(harness.schedule.mock.calls).toEqual([
      [harness.ctx.attrs, 1000],
      [harness.ctx.attrs, 2000],
    ]);
    expect(harness.submit).toHaveBeenCalledTimes(1);
    expect(harness.openPopup).toHaveBeenCalledTimes(1);
    expect(harness.states[1]).toEqual({ kind: "closed", schedule: "expired", message: dict.schedule.expired });
  });
});

describe("round 2: the lock after paths that never send", () => {
  it("sends once after invalid values turn valid", async () => {
    const harness = mount();
    harness.setReadValues(() => ({ ...leadValues("lead"), accepted: false }));
    harness.fire();
    expect(harness.busy).toEqual([]);
    harness.setReadValues(() => toRecord(leadValues("lead")));
    harness.fire();
    await settle();
    expect(harness.submit).toHaveBeenCalledTimes(1);
    expect(harness.busy).toEqual([true, false]);
  });

  it("sends once after a closed schedule opens", async () => {
    const harness = mount({ zoomLink: ZOOM });
    harness.schedule.mockReturnValueOnce("not-started").mockReturnValueOnce("open");
    harness.fire();
    expect(harness.busy).toEqual([]);
    harness.fire();
    await settle();
    expect(harness.submit).toHaveBeenCalledTimes(1);
    expect(harness.openPopup).toHaveBeenCalledTimes(1);
    expect(harness.busy).toEqual([true, false]);
  });

  it("sends once after a honeypot hit", async () => {
    const harness = mount();
    harness.setReadValues(() => ({ ...leadValues("lead"), honeypot: "bot" }));
    harness.fire();
    harness.setReadValues(() => toRecord(leadValues("lead")));
    harness.fire();
    await settle();
    expect(harness.submit).toHaveBeenCalledTimes(1);
    expect(harness.busy).toEqual([true, false]);
  });

  it("treats a whitespace-only honeypot as empty", async () => {
    const harness = mount({ raw: { ...leadValues("lead"), honeypot: "   " } });
    harness.fire();
    await settle();
    expect(harness.submit).toHaveBeenCalledTimes(1);
    expect(harness.states).toEqual([{ kind: "thank-you", zoomCta: false }]);
    expect(harness.log).toContain("hook");
  });
});

describe("round 2: the payload is read at send time", () => {
  it("uses the page of each submit", async () => {
    const harness = mount();
    const pages: PageContext[] = [
      { href: "https://landing.example/a", title: "A" },
      { href: "https://landing.example/b", title: "B" },
    ];
    let calls = 0;
    harness.setPage(() => pages[calls++] as PageContext);
    harness.fire();
    await settle();
    harness.fire();
    await settle();
    const values = leadValues("lead");
    expect(harness.submitted).toEqual([
      buildPayload("lead", harness.ctx.attrs, values, pages[0] as PageContext),
      buildPayload("lead", harness.ctx.attrs, values, pages[1] as PageContext),
    ]);
    expect(harness.submitted[0]).not.toEqual(harness.submitted[1]);
  });
});

describe("round 2: CA-15 with a throwing gtag", () => {
  it("still calls fbq with the eventID and pushes dataLayer", async () => {
    const fbq = vi.fn();
    const dataLayer: unknown[] = [];
    vi.stubGlobal("gtag", () => {
      throw new Error("gtag down");
    });
    vi.stubGlobal("fbq", fbq);
    vi.stubGlobal("dataLayer", dataLayer);
    const harness = mount({ integrations: DEFAULT_INTEGRATIONS });
    harness.fire();
    await settle();
    expect(fbq).toHaveBeenCalledWith("track", "Lead", {}, { eventID: "AA-100" });
    expect(dataLayer).toEqual([{ event: "atfx_lead", aanumber: "AA-100" }]);
    expect(harness.states[0]).toEqual({ kind: "thank-you", zoomCta: false });
  });
});

describe("round 2: no orphan popup", () => {
  it("closes the popup when setBusy(true) throws after it opened", async () => {
    const harness = mount({ zoomLink: ZOOM });
    harness.setBusy((value) => {
      harness.busy.push(value);
      if (value) throw new Error("busy failed");
    });
    harness.fire();
    await settle();
    expect(harness.openPopup).toHaveBeenCalledTimes(1);
    expect(harness.popup.close).toHaveBeenCalledTimes(1);
    expect(harness.submit).not.toHaveBeenCalled();
    expect(harness.busy).toEqual([true, false]);
  });

  it.each([
    ["rejected", { kind: "rejected", fieldErrors: {} }],
    ["unknown", { kind: "unknown", reason: "timeout" }],
  ] as const)("closes the popup when showState throws on %s", async (_kind, result) => {
    const harness = mount({ zoomLink: ZOOM });
    harness.setResult(result);
    harness.setShowState(() => {
      throw new Error("paint failed");
    });
    harness.fire();
    await settle();
    expect(harness.popup.close).toHaveBeenCalledTimes(1);
    expect(harness.busy).toEqual([true, false]);
  });

  it("runs the hooks even when the popup navigation throws", async () => {
    const harness = mount({ zoomLink: ZOOM });
    Object.defineProperty(harness.popup.popup, "location", {
      get() {
        throw new Error("cross-origin");
      },
    });
    harness.fire();
    await settle();
    expect(harness.log).toContain("hook");
    expect(harness.states[0]).toEqual({ kind: "thank-you", zoomCta: true });
    expect(harness.busy).toEqual([true, false]);
  });
});

describe("round 2: prototype keys from the server", () => {
  it("drops constructor, toString and __proto__ and keeps real fields", async () => {
    const harness = mount();
    const fieldErrors = JSON.parse(
      '{"constructor":"x","toString":"y","__proto__":"z","email":"Correo"}',
    ) as Record<string, string>;
    harness.setResult({ kind: "rejected", fieldErrors });
    harness.fire();
    await settle();
    expect(harness.fieldErrors).toEqual([{ email: "Correo" }]);
    expect(Object.keys(harness.fieldErrors[0] ?? {})).toEqual(["email"]);
  });

  it("shows no field errors when only prototype keys arrive", async () => {
    const harness = mount();
    const fieldErrors = JSON.parse('{"constructor":"x","toString":"y","__proto__":"z"}') as Record<string, string>;
    harness.setResult({ kind: "rejected", fieldErrors });
    harness.fire();
    await settle();
    expect(harness.fieldErrors).toEqual([]);
    expect(harness.states).toEqual([{ kind: "rejected", message: dict.errors.rejected }]);
  });
});

describe("analytics", () => {
  it("re-exports the default hooks from the controller", () => {
    expect(DEFAULT_INTEGRATIONS).toBe(ANALYTICS_HOOKS);
    expect(runIntegrations).toBe(runAnalytics);
  });

  it("sends transaction_id, eventID, and dataLayer id only when aanumber exists", () => {
    const gtag = vi.fn();
    const fbq = vi.fn();
    const dataLayer: unknown[] = [];
    vi.stubGlobal("gtag", gtag);
    vi.stubGlobal("fbq", fbq);
    vi.stubGlobal("dataLayer", dataLayer);
    runIntegrations(DEFAULT_INTEGRATIONS, { form: "lead", aanumber: "AA-9" });
    expect(gtag).toHaveBeenCalledWith("event", "generate_lead", { transaction_id: "AA-9" });
    expect(fbq).toHaveBeenCalledWith("track", "Lead", {}, { eventID: "AA-9" });
    expect(dataLayer).toEqual([{ event: "atfx_lead", aanumber: "AA-9" }]);

    gtag.mockClear();
    fbq.mockClear();
    dataLayer.length = 0;
    runIntegrations(DEFAULT_INTEGRATIONS, { form: "interest" });
    expect(gtag).toHaveBeenCalledWith("event", "generate_lead", {});
    expect(fbq).toHaveBeenCalledWith("track", "Lead", {});
    expect(fbq.mock.calls[0]).toHaveLength(3);
    expect(dataLayer).toEqual([{ event: "atfx_lead" }]);
  });

  it("skips gtag and fbq unless they are functions, and skips a non-array dataLayer", () => {
    vi.stubGlobal("gtag", "nope");
    vi.stubGlobal("fbq", { track: true });
    vi.stubGlobal("dataLayer", { push: vi.fn() });
    const plain = vi.fn(() => ({ ok: true }));
    expect(() =>
      runIntegrations([...DEFAULT_INTEGRATIONS, plain as unknown as IntegrationHook], {
        form: "lead",
        aanumber: "AA-1",
      }),
    ).not.toThrow();
    expect(plain).toHaveBeenCalledTimes(1);
  });

  it("a throwing gtag, a missing fbq, and a rejecting hook still leave the thank-you", async () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("gtag", () => {
      throw new Error("gtag down");
    });
    vi.stubGlobal("dataLayer", dataLayer);
    const rejecting = (() => Promise.reject(new Error("hook down"))) as unknown as IntegrationHook;
    const harness = mount({
      integrations: [...DEFAULT_INTEGRATIONS, rejecting],
    });
    harness.fire();
    await settle();
    expect(harness.states[0]).toEqual({ kind: "thank-you", zoomCta: false });
    expect(dataLayer).toEqual([{ event: "atfx_lead", aanumber: "AA-100" }]);
  });
});

describe("states", () => {
  it("renders the unknown message as text and retries from the button", () => {
    const host = document.createElement("div");
    const onRetry = vi.fn();
    const button = renderUnknownResult(host, `${dict.errors.unknownResult} ${SERVER_HTML}`, onRetry);
    expect(button.textContent).toBe("Intentar de nuevo");
    expect(button.type).toBe("button");
    expect(host.textContent).toContain(SERVER_HTML);
    expect(host.querySelector("img")).toBeNull();
    button.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders a rejection as text and a thank-you backup link", () => {
    const host = document.createElement("div");
    renderRejected(host, `${dict.errors.rejected} ${SERVER_HTML}`);
    expect(host.textContent).toContain(dict.errors.rejected);
    expect(host.querySelector("img")).toBeNull();

    renderThankYou(host, dict, ZOOM);
    const link = host.querySelector("a");
    expect(host.textContent).toContain(dict.thankYou.title);
    expect(host.textContent).toContain(dict.thankYou.message);
    expect(link?.getAttribute("href")).toBe(ZOOM);
    expect(link?.target).toBe("_blank");
    expect(link?.rel).toBe("noopener noreferrer");
    expect(link?.textContent).toBe(dict.thankYou.zoomCta);

    renderThankYou(host, dict, null);
    expect(host.querySelector("a")).toBeNull();
  });
});

describe("openAboutBlank", () => {
  it("opens about:blank in a new tab with no feature string", () => {
    const popup = createPopup([]);
    vi.mocked(window.open).mockReturnValue(popup.popup);
    expect(openAboutBlank()).toBe(popup.popup);
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(window.open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(vi.mocked(window.open).mock.calls[0]).toHaveLength(2);
  });
});
