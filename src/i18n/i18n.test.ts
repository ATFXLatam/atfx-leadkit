import { expect, test } from "vitest";
import { COUNTRIES, countryByIso2 } from "../data/countries";
import { DIALLING_CODES, diallingForIso2, type DiallingCode } from "../data/dialling";
import { SOURCE_COUNTRY_PAIRS, SOURCE_DIAL_PAIRS } from "../data/source-values.fixture";
import { resolveDict } from "./index";
import type { Dict } from "./types";

const SOURCE_COUNTRY_COUNT = 237;
const SOURCE_DIAL_COUNT = 225;
const LEAD_VALUES = ["Principiante", "Intermedio", "Avanzado"];
const INTEREST_VALUES = ["Abrir cuenta", "Copytrade", "IB Program"];

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, shape((value as Record<string, unknown>)[key])]),
    );
  }
  return typeof value;
}

function assertFilled(value: unknown): void {
  if (typeof value === "string") {
    expect(value.trim()).not.toBe("");
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertFilled(item);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) assertFilled(item);
  }
}

test("dicts share keys and have no empty copy", () => {
  const dicts = [resolveDict("es"), resolveDict("en"), resolveDict("pt")];
  expect(shape(dicts[1])).toEqual(shape(dicts[0]));
  expect(shape(dicts[2])).toEqual(shape(dicts[0]));
  for (const dict of dicts) assertFilled(dict);
});

test("sf codes match the contract", () => {
  expect(resolveDict("es").sf).toEqual({ emailLang: "ESP", landingLang: "esp" });
  expect(resolveDict("en").sf).toEqual({ emailLang: "ENG", landingLang: "en" });
  expect(resolveDict("pt").sf).toEqual({ emailLang: "PTG", landingLang: "pt" });
});

test("option values are canonical in every language", () => {
  for (const lang of ["es", "en", "pt"] as const) {
    const dict: Dict = resolveDict(lang);
    expect(dict.leadOptions.map((option) => option.value)).toEqual(LEAD_VALUES);
    expect(dict.interestOptions.map((option) => option.value)).toEqual(INTEREST_VALUES);
  }
});

test("countries keep the source count, unique iso3 and names", () => {
  expect(COUNTRIES).toHaveLength(SOURCE_COUNTRY_COUNT);
  expect(new Set(COUNTRIES.map((country) => country.iso3)).size).toBe(SOURCE_COUNTRY_COUNT);
  for (const country of COUNTRIES) {
    expect(country.iso2).toMatch(/^[A-Z]{2}$/);
    expect(country.names.es.trim()).not.toBe("");
    expect(country.names.en.trim()).not.toBe("");
    expect(country.names.pt.trim()).not.toBe("");
  }
  expect(countryByIso2("MX")?.names.es).toBe("México");
  expect(countryByIso2("mx")?.iso3).toBe("MEX");
  expect(countryByIso2("HK")?.names.es).toBe("RAE de Hong Kong (China)");
  expect(countryByIso2("AX")?.names.es).toBe("Islas Åland");
  expect(countryByIso2("ZZ")).toBeUndefined();
});

test("en and pt names of MX, BR, US, CO and AX are fixed", () => {
  expect(countryByIso2("MX")?.names.en).toBe("Mexico");
  expect(countryByIso2("MX")?.names.pt).toBe("México");
  expect(countryByIso2("BR")?.names.en).toBe("Brazil");
  expect(countryByIso2("BR")?.names.pt).toBe("Brasil");
  expect(countryByIso2("US")?.names.en).toBe("United States");
  expect(countryByIso2("US")?.names.pt).toBe("Estados Unidos");
  expect(countryByIso2("CO")?.names.en).toBe("Colombia");
  expect(countryByIso2("CO")?.names.pt).toBe("Colômbia");
  expect(countryByIso2("AX")?.names.en).toBe("Åland Islands");
  expect(countryByIso2("AX")?.names.pt).toBe("Ilhas Aland");
});

test("dialling codes keep the source count and point at a country", () => {
  expect(DIALLING_CODES).toHaveLength(SOURCE_DIAL_COUNT);
  const iso2s = new Set(COUNTRIES.map((country) => country.iso2));
  for (const dial of DIALLING_CODES) {
    expect(iso2s.has(dial.iso2)).toBe(true);
    expect(dial.value.trim()).not.toBe("");
    expect(dial.label.trim()).not.toBe("");
  }
  expect(diallingForIso2("US")?.value).toBe("1");
  expect(diallingForIso2("mx")?.value).toBe("52");
  expect(DIALLING_CODES.find((dial: DiallingCode) => dial.value === "358-18")?.iso2).toBe("AX");
  expect(DIALLING_CODES.find((dial: DiallingCode) => dial.value === "1-242")?.iso2).toBe("BS");
  expect(diallingForIso2("ZZ")).toBeUndefined();
});

test("countries and dials match the frozen source pairs", () => {
  expect(COUNTRIES.map((country) => [country.iso3, country.iso2])).toEqual(SOURCE_COUNTRY_PAIRS);
  expect(DIALLING_CODES.map((dial) => [dial.value, dial.iso2])).toEqual(SOURCE_DIAL_PAIRS);
});

test("country iso2 is unique and iso3 is three letters", () => {
  expect(new Set(COUNTRIES.map((country) => country.iso2)).size).toBe(COUNTRIES.length);
  for (const country of COUNTRIES) {
    expect(country.iso3).toMatch(/^[A-Z]{3}$/);
  }
});

test("lookups trim spaces and uppercase", () => {
  expect(countryByIso2(" mx ")?.iso3).toBe("MEX");
  expect(countryByIso2("co ")?.iso3).toBe("COL");
  expect(diallingForIso2(" us")?.value).toBe("1");
  expect(diallingForIso2(" ax ")?.iso2).toBe("AX");
});
