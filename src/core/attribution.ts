// Cellxpert sends the affiliate click as ?cxd= on the landing URL. ATFX IT asked (2026-10-16) for
// it in the hidden field CXD_token__c, the same one the native Elementor forms fill from the
// request parameter.
export const CXD_PARAM = "cxd";
export const CXD_STORAGE_KEY = "atfx_leadkit_cxd";
// The visitor can leave and come back from another page; without this the click is lost.
export const CXD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// It reaches Salesforce, so only the token shape Cellxpert emits passes the trust boundary.
const CXD_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StoredCxd {
  readonly value: string;
  readonly savedAt: number;
}

function validCxd(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return CXD_PATTERN.test(trimmed) ? trimmed : null;
}

export function cxdFromUrl(href: string): string | null {
  try {
    return validCxd(new URL(href).searchParams.get(CXD_PARAM));
  } catch {
    return null;
  }
}

function parseStored(raw: string | null): StoredCxd | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { value, savedAt } = parsed as { value?: unknown; savedAt?: unknown };
    const cxd = validCxd(typeof value === "string" ? value : null);
    if (cxd === null || typeof savedAt !== "number" || !Number.isFinite(savedAt)) return null;
    return { value: cxd, savedAt };
  } catch {
    return null;
  }
}

function readStored(storage: KeyValueStorage | null, now: number): string | null {
  if (storage === null) return null;
  try {
    const stored = parseStored(storage.getItem(CXD_STORAGE_KEY));
    if (stored === null || now - stored.savedAt > CXD_TTL_MS || stored.savedAt > now) return null;
    return stored.value;
  } catch {
    return null;
  }
}

function writeStored(storage: KeyValueStorage | null, value: string, now: number): void {
  if (storage === null) return;
  try {
    const record: StoredCxd = { value, savedAt: now };
    storage.setItem(CXD_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Private mode or a full quota: the URL value still goes out on this visit.
  }
}

// Last click wins: a fresh cxd in the URL replaces the remembered one.
export function resolveCxd(href: string, storage: KeyValueStorage | null, now: number): string | null {
  const fromUrl = cxdFromUrl(href);
  if (fromUrl !== null) {
    writeStored(storage, fromUrl, now);
    return fromUrl;
  }
  return readStored(storage, now);
}

export function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
