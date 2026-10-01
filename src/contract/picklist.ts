const LEAD_SOURCE_VALUES = [
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
] as const;

export const LEAD_SOURCES: readonly string[] = LEAD_SOURCE_VALUES;
export const INVALID_LEAD_SOURCE_WARNING = "Invalid data-lead-source value. Falling back to default.";

export function isValidLeadSource(value: string): boolean {
  return LEAD_SOURCES.includes(value);
}

export function resolveLeadSource(explicit: string | null, hasZoom: boolean): string {
  if (explicit !== null && isValidLeadSource(explicit)) {
    return explicit;
  }
  if (explicit !== null && explicit !== "") {
    console.warn(INVALID_LEAD_SOURCE_WARNING);
  }
  return hasZoom ? "Webinar" : "Website";
}
