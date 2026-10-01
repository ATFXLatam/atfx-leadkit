import type { FormKey, Lang, MountAttrs } from "../contract/types";
import { isValidCalendarDate, parseIsoWithZone } from "./time";
import { safeClosedUrl, safeZoomLink } from "./url";

const BDM_OWNER_REGEX = /^005[A-Za-z0-9]{12}([A-Za-z0-9]{3})?$/;
const WEBINAR_DATE_REGEX =
  /^(\d{4})-(\d{2})-(\d{2}) ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

function normalizeAttr(raw: string | undefined): string | null {
  if (raw === undefined) {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function clipToCodePoints(value: string, max: number): string {
  return Array.from(value).slice(0, max).join("");
}

function clipForWarn(value: string): string {
  if (Array.from(value).length <= 120) {
    return value;
  }
  return `${clipToCodePoints(value, 117)}...`;
}

function normalizeWebinarDate(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }
  const match = raw.match(WEBINAR_DATE_REGEX);
  if (match === null) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidCalendarDate(year, month, day)) {
    return null;
  }
  return raw;
}

function normalizeLang(raw: string | null): Lang {
  if (raw === null) {
    return "es";
  }
  const firstSubtag = raw.replace(/_/g, "-").split("-")[0]?.toLowerCase();
  if (firstSubtag === "es" || firstSubtag === "en" || firstSubtag === "pt") {
    return firstSubtag;
  }
  return "es";
}

function normalizeTimeZone(raw: string | null): string | null {
  if (raw === null || /^[+\-\d]/.test(raw)) {
    return null;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw });
    return raw;
  } catch {
    return null;
  }
}

function normalizeForm(raw: string | null): FormKey {
  if (raw === "lead" || raw === "interest") {
    return raw;
  }
  throw new UnknownFormError(raw);
}

function normalizeCountry(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }
  const normalized = raw.toUpperCase();
  if (normalized === "XX" || normalized === "T1") {
    return null;
  }
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

export class UnknownFormError extends Error {
  readonly value: string | null;

  constructor(value: string | null) {
    super(`Unknown form value: ${value === null ? "<missing>" : value}`);
    this.name = "UnknownFormError";
    this.value = value;
  }
}

export function parseMountAttrs(
  dataset: Readonly<Record<string, string | undefined>>,
  context: { readonly pageUrl: string; readonly closedUrlAllowlist: ReadonlyArray<string> },
  warn?: (message: string) => void,
): MountAttrs {
  const parseSchedule = (key: "opensAt" | "closesAt"): { parsed: number | null; invalid: boolean } => {
    const raw = normalizeAttr(dataset[key]);
    if (raw === null) {
      return { parsed: null, invalid: false };
    }
    const parsed = parseIsoWithZone(raw);
    if (parsed === null) {
      warn?.(`[atfx-leadkit] Invalid data-${key}: ${clipForWarn(raw)}`);
      return { parsed: null, invalid: true };
    }
    return { parsed, invalid: false };
  };

  const form = normalizeForm(normalizeAttr(dataset.atfxLeadkit));
  const zoomLinkRaw = normalizeAttr(dataset.zoomLink);
  const closedUrlRaw = normalizeAttr(dataset.closedUrl);
  const webinarTopic = normalizeAttr(dataset.webinarTopic);
  const bdmOwnerRaw = normalizeAttr(dataset.bdmOwner);
  const opensAt = parseSchedule("opensAt");
  const closesAt = parseSchedule("closesAt");
  const scheduleInvalid = opensAt.invalid || closesAt.invalid;

  return {
    form,
    lang: normalizeLang(normalizeAttr(dataset.lang)),
    theme: normalizeAttr(dataset.theme) === "dark" ? "dark" : "light",
    zoomLink: zoomLinkRaw === null ? null : safeZoomLink(zoomLinkRaw),
    webinarTopic: webinarTopic === null ? null : clipToCodePoints(webinarTopic, 120),
    webinarDate: normalizeWebinarDate(normalizeAttr(dataset.webinarDate)),
    webinarTz: normalizeTimeZone(normalizeAttr(dataset.webinarTz)),
    leadSource: normalizeAttr(dataset.leadSource),
    bdmOwner: bdmOwnerRaw !== null && BDM_OWNER_REGEX.test(bdmOwnerRaw) ? bdmOwnerRaw : null,
    opensAt: opensAt.parsed,
    closesAt: closesAt.parsed,
    closedUrl:
      closedUrlRaw === null
        ? null
        : safeClosedUrl(closedUrlRaw, context.pageUrl, context.closedUrlAllowlist),
    scheduleInvalid,
    country: normalizeCountry(normalizeAttr(dataset.country)),
  };
}
