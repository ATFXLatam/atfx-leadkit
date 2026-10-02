import { expect, test } from "vitest";
import type { ZodType } from "zod";
import { resolveDict } from "../i18n/index";
import type { Dict } from "../i18n/types";
import { PHONE_PATTERN, PHONE_REGEX } from "./shared-fields";
import { createInterestSchema } from "./interest/schema";
import { createLeadSchema } from "./lead/schema";

const LANGS = ["es", "en", "pt"] as const;

function emailOfLength(length: number): string {
  const domain = "@example.com";
  return `${"a".repeat(length - domain.length)}${domain}`;
}

function validLead(): Record<string, unknown> {
  return {
    firstName: "Ana",
    lastName: "Lopez",
    email: "ana@example.com",
    diallingCode: "52",
    phone: "5512345678",
    country: "MEX",
    choice: "Principiante",
    accepted: true,
  };
}

function validInterest(): Record<string, unknown> {
  return { ...validLead(), choice: "Abrir cuenta" };
}

function messageFor(schema: ZodType, value: unknown, field: string): string | undefined {
  const result = schema.safeParse(value);
  if (result.success) return undefined;
  const issue = result.error.issues.find((item) => item.path[0] === field);
  return issue?.message;
}

function expectLeadMessages(dict: Dict, lang: string): void {
  const lead = createLeadSchema(dict);
  const base = validLead();
  expect(messageFor(lead, { ...base, firstName: "A" }, "firstName"), `${lang} firstName`).toBe(dict.validation.firstName);
  expect(messageFor(lead, { ...base, lastName: "B" }, "lastName"), `${lang} lastName`).toBe(dict.validation.lastName);
  expect(messageFor(lead, { ...base, email: "nope" }, "email"), `${lang} email`).toBe(dict.validation.email);
  expect(messageFor(lead, { ...base, diallingCode: "999999" }, "diallingCode"), `${lang} diallingCode`).toBe(
    dict.validation.diallingCode,
  );
  expect(messageFor(lead, { ...base, phone: "+525512345678" }, "phone"), `${lang} phone`).toBe(dict.validation.phone);
  expect(messageFor(lead, { ...base, country: "XXX" }, "country"), `${lang} country`).toBe(dict.validation.country);
  expect(messageFor(lead, { ...base, choice: "Copytrade" }, "choice"), `${lang} choice`).toBe(
    dict.validation.tradingExperience,
  );
  expect(messageFor(lead, { ...base, accepted: false }, "accepted"), `${lang} accepted`).toBe(dict.validation.acceptance);
}

test("each language accepts lead and interest", () => {
  for (const lang of LANGS) {
    const dict = resolveDict(lang);
    const lead = createLeadSchema(dict).safeParse(validLead());
    const interest = createInterestSchema(dict).safeParse(validInterest());
    expect(lead.success, `${lang} lead`).toBe(true);
    expect(interest.success, `${lang} interest`).toBe(true);
  }
});

test("invalid fields use the dictionary message in every language", () => {
  for (const lang of LANGS) {
    const dict = resolveDict(lang);
    expectLeadMessages(dict, lang);
    const interest = createInterestSchema(dict);
    expect(messageFor(interest, { ...validInterest(), choice: "Principiante" }, "choice"), `${lang} interest`).toBe(
      dict.validation.interest,
    );
  }
});

test("name and email limits", () => {
  const dict = resolveDict("es");
  const lead = createLeadSchema(dict);
  const base = validLead();
  expect(lead.safeParse({ ...base, firstName: "a" }).success).toBe(false);
  expect(lead.safeParse({ ...base, firstName: "ab" }).success).toBe(true);
  expect(lead.safeParse({ ...base, firstName: "a".repeat(60) }).success).toBe(true);
  expect(lead.safeParse({ ...base, firstName: "a".repeat(61) }).success).toBe(false);
  expect(messageFor(lead, { ...base, firstName: "a".repeat(61) }, "firstName")).toBe(dict.validation.firstName);
  expect(lead.safeParse({ ...base, lastName: "b".repeat(80) }).success).toBe(true);
  expect(lead.safeParse({ ...base, lastName: "b".repeat(81) }).success).toBe(false);
  expect(lead.safeParse({ ...base, email: emailOfLength(254) }).success).toBe(true);
  expect(messageFor(lead, { ...base, email: emailOfLength(255) }, "email")).toBe(dict.validation.email);
  const trimmed = lead.safeParse({ ...base, firstName: "  ab  ", email: "  ana@example.com  " });
  expect(trimmed.success).toBe(true);
  if (trimmed.success) {
    expect(trimmed.data.firstName).toBe("ab");
    expect(trimmed.data.email).toBe("ana@example.com");
  }
});

