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
  fieldErrorId,
  fieldId,
  type FieldName,
  resolveFieldDefaults,
} from "./fields";

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
    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-describedby", appendDescribedBy(control.getAttribute("aria-describedby"), error.id));
  }
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
  return wrapField(field, label, input, instanceId);
}

function createPhoneField(dict: Dict, instanceId: string): HTMLElement {
  const input = createInput("phone", "tel", "tel-national", instanceId);
  input.inputMode = "tel";
  input.pattern = PHONE_PATTERN;
  input.title = dict.phoneTitle;
  return wrapField("phone", dict.labels.phone, input, instanceId);
}

function createDiallingField(dict: Dict, instanceId: string, selectedDialling: string | null): HTMLElement {
  const select = createSelect("diallingCode", "tel-country-code", instanceId);
  appendDiallingOptions(select, dict.placeholders.select, selectedDialling);
  return wrapField("diallingCode", dict.labels.diallingCode, select, instanceId);
}

function createCountryField(dict: Dict, lang: MountAttrs["lang"], instanceId: string, selectedIso3: string | null): HTMLElement {
  const select = createSelect("country", "country", instanceId);
  appendCountryOptions(select, lang, dict.placeholders.select, selectedIso3);
  return wrapField("country", dict.labels.country, select, instanceId);
}

function createChoiceField(dict: Dict, formKey: FormKey, instanceId: string): HTMLElement {
  const select = createSelect("choice", "off", instanceId);
  appendChoiceOptions(select, choiceOptions(dict, formKey), dict.placeholders.select);
  return wrapField("choice", choiceLabel(dict, formKey), select, instanceId);
}

function createConsentField(dict: Dict, attrs: MountAttrs, instanceId: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "atfx-leadkit__field atfx-leadkit__field--consent";

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

function createSubmit(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "submit";
  button.className = "atfx-leadkit__submit";
  button.textContent = label;
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
  const wrapper = document.createElement("div");
  wrapper.className = "atfx-leadkit__field";

  const label = document.createElement("label");
  label.className = "atfx-leadkit__label";
  label.htmlFor = fieldId(field, instanceId);
  label.textContent = labelText;

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
    control.removeAttribute("aria-invalid");
    const cleaned = removeToken(control.getAttribute("aria-describedby"), error.id);
    if (cleaned === "") {
      control.removeAttribute("aria-describedby");
      continue;
    }
    control.setAttribute("aria-describedby", cleaned);
  }
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
