import { z } from "zod";
import { COUNTRIES } from "../data/countries";
import { DIALLING_CODES } from "../data/dialling";
import type { Dict } from "../i18n/types";

// s7 copies this string into the pattern attribute. The schema uses the same source.
// Parentheses are escaped so browsers can compile the attribute with the v flag.
// The first character is a digit or "(" so the value cannot open an Excel formula.
// The lookahead requires six digits so a run of symbols is not a phone number.
export const PHONE_PATTERN = "^(?=(?:[^0-9]*[0-9]){6})[0-9\\(][0-9\\(\\)#&*\\-=.]{5,19}$";
export const PHONE_REGEX = new RegExp(PHONE_PATTERN);

// A name starts with a letter. Anything else can carry a header or a formula.
// U+2019 and U+30FB are the apostrophe and middle dot that phones insert.
const NAME_PATTERN = /^(?:\p{L})[\p{L}\p{M} '\u2019.\u30FB\-]*$/u;
const NO_CONTROL = /^[^\p{Cc}\p{Cf}]*$/u;

const COUNTRY_ISO3: ReadonlySet<string> = new Set(COUNTRIES.map((country) => country.iso3));
const DIAL_VALUES: ReadonlySet<string> = new Set(DIALLING_CODES.map((dial) => dial.value));

export function firstNameField(message: string) {
  return z.string().trim().min(2, message).max(60, message).regex(NAME_PATTERN, message);
}

export function lastNameField(message: string) {
  return z.string().trim().min(2, message).max(80, message).regex(NAME_PATTERN, message);
}

export function emailField(message: string) {
  return z.string().trim().max(254, message).regex(NO_CONTROL, message).email(message);
}

export function diallingField(message: string) {
  return z.string().refine((value) => DIAL_VALUES.has(value), { message });
}

export function countryField(message: string) {
  return z.string().refine((value) => COUNTRY_ISO3.has(value), { message });
}

export function phoneField(message: string) {
  return z
    .string()
    .transform((value) => value.replace(/ /g, ""))
    .refine((value) => PHONE_REGEX.test(value), { message });
}

export function acceptedField(message: string) {
  return z.boolean().refine((value) => value === true, { message });
}

export function choiceField(allowed: ReadonlySet<string>, message: string) {
  return z.string().refine((value) => allowed.has(value), { message });
}

export function sharedShape(dict: Dict) {
  return {
    firstName: firstNameField(dict.validation.firstName),
    lastName: lastNameField(dict.validation.lastName),
    email: emailField(dict.validation.email),
    diallingCode: diallingField(dict.validation.diallingCode),
    phone: phoneField(dict.validation.phone),
    country: countryField(dict.validation.country),
    accepted: acceptedField(dict.validation.acceptance),
  };
}
