import type { MountAttrs } from "../contract/types";
import type { ScheduleState } from "./controller";

const ISO_WITH_ZONE_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

function isLeapYear(year: number): boolean {
  if (year % 400 === 0) {
    return true;
  }
  if (year % 100 === 0) {
    return false;
  }
  return year % 4 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) {
    return false;
  }
  if (day < 1 || day > daysInMonth(year, month)) {
    return false;
  }
  return true;
}

export function parseIsoWithZone(raw: string): number | null {
  const match = raw.match(ISO_WITH_ZONE_REGEX);
  if (match === null) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidCalendarDate(year, month, day)) {
    return null;
  }

  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return timestamp;
}

// HACK: only separates open from invalid. s10 adds not-started and expired from opensAt/closesAt.
export function scheduleState(attrs: MountAttrs, _now: number): ScheduleState {
  return attrs.scheduleInvalid ? "invalid" : "open";
}
