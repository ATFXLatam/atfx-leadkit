import type { FormKey } from "../contract/types";

export type IntegrationHook = (event: { readonly aanumber?: string; readonly form: FormKey }) => void;

type HookEvent = Parameters<IntegrationHook>[0];

export function runIntegrations(hooks: readonly IntegrationHook[], event: HookEvent): void {
  for (const hook of hooks) {
    isolate(hook, event);
  }
}

function isolate(hook: IntegrationHook, event: HookEvent): void {
  try {
    const result: unknown = hook(event);
    if (!isThenable(result)) return;
    void Promise.resolve(result).catch(() => undefined);
  } catch {
    // A pixel that throws must not undo a registration that already succeeded.
  }
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as { then?: unknown } | undefined)?.then === "function";
}

function readGlobal(name: string): unknown {
  return (globalThis as Record<string, unknown>)[name];
}

function trackGtag(event: HookEvent): void {
  const gtag = readGlobal("gtag");
  if (typeof gtag !== "function") return;
  if (event.aanumber === undefined) {
    gtag("event", "generate_lead", {});
    return;
  }
  gtag("event", "generate_lead", { transaction_id: event.aanumber });
}

function trackDataLayer(event: HookEvent): void {
  const dataLayer = readGlobal("dataLayer");
  if (!Array.isArray(dataLayer)) return;
  if (event.aanumber === undefined) {
    dataLayer.push({ event: "atfx_lead" });
    return;
  }
  dataLayer.push({ event: "atfx_lead", aanumber: event.aanumber });
}

function trackFbq(event: HookEvent): void {
  const fbq = readGlobal("fbq");
  if (typeof fbq !== "function") return;
  if (event.aanumber === undefined) {
    fbq("track", "Lead", {});
    return;
  }
  fbq("track", "Lead", {}, { eventID: event.aanumber });
}

export const DEFAULT_INTEGRATIONS: readonly IntegrationHook[] = [trackGtag, trackDataLayer, trackFbq];
