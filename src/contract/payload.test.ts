import { afterEach, describe, expect, test, vi } from "vitest";
import { ENDPOINT, buildPayload, toFormData } from "./payload";
import {
  INVALID_LEAD_SOURCE_WARNING,
  LEAD_SOURCES,
  isValidLeadSource,
  resolveLeadSource,
} from "./picklist";
import type { LeadValues, MountAttrs, PageContext } from "./types";

const valuesBase: LeadValues = {
  firstName: "Karen",
  lastName: "Lopez",
  email: "karen@example.com",
  diallingCode: "52",
  phone: "5512345678",
  country: "MEX",
  choice: "Principiante",
  accepted: true,
};

const attrsBase: MountAttrs = {
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
};

const pageBase: PageContext = {
  href: "https://www.atfxlatam.com/landings/demo?utm_source=google",
  title: "  Formulario de demo  ",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("contract payload", () => {
  test("exports endpoint and lead source picklist", () => {
    expect(ENDPOINT).toBe("/wp-admin/admin-ajax.php");
    expect(LEAD_SOURCES).toEqual([
      "Advertisement",
      "Customer Event",
      "Employee Referral",
      "Google AdWords",
      "Other",
      "Partner",
      "Purchased List",
      "Trade Show",
      "Webinar",
      "Website",
      "CS",
    ]);
  });

  test('golden lead_source explicit "CS" without zoom keeps CS', () => {
    const attrs: MountAttrs = { ...attrsBase, leadSource: "CS" };
    const entries = buildPayload("lead", attrs, valuesBase, pageBase);

    expect(entries).toEqual([
      ["action", "elementor_pro_forms_send_form"],
      ["post_id", "593"],
      ["form_id", "36ed025"],
      ["queried_id", "591"],
      ["referrer", "https://www.atfxlatam.com/landings/demo?utm_source=google"],
      ["referer_title", "Formulario de demo"],
      ["form_fields[first_name]", "Karen"],
      ["form_fields[last_name]", "Lopez"],
      ["form_fields[email]", "karen@example.com"],
      ["form_fields[dialling_code]", "52"],
      ["form_fields[phone]", "5512345678"],
      ["form_fields[country_of_residence]", "MEX"],
      ["form_fields[Trading_Experience__c]", "Principiante"],
      ["form_fields[field_8f8f3d5]", "on"],
      ["form_fields[Entity__c]", "MU"],
      ["form_fields[Demo_Account_Balance__c]", "50000"],
      ["form_fields[Demo_Account_Leverage__c]", ""],
      ["form_fields[Email_language_lead__c]", "ESP"],
      ["form_fields[Landing_Page_Language__c]", "esp"],
      ["form_fields[lead_source]", "CS"],
    ]);
  });

  test('golden lead_source explicit "Promotion" with zoom falls back to Webinar', () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const attrs: MountAttrs = {
      ...attrsBase,
      leadSource: "Promotion",
      zoomLink: "https://zoom.us/w/9876543210",
    };
    const entries = buildPayload("lead", attrs, valuesBase, pageBase);

    expect(entries).toEqual([
      ["action", "elementor_pro_forms_send_form"],
      ["post_id", "593"],
      ["form_id", "36ed025"],
      ["queried_id", "591"],
      ["referrer", "https://www.atfxlatam.com/landings/demo?utm_source=google"],
      ["referer_title", "Formulario de demo"],
      ["form_fields[first_name]", "Karen"],
      ["form_fields[last_name]", "Lopez"],
      ["form_fields[email]", "karen@example.com"],
      ["form_fields[dialling_code]", "52"],
      ["form_fields[phone]", "5512345678"],
      ["form_fields[country_of_residence]", "MEX"],
      ["form_fields[Trading_Experience__c]", "Principiante"],
      ["form_fields[field_8f8f3d5]", "on"],
      ["form_fields[Entity__c]", "MU"],
      ["form_fields[Demo_Account_Balance__c]", "50000"],
      ["form_fields[Demo_Account_Leverage__c]", ""],
      ["form_fields[Email_language_lead__c]", "ESP"],
      ["form_fields[Landing_Page_Language__c]", "esp"],
      ["form_fields[lead_source]", "Webinar"],
      ["form_fields[Webinar_venue_zoom_link__c]", "https://zoom.us/w/9876543210"],
      ["form_fields[Comment]", "Webinar Zoom Link: https://zoom.us/w/9876543210"],
    ]);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  test('golden lead_source explicit "Promotion" without zoom falls back to Website', () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const attrs: MountAttrs = { ...attrsBase, leadSource: "Promotion" };
    const entries = buildPayload("lead", attrs, valuesBase, pageBase);

    expect(entries).toEqual([
      ["action", "elementor_pro_forms_send_form"],
      ["post_id", "593"],
      ["form_id", "36ed025"],
      ["queried_id", "591"],
      ["referrer", "https://www.atfxlatam.com/landings/demo?utm_source=google"],
      ["referer_title", "Formulario de demo"],
      ["form_fields[first_name]", "Karen"],
      ["form_fields[last_name]", "Lopez"],
      ["form_fields[email]", "karen@example.com"],
      ["form_fields[dialling_code]", "52"],
      ["form_fields[phone]", "5512345678"],
      ["form_fields[country_of_residence]", "MEX"],
      ["form_fields[Trading_Experience__c]", "Principiante"],
      ["form_fields[field_8f8f3d5]", "on"],
      ["form_fields[Entity__c]", "MU"],
      ["form_fields[Demo_Account_Balance__c]", "50000"],
      ["form_fields[Demo_Account_Leverage__c]", ""],
      ["form_fields[Email_language_lead__c]", "ESP"],
      ["form_fields[Landing_Page_Language__c]", "esp"],
      ["form_fields[lead_source]", "Website"],
    ]);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  test("maps english language fields to ENG/en", () => {
    const attrs: MountAttrs = { ...attrsBase, lang: "en" };
    const entries = buildPayload("lead", attrs, valuesBase, pageBase);

    expect(entries).toContainEqual(["form_fields[Email_language_lead__c]", "ENG"]);
    expect(entries).toContainEqual(["form_fields[Landing_Page_Language__c]", "en"]);
  });

  test("maps portuguese language fields to PTG/pt", () => {
    const attrs: MountAttrs = { ...attrsBase, lang: "pt" };
    const entries = buildPayload("lead", attrs, valuesBase, pageBase);

    expect(entries).toContainEqual(["form_fields[Email_language_lead__c]", "PTG"]);
    expect(entries).toContainEqual(["form_fields[Landing_Page_Language__c]", "pt"]);
  });

  test("golden webinar with only topic omits Webinar_date_time__c", () => {
    const attrs: MountAttrs = {
      ...attrsBase,
      zoomLink: "https://us02web.zoom.us/j/12345678910",
      webinarTopic: "T",
      webinarDate: null,
    };
    const entries = buildPayload("lead", attrs, valuesBase, pageBase);

    expect(entries).toEqual([
      ["action", "elementor_pro_forms_send_form"],
      ["post_id", "593"],
      ["form_id", "36ed025"],
      ["queried_id", "591"],
      ["referrer", "https://www.atfxlatam.com/landings/demo?utm_source=google"],
      ["referer_title", "Formulario de demo"],
      ["form_fields[first_name]", "Karen"],
      ["form_fields[last_name]", "Lopez"],
      ["form_fields[email]", "karen@example.com"],
      ["form_fields[dialling_code]", "52"],
      ["form_fields[phone]", "5512345678"],
      ["form_fields[country_of_residence]", "MEX"],
      ["form_fields[Trading_Experience__c]", "Principiante"],
      ["form_fields[field_8f8f3d5]", "on"],
      ["form_fields[Entity__c]", "MU"],
      ["form_fields[Demo_Account_Balance__c]", "50000"],
      ["form_fields[Demo_Account_Leverage__c]", ""],
      ["form_fields[Email_language_lead__c]", "ESP"],
      ["form_fields[Landing_Page_Language__c]", "esp"],
      ["form_fields[lead_source]", "Webinar"],
      ["form_fields[Webinar_venue_zoom_link__c]", "https://us02web.zoom.us/j/12345678910"],
      ["form_fields[Webinar_topic__c]", "T"],
      ["form_fields[Comment]", "Webinar Topic: T | Webinar Zoom Link: https://us02web.zoom.us/j/12345678910"],
    ]);
  });

  test("golden webinar with only date omits Webinar_topic__c", () => {
    const attrs: MountAttrs = {
      ...attrsBase,
      zoomLink: "https://us02web.zoom.us/j/12345678910",
      webinarTopic: null,
      webinarDate: "D",
    };
    const entries = buildPayload("lead", attrs, valuesBase, pageBase);

    expect(entries).toEqual([
      ["action", "elementor_pro_forms_send_form"],
      ["post_id", "593"],
      ["form_id", "36ed025"],
      ["queried_id", "591"],
      ["referrer", "https://www.atfxlatam.com/landings/demo?utm_source=google"],
      ["referer_title", "Formulario de demo"],
      ["form_fields[first_name]", "Karen"],
      ["form_fields[last_name]", "Lopez"],
      ["form_fields[email]", "karen@example.com"],
      ["form_fields[dialling_code]", "52"],
      ["form_fields[phone]", "5512345678"],
      ["form_fields[country_of_residence]", "MEX"],
      ["form_fields[Trading_Experience__c]", "Principiante"],
      ["form_fields[field_8f8f3d5]", "on"],
      ["form_fields[Entity__c]", "MU"],
      ["form_fields[Demo_Account_Balance__c]", "50000"],
      ["form_fields[Demo_Account_Leverage__c]", ""],
      ["form_fields[Email_language_lead__c]", "ESP"],
      ["form_fields[Landing_Page_Language__c]", "esp"],
      ["form_fields[lead_source]", "Webinar"],
      ["form_fields[Webinar_venue_zoom_link__c]", "https://us02web.zoom.us/j/12345678910"],
      ["form_fields[Webinar_date_time__c]", "D"],
      ["form_fields[Comment]", "Webinar Date & Time: D | Webinar Zoom Link: https://us02web.zoom.us/j/12345678910"],
    ]);
  });

  test("golden lead with accepted false omits field_8f8f3d5", () => {
    const values: LeadValues = { ...valuesBase, accepted: false };
    const entries = buildPayload("lead", attrsBase, values, pageBase);

    expect(entries).toEqual([
      ["action", "elementor_pro_forms_send_form"],
      ["post_id", "593"],
      ["form_id", "36ed025"],
      ["queried_id", "591"],
      ["referrer", "https://www.atfxlatam.com/landings/demo?utm_source=google"],
      ["referer_title", "Formulario de demo"],
      ["form_fields[first_name]", "Karen"],
      ["form_fields[last_name]", "Lopez"],
      ["form_fields[email]", "karen@example.com"],
      ["form_fields[dialling_code]", "52"],
      ["form_fields[phone]", "5512345678"],
      ["form_fields[country_of_residence]", "MEX"],
      ["form_fields[Trading_Experience__c]", "Principiante"],
      ["form_fields[Entity__c]", "MU"],
      ["form_fields[Demo_Account_Balance__c]", "50000"],
      ["form_fields[Demo_Account_Leverage__c]", ""],
      ["form_fields[Email_language_lead__c]", "ESP"],
      ["form_fields[Landing_Page_Language__c]", "esp"],
      ["form_fields[lead_source]", "Website"],
    ]);
  });

  test("golden interest with accepted true includes field_8f8f3d5", () => {
    const attrs: MountAttrs = { ...attrsBase, form: "interest" };
    const values: LeadValues = { ...valuesBase, choice: "Copytrade", accepted: true };
    const entries = buildPayload("interest", attrs, values, pageBase);

    expect(entries).toEqual([
      ["action", "elementor_pro_forms_send_form"],
      ["post_id", "593"],
      ["form_id", "36ed025"],
      ["queried_id", "591"],
      ["referrer", "https://www.atfxlatam.com/landings/demo?utm_source=google"],
      ["referer_title", "Formulario de demo"],
      ["form_fields[first_name]", "Karen"],
      ["form_fields[last_name]", "Lopez"],
      ["form_fields[email]", "karen@example.com"],
      ["form_fields[dialling_code]", "52"],
      ["form_fields[phone]", "5512345678"],
      ["form_fields[country_of_residence]", "MEX"],
      ["form_fields[Trading_Experience__c]", "Copytrade"],
      ["form_fields[field_8f8f3d5]", "on"],
      ["form_fields[Entity__c]", "MU"],
      ["form_fields[Demo_Account_Balance__c]", "50000"],
      ["form_fields[Demo_Account_Leverage__c]", ""],
      ["form_fields[Email_language_lead__c]", "ESP"],
      ["form_fields[Landing_Page_Language__c]", "esp"],
      ["form_fields[lead_source]", "Website"],
    ]);
  });

  test("golden simple mode with owner keeps OwnerId__c at end and omits webinar fields", () => {
    const attrs: MountAttrs = { ...attrsBase, bdmOwner: "005ABC123DEF456" };
    const entries = buildPayload("lead", attrs, valuesBase, pageBase);

    expect(entries).toEqual([
      ["action", "elementor_pro_forms_send_form"],
      ["post_id", "593"],
      ["form_id", "36ed025"],
      ["queried_id", "591"],
      ["referrer", "https://www.atfxlatam.com/landings/demo?utm_source=google"],
      ["referer_title", "Formulario de demo"],
      ["form_fields[first_name]", "Karen"],
      ["form_fields[last_name]", "Lopez"],
      ["form_fields[email]", "karen@example.com"],
      ["form_fields[dialling_code]", "52"],
      ["form_fields[phone]", "5512345678"],
      ["form_fields[country_of_residence]", "MEX"],
      ["form_fields[Trading_Experience__c]", "Principiante"],
      ["form_fields[field_8f8f3d5]", "on"],
      ["form_fields[Entity__c]", "MU"],
      ["form_fields[Demo_Account_Balance__c]", "50000"],
      ["form_fields[Demo_Account_Leverage__c]", ""],
      ["form_fields[Email_language_lead__c]", "ESP"],
      ["form_fields[Landing_Page_Language__c]", "esp"],
      ["form_fields[lead_source]", "Website"],
      ["form_fields[OwnerId__c]", "005ABC123DEF456"],
    ]);
  });

  test("webinar topic presence is coherent between key and comment with empty-string input", () => {
    const attrs: MountAttrs = {
      ...attrsBase,
      zoomLink: "https://zoom.us/w/1234567890",
      webinarTopic: "",
      webinarDate: null,
    };
    const entries = buildPayload("lead", attrs, valuesBase, pageBase);

    expect(entries).toContainEqual(["form_fields[Webinar_topic__c]", ""]);
    expect(entries).toContainEqual([
      "form_fields[Comment]",
      "Webinar Topic:  | Webinar Zoom Link: https://zoom.us/w/1234567890",
    ]);
  });

  test("resolveLeadSource defaults for null and empty string without warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(resolveLeadSource(null, false)).toBe("Website");
    expect(resolveLeadSource("", false)).toBe("Website");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("resolveLeadSource keeps valid explicit values without warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(resolveLeadSource("CS", false)).toBe("CS");
    expect(resolveLeadSource("Webinar", true)).toBe("Webinar");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('resolveLeadSource warns once for "Promotion" with exact constant message', () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(resolveLeadSource("Promotion", true)).toBe("Webinar");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(INVALID_LEAD_SOURCE_WARNING);
    expect(String(warnSpy.mock.calls[0]?.[0] ?? "")).not.toContain("Promotion");
  });

  test("referer_title keeps 200 chars and truncates 201 chars by key lookup", () => {
    const title200 = "x".repeat(200);
    const title201 = "y".repeat(201);
    const page200: PageContext = { ...pageBase, title: title200 };
    const page201: PageContext = { ...pageBase, title: title201 };

    const entries200 = buildPayload("lead", attrsBase, valuesBase, page200);
    const entries201 = buildPayload("lead", attrsBase, valuesBase, page201);

    const refererTitle200 = entries200.find(([key]) => key === "referer_title");
    const refererTitle201 = entries201.find(([key]) => key === "referer_title");

    expect(refererTitle200).toEqual(["referer_title", title200]);
    expect(refererTitle201).toEqual(["referer_title", "y".repeat(200)]);
  });

  test("uses fallback referer_title when title is blank", () => {
    const blankTitlePage: PageContext = { ...pageBase, title: "   " };
    const entries = buildPayload("lead", attrsBase, valuesBase, pageBase);
    const blankTitleEntries = buildPayload("lead", attrsBase, valuesBase, blankTitlePage);

    expect(entries).toEqual([
      ["action", "elementor_pro_forms_send_form"],
      ["post_id", "593"],
      ["form_id", "36ed025"],
      ["queried_id", "591"],
      ["referrer", "https://www.atfxlatam.com/landings/demo?utm_source=google"],
      ["referer_title", "Formulario de demo"],
      ["form_fields[first_name]", "Karen"],
      ["form_fields[last_name]", "Lopez"],
      ["form_fields[email]", "karen@example.com"],
      ["form_fields[dialling_code]", "52"],
      ["form_fields[phone]", "5512345678"],
      ["form_fields[country_of_residence]", "MEX"],
      ["form_fields[Trading_Experience__c]", "Principiante"],
      ["form_fields[field_8f8f3d5]", "on"],
      ["form_fields[Entity__c]", "MU"],
      ["form_fields[Demo_Account_Balance__c]", "50000"],
      ["form_fields[Demo_Account_Leverage__c]", ""],
      ["form_fields[Email_language_lead__c]", "ESP"],
      ["form_fields[Landing_Page_Language__c]", "esp"],
      ["form_fields[lead_source]", "Website"],
    ]);
    expect(blankTitleEntries.find(([key]) => key === "referer_title")).toEqual(["referer_title", "ATFX LATAM"]);
  });

  test("isValidLeadSource keeps exact-match behavior", () => {
    expect(isValidLeadSource("Website")).toBe(true);
    expect(isValidLeadSource("webinar")).toBe(false);
    expect(isValidLeadSource(" Webinar ")).toBe(false);
  });

  test("toFormData preserves all entries and their original order", () => {
    const entries = buildPayload("lead", attrsBase, valuesBase, pageBase);

    const formData = toFormData(entries);
    const serialized = Array.from(formData.entries()).map(([key, value]) => [key, String(value)]);

    expect(serialized).toEqual(entries);
  });
});
