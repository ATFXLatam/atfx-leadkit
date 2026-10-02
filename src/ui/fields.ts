import type { FormKey, Lang } from "../contract/types";
import { COUNTRIES, countryByIso2 } from "../data/countries";
import { DIALLING_CODES, diallingForIso2 } from "../data/dialling";
import type { Dict } from "../i18n/types";

export const FIELD_NAMES = [
  "firstName",
  "lastName",
  "email",
  "diallingCode",
  "phone",
  "country",
  "choice",
  "accepted",
] as const;

export type FieldName = (typeof FIELD_NAMES)[number];

// Fuente Karen 2026-10-02: es el unico documento entregado y el PDF esta solo en ingles, por eso las tres lenguas comparten URL.
export const CONSENT_PRIVACY_URLS: Readonly<Record<Lang, string>> = {
  es: "https://www.atfx.com/wp-content/uploads/2024/04/AT-Global-Markets-MU_EN_Privacy-and-Internal-Privacy-Controls-Policy.pdf",
  en: "https://www.atfx.com/wp-content/uploads/2024/04/AT-Global-Markets-MU_EN_Privacy-and-Internal-Privacy-Controls-Policy.pdf",
  pt: "https://www.atfx.com/wp-content/uploads/2024/04/AT-Global-Markets-MU_EN_Privacy-and-Internal-Privacy-Controls-Policy.pdf",
};

export const CONSENT_PRIVACY_TEXT: Readonly<Record<Lang, string>> = {
  es: "PENDIENTE_LEGAL: Política de Privacidad",
  en: "PENDIENTE_LEGAL: Privacy Policy",
  pt: "PENDIENTE_LEGAL: Política de Privacidade",
};

export interface FieldDefaults {
  readonly countryIso3: string | null;
  readonly diallingCode: string | null;
}

export function fieldId(fieldName: FieldName, instanceId: string): string {
  return `atfx-${fieldName}-${instanceId}`;
}

export function fieldErrorId(fieldName: FieldName, instanceId: string): string {
  return `atfx-${fieldName}-error-${instanceId}`;
}

export function choiceLabel(dict: Dict, form: FormKey): string {
  return form === "lead" ? dict.labels.tradingExperience : dict.labels.interest;
}

export function choiceOptions(dict: Dict, form: FormKey): ReadonlyArray<{ readonly value: string; readonly label: string }> {
  return form === "lead" ? dict.leadOptions : dict.interestOptions;
}

export function resolveFieldDefaults(countryIso2: string | null): FieldDefaults {
  if (countryIso2 === null) {
    return { countryIso3: null, diallingCode: null };
  }
  const country = countryByIso2(countryIso2);
  const dialling = diallingForIso2(countryIso2);
  return {
    countryIso3: country?.iso3 ?? null,
    diallingCode: dialling?.value ?? null,
  };
}

export function appendCountryOptions(
  select: HTMLSelectElement,
  lang: Lang,
  placeholder: string,
  selectedIso3: string | null,
): void {
  select.append(createOption("", placeholder, selectedIso3 === null));
  for (const country of COUNTRIES) {
    select.append(createOption(country.iso3, country.names[lang], country.iso3 === selectedIso3));
  }
}

export function appendDiallingOptions(
  select: HTMLSelectElement,
  placeholder: string,
  selectedDialling: string | null,
): void {
  select.append(createOption("", placeholder, selectedDialling === null));
  for (const dialling of DIALLING_CODES) {
    select.append(createOption(dialling.value, dialling.label, dialling.value === selectedDialling));
  }
}

export function appendChoiceOptions(
  select: HTMLSelectElement,
  options: ReadonlyArray<{ readonly value: string; readonly label: string }>,
  placeholder: string,
): void {
  select.append(createOption("", placeholder, true));
  for (const option of options) {
    select.append(createOption(option.value, option.label, false));
  }
}

function createOption(value: string, label: string, selected: boolean): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.selected = selected;
  option.textContent = label;
  return option;
}
