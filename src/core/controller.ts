import type { ZodIssue } from "zod";
import { buildPayload } from "../contract/payload";
import type { FormKey, LeadValues, MountAttrs, PageContext } from "../contract/types";
import { createInterestSchema } from "../forms/interest/schema";
import { createLeadSchema } from "../forms/lead/schema";
import type { Dict } from "../i18n/types";
import { DEFAULT_INTEGRATIONS, runIntegrations } from "./analytics";
import type { IntegrationHook } from "./analytics";
import type { SubmitResult, submitLead } from "./submit";

export type { IntegrationHook } from "./analytics";
export { DEFAULT_INTEGRATIONS, runIntegrations };

export type ScheduleState = "open" | "not-started" | "expired" | "invalid";

const FIELD_ORDER = [
  "firstName",
  "lastName",
  "email",
  "diallingCode",
  "phone",
  "country",
  "choice",
  "accepted",
] as const;

export type FieldKey = (typeof FIELD_ORDER)[number];

// A Map has no inherited keys, so server keys like constructor or __proto__ cannot resolve.
const ELEMENTOR_TO_FIELD: ReadonlyMap<string, FieldKey> = new Map<string, FieldKey>([
  ["first_name", "firstName"],
  ["last_name", "lastName"],
  ["email", "email"],
  ["dialling_code", "diallingCode"],
  ["phone", "phone"],
  ["country_of_residence", "country"],
  ["Trading_Experience__c", "choice"],
  ["field_8f8f3d5", "accepted"],
]);

export type UiState =
  | { readonly kind: "thank-you"; readonly zoomCta: boolean }
  | { readonly kind: "closed"; readonly schedule: Exclude<ScheduleState, "open">; readonly message: string }
  | { readonly kind: "unknown"; readonly message: string; readonly onRetry: () => void }
  | { readonly kind: "rejected"; readonly message: string };

export interface FormUi {
  readonly readValues: () => Readonly<Record<string, unknown>>;
  readonly setBusy: (busy: boolean) => void;
  readonly showFieldErrors: (errors: Readonly<Partial<Record<FieldKey, string>>>) => void;
  readonly focusFirstInvalid: (field: FieldKey) => void;
  readonly showState: (state: UiState) => void;
}

export interface InstanceContext {
  readonly attrs: MountAttrs;
  readonly dict: Dict;
}

export interface ControllerDeps {
  readonly submit: typeof submitLead;
  readonly now: () => number;
  readonly openPopup: () => Window | null;
  readonly page: () => PageContext;
  readonly integrations: readonly IntegrationHook[];
  readonly schedule: (attrs: MountAttrs, now: number) => ScheduleState;
  readonly ui: FormUi;
}

type SendPlan = { readonly values: LeadValues; readonly popup: Window | null };

export function bindController(form: HTMLFormElement, ctx: InstanceContext, deps: ControllerDeps): void {
  let inFlight = false;
  form.addEventListener("submit", (event) => {
    // A form without action GETs the current URL and would put the field values in the query.
    event.preventDefault();
    if (inFlight) return;
    let plan: SendPlan | undefined;
    try {
      plan = prepare(ctx, deps);
    } catch {
      // The default is already cancelled; nothing was opened before the throwing step.
      return;
    }
    if (plan === undefined) return;
    try {
      inFlight = true;
      deps.ui.setBusy(true);
      void finish(form, ctx, deps, plan).finally(release);
    } catch {
      // A throw here must not leave the form locked or the blank tab orphaned.
      release();
      closePopup(plan.popup);
    }
  });

  function release(): void {
    inFlight = false;
    deps.ui.setBusy(false);
  }
}

function prepare(ctx: InstanceContext, deps: ControllerDeps): SendPlan | undefined {
  const raw = deps.ui.readValues();
  if (honeypotFilled(raw)) {
    deps.ui.showState({ kind: "thank-you", zoomCta: false });
    return undefined;
  }
  const parsed = schemaFor(ctx).safeParse(raw);
  if (!parsed.success) {
    showInvalid(deps, parsed.error.issues);
    return undefined;
  }
  const schedule = deps.schedule(ctx.attrs, deps.now());
  if (schedule !== "open") {
    deps.ui.showState({ kind: "closed", schedule, message: closedMessage(ctx.dict, schedule) });
    return undefined;
  }
  return { values: parsed.data, popup: openWebinar(ctx.attrs.zoomLink, deps.openPopup) };
}

function honeypotFilled(raw: Readonly<Record<string, unknown>>): boolean {
  const value = raw.honeypot;
  // Whitespace alone is what autofill and password managers leave, not a bot signature.
  return typeof value === "string" && value.trim() !== "";
}

function schemaFor(ctx: InstanceContext) {
  if (ctx.attrs.form === "interest") return createInterestSchema(ctx.dict);
  return createLeadSchema(ctx.dict);
}

