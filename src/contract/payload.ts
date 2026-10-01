import { resolveLeadSource } from "./picklist";
import type { FormKey, Lang, LeadValues, MountAttrs, PageContext, PayloadEntries } from "./types";

export const ENDPOINT = "/wp-admin/admin-ajax.php";

function langCodes(lang: Lang): readonly [string, string] {
  if (lang === "en") {
    return ["ENG", "en"];
  }
  if (lang === "pt") {
    return ["PTG", "pt"];
  }
  return ["ESP", "esp"];
}

function normalizedTitle(rawTitle: string): string {
  const trimmed = rawTitle.trim();
  const fallback = trimmed === "" ? "ATFX LATAM" : trimmed;
  return fallback.slice(0, 200);
}

function webinarComment(attrs: MountAttrs, zoomLink: string): string {
  const parts: string[] = [];
  if (attrs.webinarTopic !== null) {
    parts.push(`Webinar Topic: ${attrs.webinarTopic}`);
  }
  if (attrs.webinarDate !== null) {
    parts.push(`Webinar Date & Time: ${attrs.webinarDate}`);
  }
  parts.push(`Webinar Zoom Link: ${zoomLink}`);
  return parts.join(" | ");
}

export function buildPayload(_form: FormKey, attrs: MountAttrs, values: LeadValues, page: PageContext): PayloadEntries {
  const hasZoom = attrs.zoomLink !== null;
  const leadSource = resolveLeadSource(attrs.leadSource, hasZoom);
  const [emailLanguage, landingLanguage] = langCodes(attrs.lang);
  const entries: Array<readonly [string, string]> = [
    ["action", "elementor_pro_forms_send_form"],
    ["post_id", "593"],
    ["form_id", "36ed025"],
    ["queried_id", "591"],
    ["referrer", page.href],
    ["referer_title", normalizedTitle(page.title)],
    ["form_fields[first_name]", values.firstName],
    ["form_fields[last_name]", values.lastName],
    ["form_fields[email]", values.email],
    ["form_fields[dialling_code]", values.diallingCode],
    ["form_fields[phone]", values.phone],
    ["form_fields[country_of_residence]", values.country],
    ["form_fields[Trading_Experience__c]", values.choice],
  ];
  if (values.accepted) {
    entries.push(["form_fields[field_8f8f3d5]", "on"]);
  }
  entries.push(
    ["form_fields[Entity__c]", "MU"],
    ["form_fields[Demo_Account_Balance__c]", "50000"],
    ["form_fields[Demo_Account_Leverage__c]", ""],
    ["form_fields[Email_language_lead__c]", emailLanguage],
    ["form_fields[Landing_Page_Language__c]", landingLanguage],
    ["form_fields[lead_source]", leadSource],
  );
  if (attrs.bdmOwner !== null) {
    entries.push(["form_fields[OwnerId__c]", attrs.bdmOwner]);
  }
  if (attrs.zoomLink !== null) {
    entries.push(["form_fields[Webinar_venue_zoom_link__c]", attrs.zoomLink]);
    // s3 parser normalizes empty attribute values to null, so one null-check rule
    // keeps webinar keys and comment segments consistent.
    if (attrs.webinarTopic !== null) {
      entries.push(["form_fields[Webinar_topic__c]", attrs.webinarTopic]);
    }
    if (attrs.webinarDate !== null) {
      entries.push(["form_fields[Webinar_date_time__c]", attrs.webinarDate]);
    }
    entries.push(["form_fields[Comment]", webinarComment(attrs, attrs.zoomLink)]);
  }
  return entries;
}

export function toFormData(entries: PayloadEntries): FormData {
  const formData = new FormData();
  for (const [key, value] of entries) {
    formData.append(key, value);
  }
  return formData;
}