test("phone strips spaces and enforces length", () => {
  const dict = resolveDict("es");
  const lead = createLeadSchema(dict);
  const base = validLead();
  const spaced = lead.safeParse({ ...base, phone: "55 1234 5678" });
  expect(spaced.success).toBe(true);
  if (spaced.success) expect(spaced.data.phone).toBe("5512345678");
  expect(lead.safeParse({ ...base, phone: "1".repeat(5) }).success).toBe(false);
  expect(lead.safeParse({ ...base, phone: "1".repeat(6) }).success).toBe(true);
  expect(lead.safeParse({ ...base, phone: "1".repeat(20) }).success).toBe(true);
  expect(messageFor(lead, { ...base, phone: "1".repeat(21) }, "phone")).toBe(dict.validation.phone);
  expect(messageFor(lead, { ...base, phone: "+525512345678" }, "phone")).toBe(dict.validation.phone);
});

test("unknown country and dialling code are rejected", () => {
  const dict = resolveDict("es");
  const lead = createLeadSchema(dict);
  const base = validLead();
  expect(messageFor(lead, { ...base, country: "XXX" }, "country")).toBe(dict.validation.country);
  expect(messageFor(lead, { ...base, country: "mex" }, "country")).toBe(dict.validation.country);
  expect(messageFor(lead, { ...base, diallingCode: "999999" }, "diallingCode")).toBe(dict.validation.diallingCode);
  expect(messageFor(lead, { ...base, diallingCode: "52 " }, "diallingCode")).toBe(dict.validation.diallingCode);
});

test("unchecked acceptance is rejected", () => {
  const dict = resolveDict("es");
  const lead = createLeadSchema(dict);
  expect(messageFor(lead, { ...validLead(), accepted: false }, "accepted")).toBe(dict.validation.acceptance);
});

test("choice enums stay on their form", () => {
  const dict = resolveDict("es");
  expect(createLeadSchema(dict).safeParse({ ...validLead(), choice: "Copytrade" }).success).toBe(false);
  expect(createInterestSchema(dict).safeParse({ ...validInterest(), choice: "Principiante" }).success).toBe(false);
  expect(createLeadSchema(dict).safeParse({ ...validLead(), choice: "Avanzado" }).success).toBe(true);
  expect(createInterestSchema(dict).safeParse({ ...validInterest(), choice: "IB Program" }).success).toBe(true);
});

test("phone pattern is the validation regex", () => {
  expect(PHONE_REGEX.source).toBe(PHONE_PATTERN);
  expect(PHONE_PATTERN).toBe("^(?=(?:[^0-9]*[0-9]){6})[0-9\\(][0-9\\(\\)#&*\\-=.]{5,19}$");
  expect(PHONE_REGEX.test("(123)456")).toBe(true);
  expect(PHONE_REGEX.test("......")).toBe(false);
  expect(PHONE_REGEX.test("+525512345678")).toBe(false);
});

test("phone pattern compiles with the HTML pattern flag", () => {
  const htmlPattern = new RegExp("^(?:" + PHONE_PATTERN + ")$", "v");
  const samples = [
    "(123)456",
    "55#12&3*4-5=6.",
    "......",
    "55abc1234",
    "5512/3456",
    "+525512345678",
    "=(1)*(2)",
    "*123456",
    "#123456",
    "-123456",
    "(55)12345678",
    "5512345678",
  ];
  for (const sample of samples) {
    expect(htmlPattern.test(sample), `phone=${JSON.stringify(sample)}`).toBe(PHONE_REGEX.test(sample));
  }
});

const REJECTED_NAMES = [
  "Ana\r\nBcc: x@evil.com",
  "Ana\nMaria",
  "Ana\rMaria",
  "Ana\0Maria",
  "Ana\u2028Maria",
  "Ana\u202EMaria",
  "<script>",
  "=1+1",
  "@x",
  "-x",
  "+x",
] as const;

const ACCEPTED_NAMES = [
  "Jose Maria",
  "José María",
  "D'Angelo",
  "D\u2019Angelo",
  "O\u2019Brien",
  "Ana-Luisa",
  "Ana\u30FBLuisa",
] as const;

const CONTROL_EMAILS = [
  "ana\n@example.com",
  "ana\r@example.com",
  "ana\0@example.com",
  "ana\u202E@example.com",
  "a\u200Bna@example.com",
] as const;

