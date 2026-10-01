import { ENDPOINT, toFormData } from "../contract/payload";
import type { PayloadEntries } from "../contract/types";
import { parseElementorResponse } from "./response";

export const SUBMIT_TIMEOUT_MS = 15_000;

export type SubmitResult =
  | {
      readonly kind: "ok";
      readonly aanumber?: string;
    }
  | {
      readonly kind: "rejected";
      readonly fieldErrors: Readonly<Record<string, string>>;
      readonly message?: string;
    }
  | {
      readonly kind: "unknown";
      readonly reason: "timeout" | "network" | "invalid-response";
    };

export async function submitLead(
  entries: PayloadEntries,
  options?: { readonly timeoutMs?: number; readonly fetchImpl?: typeof fetch },
): Promise<SubmitResult> {
  const timeoutMs = options?.timeoutMs ?? SUBMIT_TIMEOUT_MS;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const body = toFormData(entries);
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let receivedResponse = false;
  try {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      body,
      headers: { "X-Requested-With": "XMLHttpRequest" },
      signal: controller.signal,
    });
    receivedResponse = true;

    const responseBody: unknown = await response.json();

    const parsed = parseElementorResponse(responseBody);
    if (parsed === null) {
      return { kind: "unknown", reason: "invalid-response" };
    }

    if (parsed.success) {
      if (parsed.data.data?.aanumber === undefined) {
        return { kind: "ok" };
      }
      return {
        kind: "ok",
        aanumber: parsed.data.data.aanumber,
      };
    }

    if (parsed.data.message === undefined) {
      return {
        kind: "rejected",
        fieldErrors: parsed.data.errors ?? {},
      };
    }

    return {
      kind: "rejected",
      fieldErrors: parsed.data.errors ?? {},
      message: parsed.data.message,
    };
  } catch {
    if (timedOut) {
      return { kind: "unknown", reason: "timeout" };
    }
    if (!receivedResponse) {
      return { kind: "unknown", reason: "network" };
    }
    return { kind: "unknown", reason: "invalid-response" };
  } finally {
    clearTimeout(timeoutId);
  }
}
