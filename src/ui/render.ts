import type { FormKey, MountAttrs } from "../contract/types";
import { PHONE_PATTERN } from "../forms/shared-fields";
import type { Dict } from "../i18n/types";
import {
  CONSENT_PRIVACY_TEXT,
  CONSENT_PRIVACY_URLS,
  FIELD_NAMES,
  appendChoiceOptions,
  appendCountryOptions,
  appendDiallingOptions,
  choiceLabel,
  choiceOptions,
  countryDisplay,
  fieldErrorId,
  fieldId,
  type FieldName,
  resolveFieldDefaults,
} from "./fields";
import { enhanceSelect, triggerId } from "./combobox";

const SVG_NS = "http://www.w3.org/2000/svg";

// Built node by node: src/ui never assigns markup strings (see render.test.ts).
function errorIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  const shapes: ReadonlyArray<Readonly<Record<string, string>>> = [
    { d: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z", fill: "currentColor", opacity: "0.1" },
    { d: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z", stroke: "currentColor" },
    { d: "M12 12.5v-5", stroke: "currentColor", "stroke-width": "1.5", "stroke-linecap": "round" },
    { d: "M12 14.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z", fill: "currentColor" },
  ];
  for (const attrs of shapes) {
    const path = document.createElementNS(SVG_NS, "path");
    for (const [name, value] of Object.entries(attrs)) path.setAttribute(name, value);
    svg.append(path);
  }
  return svg;
}

export interface FormDefinition {
  readonly key: FormKey;
}

export interface RenderInput {
  readonly definition: FormDefinition;
  readonly attrs: MountAttrs;
  readonly dict: Dict;
  readonly instanceId: string;
}

export function renderForm(input: RenderInput): HTMLFormElement {
  const form = document.createElement("form");
  form.className = "atfx-leadkit";
  form.dataset.theme = input.attrs.theme;
  form.noValidate = true;

  const defaults = resolveFieldDefaults(input.attrs.country);
  form.append(
    createTextField("firstName", input.dict.labels.firstName, "text", "given-name", input.instanceId),
    createTextField("lastName", input.dict.labels.lastName, "text", "family-name", input.instanceId),
    createTextField("email", input.dict.labels.email, "email", "email", input.instanceId, "email"),
    createDiallingField(input.dict, input.instanceId, defaults.diallingCode),
    createPhoneField(input.dict, input.instanceId),
    createCountryField(input.dict, input.attrs.lang, input.instanceId, defaults.countryIso3),
    createChoiceField(input.dict, input.definition.key, input.instanceId),
    createConsentField(input.dict, input.attrs, input.instanceId),
    createHoneypot(input.instanceId),
    createSubmit(input.dict.submit),
  );
  return form;
}

export function readValues(form: HTMLFormElement, instanceId: string): Record<string, unknown> {
  return {
    firstName: readStringValue(form, "firstName"),
    lastName: readStringValue(form, "lastName"),
    email: readStringValue(form, "email"),
    diallingCode: readStringValue(form, "diallingCode"),
    phone: readStringValue(form, "phone"),
    country: readStringValue(form, "country"),
    choice: readStringValue(form, "choice"),
    accepted: readBooleanValue(form, "accepted"),
    honeypot: readStringValue(form, `atfx_hp_${instanceId}`),
  };
}

export function showFieldErrors(form: HTMLFormElement, errors: Readonly<Record<string, string>>): void {
  clearErrorState(form);

  for (const [fieldName, message] of Object.entries(errors)) {
    if (!isFieldName(fieldName)) {
      continue;
    }
    const control = form.querySelector<HTMLElement>(`[data-atfx-field="${fieldName}"]`);
    const error = form.querySelector<HTMLElement>(`[data-atfx-field-error="${fieldName}"]`);
    if (!control || !error) {
      continue;
    }
    error.hidden = false;
    error.textContent = message;
    for (const target of describedControls(form, fieldName, control)) {
      target.setAttribute("aria-invalid", "true");
      target.setAttribute("aria-describedby", appendDescribedBy(target.getAttribute("aria-describedby"), error.id));
    }
  }
}

// The combobox trigger is the control people and screen readers reach, so it carries the
// error state too; the hidden native select keeps it for the existing contract.
function describedControls(form: HTMLFormElement, field: FieldName, control: HTMLElement): HTMLElement[] {
  const trigger = form.querySelector<HTMLElement>(`[data-atfx-control-for="${field}"]`);
  return trigger === null ? [control] : [control, trigger];
}

export function setBusy(form: HTMLFormElement, busy: boolean): void {
  form.setAttribute("aria-busy", String(busy));
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit) {
    submit.disabled = busy;
  }
}