const FORM_CASES = [
  ["lead", createLeadSchema, validLead],
  ["interest", createInterestSchema, validInterest],
] as const;

test.each(FORM_CASES)("%s rejects unsafe names", (_label, create, valid) => {
  const dict = resolveDict("es");
  const schema = create(dict);
  const base = valid();
  for (const name of REJECTED_NAMES) {
    const label = JSON.stringify(name);
    expect(schema.safeParse({ ...base, firstName: name }).success, `firstName=${label}`).toBe(false);
    expect(schema.safeParse({ ...base, lastName: name }).success, `lastName=${label}`).toBe(false);
    expect(messageFor(schema, { ...base, firstName: name }, "firstName"), `firstName=${label}`).toBe(
      dict.validation.firstName,
    );
    expect(messageFor(schema, { ...base, lastName: name }, "lastName"), `lastName=${label}`).toBe(
      dict.validation.lastName,
    );
  }
});

test.each(FORM_CASES)("%s accepts names with accents, apostrophe, and hyphen", (_label, create, valid) => {
  const dict = resolveDict("es");
  const schema = create(dict);
  const base = valid();
  for (const name of ACCEPTED_NAMES) {
    const parsed = schema.safeParse({ ...base, firstName: name, lastName: name });
    expect(parsed.success, `name=${JSON.stringify(name)}`).toBe(true);
    if (parsed.success) {
      expect(parsed.data.firstName, `firstName=${JSON.stringify(name)}`).toBe(name);
      expect(parsed.data.lastName, `lastName=${JSON.stringify(name)}`).toBe(name);
    }
  }
});

test.each(FORM_CASES)("%s rejects control characters in email", (_label, create, valid) => {
  const dict = resolveDict("es");
  const schema = create(dict);
  const base = valid();
  for (const email of CONTROL_EMAILS) {
    const label = `email=${JSON.stringify(email)}`;
    expect(schema.safeParse({ ...base, email }).success, label).toBe(false);
    expect(messageFor(schema, { ...base, email }, "email"), label).toBe(dict.validation.email);
  }
});

const PHONE_CHARSET = [
  ["55#12&3*4-5=6.", true],
  ["55abc1234", false],
  ["5512/3456", false],
  ["......", false],
] as const;

test.each(FORM_CASES)("%s checks the phone charset", (_label, create, valid) => {
  const dict = resolveDict("es");
  const schema = create(dict);
  const base = valid();
  for (const [phone, accepted] of PHONE_CHARSET) {
    const label = `phone=${JSON.stringify(phone)}`;
    const parsed = schema.safeParse({ ...base, phone });
    expect(parsed.success, label).toBe(accepted);
    if (!accepted) expect(messageFor(schema, { ...base, phone }, "phone"), label).toBe(dict.validation.phone);
  }
});

const PHONE_PREFIX = [
  ["=(1)*(2)", false],
  ["*123456", false],
  ["#123456", false],
  ["-123456", false],
  ["(55)12345678", true],
  ["5512345678", true],
] as const;

test.each(FORM_CASES)("%s requires a digit or parenthesis at the start of the phone", (_label, create, valid) => {
  const dict = resolveDict("es");
  const schema = create(dict);
  const base = valid();
  for (const [phone, accepted] of PHONE_PREFIX) {
    const label = `phone=${JSON.stringify(phone)}`;
    const parsed = schema.safeParse({ ...base, phone });
    expect(parsed.success, label).toBe(accepted);
    if (!accepted) expect(messageFor(schema, { ...base, phone }, "phone"), label).toBe(dict.validation.phone);
  }
});

test.each(FORM_CASES)("%s repeats the invalid field table", (label, create, valid) => {
  for (const lang of LANGS) {
    const dict = resolveDict(lang);
    const schema = create(dict);
    const base = valid();
    const choice =
      label === "lead"
        ? { value: "Copytrade", message: dict.validation.tradingExperience }
        : { value: "Principiante", message: dict.validation.interest };
    expect(messageFor(schema, { ...base, firstName: "A" }, "firstName"), `${lang} firstName`).toBe(
      dict.validation.firstName,
    );
    expect(messageFor(schema, { ...base, lastName: "B" }, "lastName"), `${lang} lastName`).toBe(
      dict.validation.lastName,
    );
    expect(messageFor(schema, { ...base, email: "nope" }, "email"), `${lang} email`).toBe(dict.validation.email);
    expect(messageFor(schema, { ...base, diallingCode: "999999" }, "diallingCode"), `${lang} diallingCode`).toBe(
      dict.validation.diallingCode,
    );
    expect(messageFor(schema, { ...base, phone: "+525512345678" }, "phone"), `${lang} phone`).toBe(
      dict.validation.phone,
    );
    expect(messageFor(schema, { ...base, country: "XXX" }, "country"), `${lang} country`).toBe(dict.validation.country);
    expect(messageFor(schema, { ...base, choice: choice.value }, "choice"), `${lang} choice`).toBe(choice.message);
    expect(messageFor(schema, { ...base, accepted: false }, "accepted"), `${lang} accepted`).toBe(
      dict.validation.acceptance,
    );
  }
});

