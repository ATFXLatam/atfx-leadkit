function parseAbsoluteUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function isHttpsAbsolute(raw: string): boolean {
  return /^https:\/\//i.test(raw);
}

function extractAuthority(raw: string): string | null {
  const afterScheme = raw.slice("https://".length);
  const stopIndex = afterScheme.search(/[/?#]/);
  const authority = stopIndex === -1 ? afterScheme : afterScheme.slice(0, stopIndex);
  return authority === "" ? null : authority;
}

function hostSection(authority: string): string {
  return authority.replace(/^.*@/, "");
}

function hasUnsafeAuthority(authority: string): boolean {
  return /[\\\u0000-\u001F\u007F]/.test(authority);
}

function hasMalformedHost(authority: string): boolean {
  const host = hostSection(authority);
  return host.endsWith(".") || host.includes("%");
}

function hasExplicitUserInfo(raw: string): boolean {
  const authority = extractAuthority(raw);
  return authority !== null && authority.includes("@");
}

function hasExplicitPort(raw: string): boolean {
  const authority = extractAuthority(raw);
  if (authority === null) {
    return false;
  }
  const host = hostSection(authority);
  if (host.startsWith("[")) {
    return /\]:\d+$/.test(host);
  }
  return /:\d+$/.test(host);
}

function hasCredentialsOrPort(raw: string, url: URL): boolean {
  return (
    hasExplicitUserInfo(raw) ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    hasExplicitPort(raw)
  );
}

export function safeZoomLink(raw: string): string | null {
  const normalizedRaw = raw.trim();
  if (!isHttpsAbsolute(normalizedRaw)) {
    return null;
  }
  const authority = extractAuthority(normalizedRaw);
  if (authority === null || hasUnsafeAuthority(authority) || hasMalformedHost(authority)) {
    return null;
  }
  const url = parseAbsoluteUrl(normalizedRaw);
  if (url === null) {
    return null;
  }
  const hostname = url.hostname.toLowerCase();
  const isZoomHost = hostname === "zoom.us" || hostname.endsWith(".zoom.us");
  if (!isZoomHost || hasCredentialsOrPort(normalizedRaw, url)) {
    return null;
  }
  return url.toString();
}

export function safeClosedUrl(
  raw: string,
  pageUrl: string,
  allowedHosts: ReadonlyArray<string> = [],
): string | null {
  const normalizedRaw = raw.trim();
  if (!isHttpsAbsolute(normalizedRaw)) {
    return null;
  }
  const authority = extractAuthority(normalizedRaw);
  if (authority === null || hasUnsafeAuthority(authority) || hasMalformedHost(authority)) {
    return null;
  }
  const candidate = parseAbsoluteUrl(normalizedRaw);
  const page = parseAbsoluteUrl(pageUrl);
  if (candidate === null || page === null) {
    return null;
  }
  if (hasCredentialsOrPort(normalizedRaw, candidate)) {
    return null;
  }

  const candidateHost = candidate.hostname.toLowerCase();
  const pageHost = page.hostname.toLowerCase();
  if (candidateHost === pageHost) {
    return candidate.toString();
  }

  const normalizedAllowlist = new Set(
    allowedHosts.map((host) => host.trim().toLowerCase()).filter((host) => host !== ""),
  );
  if (!normalizedAllowlist.has(candidateHost)) {
    return null;
  }
  return candidate.toString();
}