function createTextField(
  field: "firstName" | "lastName" | "email",
  label: string,
  type: "text" | "email",
  autocomplete: string,
  instanceId: string,
  inputMode?: "email",
): HTMLElement {
  const input = createInput(field, type, autocomplete, instanceId);
  if (inputMode) {
    input.inputMode = inputMode;
  }
  return wrapField(field, label, withStatusIcon(input), instanceId);
}

function withStatusIcon(input: HTMLInputElement): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "atfx-leadkit__input-wrap";
  const icon = document.createElement("span");
  icon.className = "atfx-leadkit__field-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.append(errorIcon());
  wrap.append(input, icon);
  return wrap;
}

function createPhoneField(dict: Dict, instanceId: string): HTMLElement {
  const input = createInput("phone", "tel", "tel-national", instanceId);
  input.inputMode = "tel";
  input.pattern = PHONE_PATTERN;
  input.title = dict.phoneTitle;
  return wrapField("phone", dict.labels.phone, withStatusIcon(input), instanceId);
}

function createDiallingField(dict: Dict, instanceId: string, selectedDialling: string | null): HTMLElement {
  const select = createSelect("diallingCode", "tel-country-code", instanceId);
  appendDiallingOptions(select, dict.placeholders.select, selectedDialling);
  return wrapCombobox("diallingCode", dict.labels.diallingCode, enhanceSelect(select, { searchPlaceholder: dict.placeholders.search }), instanceId);
}

function createCountryField(dict: Dict, lang: MountAttrs["lang"], instanceId: string, selectedIso3: string | null): HTMLElement {
  const select = createSelect("country", "country", instanceId);
  appendCountryOptions(select, lang, dict.placeholders.select, selectedIso3);
  const combobox = enhanceSelect(select, { searchPlaceholder: dict.placeholders.search, display: countryDisplay });
  return wrapCombobox("country", dict.labels.country, combobox, instanceId);
}

function createChoiceField(dict: Dict, formKey: FormKey, instanceId: string): HTMLElement {
  const select = createSelect("choice", "off", instanceId);
  appendChoiceOptions(select, choiceOptions(dict, formKey), dict.placeholders.select);
  const combobox = enhanceSelect(select, { searchPlaceholder: dict.placeholders.search });
  return wrapCombobox("choice", choiceLabel(dict, formKey), combobox, instanceId);
}

function createConsentField(dict: Dict, attrs: MountAttrs, instanceId: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "atfx-leadkit__field atfx-leadkit__field--consent atfx-leadkit__field--accepted";

  const row = document.createElement("div");
  row.className = "atfx-leadkit__consent-row";

  const input = createInput("accepted", "checkbox", "off", instanceId);
  input.checked = false;
  input.className = "atfx-leadkit__checkbox";

  const label = document.createElement("label");
  label.className = "atfx-leadkit__consent-label";
  label.htmlFor = input.id;
  label.textContent = dict.acceptance;

  row.append(input, label);
  wrapper.append(row);

  const privacyLine = document.createElement("p");
  privacyLine.className = "atfx-leadkit__consent-privacy";
  const privacyLink = document.createElement("a");
  privacyLink.href = CONSENT_PRIVACY_URLS[attrs.lang];
  privacyLink.target = "_blank";
  privacyLink.rel = "noopener noreferrer";
  privacyLink.dataset.atfxConsentPrivacy = "true";
  privacyLink.textContent = CONSENT_PRIVACY_TEXT[attrs.lang];
  privacyLine.append(privacyLink);
  wrapper.append(privacyLine, createError("accepted", instanceId));

  return wrapper;
}

function createHoneypot(instanceId: string): HTMLElement {
  const container = document.createElement("div");
  container.className = "atfx-leadkit__honeypot-container";
  container.setAttribute("aria-hidden", "true");

  const input = document.createElement("input");
  input.className = "atfx-leadkit__honeypot";
  input.type = "text";
  input.name = `atfx_hp_${instanceId}`;
  input.autocomplete = "off";
  input.tabIndex = -1;

  container.append(input);
  return container;
}