function showInvalid(deps: ControllerDeps, issues: readonly ZodIssue[]): void {
  const errors = collectFieldErrors(issues);
  deps.ui.showFieldErrors(errors);
  const field = firstInvalid(errors);
  if (field !== undefined) deps.ui.focusFirstInvalid(field);
}

function collectFieldErrors(issues: readonly ZodIssue[]): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (!isFieldKey(key)) continue;
    errors[key] = issue.message;
  }
  return errors;
}

function isFieldKey(value: unknown): value is FieldKey {
  return FIELD_ORDER.some((key) => key === value);
}

function firstInvalid(errors: Partial<Record<FieldKey, string>>): FieldKey | undefined {
  return FIELD_ORDER.find((key) => errors[key] !== undefined);
}

function closedMessage(messages: Dict, schedule: Exclude<ScheduleState, "open">): string {
  if (schedule === "not-started") return messages.schedule.notStarted;
  if (schedule === "expired") return messages.schedule.expired;
  return messages.errors.generic;
}

async function finish(form: HTMLFormElement, ctx: InstanceContext, deps: ControllerDeps, plan: SendPlan): Promise<void> {
  let result: SubmitResult;
  try {
    const entries = buildPayload(ctx.attrs.form, ctx.attrs, plan.values, deps.page());
    result = await deps.submit(entries);
  } catch {
    // Whether the server received it is unknown, so the person gets the manual retry path.
    result = { kind: "unknown", reason: "network" };
  }
  try {
    applyResult(form, ctx, deps, plan.popup, result);
  } catch {
    // The lock is released by the caller. A paint error must not stick the form.
  }
}

function applyResult(
  form: HTMLFormElement,
  ctx: InstanceContext,
  deps: ControllerDeps,
  popup: Window | null,
  result: SubmitResult,
): void {
  if (result.kind === "ok") {
    applyOk(ctx, deps, popup, result.aanumber);
    return;
  }
  if (result.kind === "rejected") {
    applyRejected(ctx, deps, popup, result.fieldErrors);
    return;
  }
  applyUnknown(form, ctx, deps, popup);
}

function applyOk(ctx: InstanceContext, deps: ControllerDeps, popup: Window | null, aanumber: string | undefined): void {
  try {
    deps.ui.showState({ kind: "thank-you", zoomCta: ctx.attrs.zoomLink !== null });
  } finally {
    try {
      if (ctx.attrs.zoomLink !== null) navigatePopup(popup, ctx.attrs.zoomLink);
    } finally {
      // The registration already succeeded; a paint or popup error must not drop the conversion.
      runIntegrations(deps.integrations, hookEvent(ctx.attrs.form, aanumber));
    }
  }
}

function applyRejected(
  ctx: InstanceContext,
  deps: ControllerDeps,
  popup: Window | null,
  fieldErrors: Readonly<Record<string, string>>,
): void {
  try {
    const mapped = mapFieldErrors(fieldErrors);
    if (hasAny(mapped)) deps.ui.showFieldErrors(mapped);
    deps.ui.showState({ kind: "rejected", message: ctx.dict.errors.rejected });
  } finally {
    closePopup(popup);
  }
}

function applyUnknown(form: HTMLFormElement, ctx: InstanceContext, deps: ControllerDeps, popup: Window | null): void {
  try {
    deps.ui.showState({
      kind: "unknown",
      message: ctx.dict.errors.unknownResult,
      onRetry: () => {
        form.requestSubmit();
      },
    });
  } finally {
    closePopup(popup);
  }
}

function hookEvent(form: FormKey, aanumber: string | undefined): Parameters<IntegrationHook>[0] {
  if (aanumber === undefined) return { form };
  return { form, aanumber };
}

function mapFieldErrors(fieldErrors: Readonly<Record<string, string>>): Partial<Record<FieldKey, string>> {
  const mapped: Partial<Record<FieldKey, string>> = {};
  for (const [key, message] of Object.entries(fieldErrors)) {
    const field = ELEMENTOR_TO_FIELD.get(key);
    if (field === undefined) continue;
    mapped[field] = message;
  }
  return mapped;
}

function hasAny(errors: Partial<Record<FieldKey, string>>): boolean {
  return FIELD_ORDER.some((key) => errors[key] !== undefined);
}

function openWebinar(zoomLink: string | null, openPopup: () => Window | null): Window | null {
  if (zoomLink === null) return null;
  // An await before this call would leave the user gesture, and the browser would block the popup.
  const popup = openPopup();
  if (popup) popup.opener = null;
  return popup;
}

function navigatePopup(popup: Window | null, zoomLink: string): void {
  if (popup === null || popup.closed) return;
  popup.location.href = zoomLink;
}

function closePopup(popup: Window | null): void {
  if (popup === null || popup.closed) return;
  popup.close();
}

export function openAboutBlank(): Window | null {
  return window.open("about:blank", "_blank");
}
