// Cellxpert sends the affiliate click as ?cxd= on the landing URL. ATFX IT asked (2026-10-16) for
// it in the hidden field CXD_token__c, which the native Elementor forms fill from that request
// parameter on the page being submitted, nothing more.
export const CXD_PARAM = "cxd";

// It reaches Salesforce, so only the token shape Cellxpert emits passes the trust boundary.
const CXD_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function cxdFromUrl(href: string): string | null {
  try {
    const raw = new URL(href).searchParams.get(CXD_PARAM);
    if (raw === null) return null;
    const trimmed = raw.trim();
    return CXD_PATTERN.test(trimmed) ? trimmed : null;
  } catch {
    return null;
  }
}