// Same layers as the at_forms button: a background that shrinks on hover and the label split
// per character so each letter can roll; textContent still equals the label.
function createSubmit(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "submit";
  button.className = "atfx-leadkit__submit";
  const bg = document.createElement("span");
  bg.className = "atfx-leadkit__submit-bg";
  const inner = document.createElement("span");
  inner.className = "atfx-leadkit__submit-inner";
  const text = document.createElement("span");
  text.className = "atfx-leadkit__submit-text";
  Array.from(label).forEach((char, index) => {
    const span = document.createElement("span");
    span.textContent = char;
    span.style.setProperty("--atfx-index", String(index));
    text.append(span);
  });
  inner.append(text);
  button.append(bg, inner);
  return button;
}

function createInput(field: FieldName, type: string, autocomplete: string, instanceId: string): HTMLInputElement {
  const input = document.createElement("input");
  input.id = fieldId(field, instanceId);
  input.name = field;
  input.type = type;
  input.required = true;
  input.setAttribute("autocomplete", autocomplete);
  input.dataset.atfxField = field;
  if (type !== "checkbox") {
    input.className = "atfx-leadkit__control";
  }
  return input;
}

function createSelect(field: "diallingCode" | "country" | "choice", autocomplete: string, instanceId: string): HTMLSelectElement {
  const select = document.createElement("select");
  select.id = fieldId(field, instanceId);
  select.name = field;
  select.required = true;
  select.setAttribute("autocomplete", autocomplete);
  select.dataset.atfxField = field;
  select.className = "atfx-leadkit__control";
  return select;
}

function wrapField(field: FieldName, labelText: string, control: HTMLElement, instanceId: string): HTMLElement {
  return buildField(field, labelText, control, fieldId(field, instanceId), instanceId);
}

// The label points at the trigger: a label for the hidden select would send clicks and the
// accessible name to an element nobody can reach.
function wrapCombobox(field: FieldName, labelText: string, combobox: HTMLElement, instanceId: string): HTMLElement {
  return buildField(field, labelText, combobox, triggerId(fieldId(field, instanceId)), instanceId);
}

function buildField(field: FieldName, labelText: string, control: HTMLElement, labelFor: string, instanceId: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = `atfx-leadkit__field atfx-leadkit__field--${field}`;

  const label = document.createElement("label");
  label.className = "atfx-leadkit__label";
  label.htmlFor = labelFor;
  label.textContent = labelText;
  // Visual only: the control already announces required through the required attribute.
  const mark = document.createElement("span");
  mark.className = "atfx-leadkit__required";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = "*";
  label.append(" ", mark);

  wrapper.append(label, control, createError(field, instanceId));
  return wrapper;
}

function createError(field: FieldName, instanceId: string): HTMLParagraphElement {
  const error = document.createElement("p");
  error.id = fieldErrorId(field, instanceId);
  error.hidden = true;
  error.dataset.atfxFieldError = field;
  error.className = "atfx-leadkit__error";
  return error;
}

function clearErrorState(form: HTMLFormElement): void {
  for (const fieldName of FIELD_NAMES) {
    const control = form.querySelector<HTMLElement>(`[data-atfx-field="${fieldName}"]`);
    const error = form.querySelector<HTMLElement>(`[data-atfx-field-error="${fieldName}"]`);
    if (!error) {
      continue;
    }
    error.hidden = true;
    error.textContent = "";
    if (!control) {
      continue;
    }
    for (const target of describedControls(form, fieldName, control)) {
      clearControl(target, error.id);
    }
  }
}

function clearControl(control: HTMLElement, errorId: string): void {
  control.removeAttribute("aria-invalid");
  const cleaned = removeToken(control.getAttribute("aria-describedby"), errorId);
  if (cleaned === "") {
    control.removeAttribute("aria-describedby");
    return;
  }
  control.setAttribute("aria-describedby", cleaned);
}

function readStringValue(form: HTMLFormElement, name: string): string {
  const control = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
  return control?.value ?? "";
}

function readBooleanValue(form: HTMLFormElement, name: string): boolean {
  const control = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  return Boolean(control?.checked);
}

function isFieldName(value: string): value is FieldName {
  return FIELD_NAMES.includes(value as FieldName);
}

function appendDescribedBy(current: string | null, id: string): string {
  const tokens = tokenize(current);
  if (!tokens.includes(id)) {
    tokens.push(id);
  }
  return tokens.join(" ");
}

function removeToken(current: string | null, id: string): string {
  return tokenize(current)
    .filter((token) => token !== id)
    .join(" ");
}

function tokenize(value: string | null): string[] {
  if (value === null) {
    return [];
  }
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}