test.each(FORM_CASES)("%s repeats length borders and trim", (_label, create, valid) => {
  const dict = resolveDict("es");
  const schema = create(dict);
  const base = valid();
  expect(schema.safeParse({ ...base, firstName: "a" }).success).toBe(false);
  expect(schema.safeParse({ ...base, firstName: "ab" }).success).toBe(true);
  expect(schema.safeParse({ ...base, firstName: "a".repeat(60) }).success).toBe(true);
  expect(schema.safeParse({ ...base, firstName: "a".repeat(61) }).success).toBe(false);
  expect(schema.safeParse({ ...base, lastName: "b".repeat(80) }).success).toBe(true);
  expect(schema.safeParse({ ...base, lastName: "b".repeat(81) }).success).toBe(false);
  expect(schema.safeParse({ ...base, email: emailOfLength(254) }).success).toBe(true);
  expect(messageFor(schema, { ...base, email: emailOfLength(255) }, "email")).toBe(dict.validation.email);
  const short = schema.safeParse({ ...base, firstName: " a " });
  expect(short.success).toBe(false);
  if (!short.success) {
    expect(short.error.issues.find((item) => item.path[0] === "firstName")?.code).toBe("too_small");
  }
  const trimmed = schema.safeParse({ ...base, lastName: "  Lo  " });
  expect(trimmed.success).toBe(true);
  if (trimmed.success) expect(trimmed.data.lastName).toBe("Lo");
  const emailTrim = schema.safeParse({ ...base, email: "  ana@example.com  " });
  expect(emailTrim.success, "email trim").toBe(true);
  if (emailTrim.success) expect(emailTrim.data.email, "email trim").toBe("ana@example.com");
});

test.each(FORM_CASES)("%s accepts Bahamas, Aland, and Colombia", (_label, create, valid) => {
  const schema = create(resolveDict("es"));
  const base = valid();
  expect(schema.safeParse({ ...base, diallingCode: "1-242" }).success).toBe(true);
  expect(schema.safeParse({ ...base, diallingCode: "358-18" }).success).toBe(true);
  expect(schema.safeParse({ ...base, country: "COL" }).success).toBe(true);
});

test("validation messages are non-empty and distinct across languages", () => {
  const dicts = LANGS.map((lang) => resolveDict(lang));
  const keys = [
    "firstName",
    "lastName",
    "email",
    "diallingCode",
    "phone",
    "country",
    "tradingExperience",
    "interest",
    "acceptance",
  ] as const;
  for (const key of keys) {
    for (const lang of LANGS) {
      const message = resolveDict(lang).validation[key];
      expect(message.length, `${lang}.${key}`).toBeGreaterThan(0);
    }
    const messages = dicts.map((dict) => dict.validation[key]);
    expect(new Set(messages).size, key).toBe(messages.length);
  }
});

test.each(FORM_CASES)("%s phone spaces: 10 digits pass and 21 fail", (_label, create, valid) => {
  const dict = resolveDict("es");
  const schema = create(dict);
  const base = valid();
  const ten = schema.safeParse({ ...base, phone: "55 1234 5678" });
  expect(ten.success).toBe(true);
  if (ten.success) expect(ten.data.phone).toBe("5512345678");
  const twentyOne = `${"1".repeat(10)} ${"1".repeat(11)}`;
  expect(schema.safeParse({ ...base, phone: twentyOne }).success).toBe(false);
  expect(messageFor(schema, { ...base, phone: twentyOne }, "phone")).toBe(dict.validation.phone);
});

test.each(FORM_CASES)("%s rejects missing, undefined, and string acceptance", (_label, create, valid) => {
  const schema = create(resolveDict("es"));
  const base = valid();
  const { accepted: _accepted, ...missing } = base;
  expect(schema.safeParse(missing).success).toBe(false);
  expect(messageFor(schema, missing, "accepted")).toBeDefined();
  expect(schema.safeParse({ ...base, accepted: undefined }).success).toBe(false);
  expect(schema.safeParse({ ...base, accepted: "on" }).success).toBe(false);
});
