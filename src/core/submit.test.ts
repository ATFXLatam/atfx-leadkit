import { afterEach, describe, expect, test, vi } from "vitest";
import * as payload from "../contract/payload";
import type { PayloadEntries } from "../contract/types";
import { SUBMIT_TIMEOUT_MS, submitLead } from "./submit";

const entries: PayloadEntries = [
  ["action", "elementor_pro_forms_send_form"],
  ["form_fields[first_name]", "Karen"],
  ["form_fields[last_name]", "Lopez"],
];

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("submitLead", () => {
  test("sends one POST with endpoint, header and exact FormData body", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        jsonResponse({
          success: true,
          data: {
            data: {
              aanumber: "AA-12345",
            },
          },
        }),
    );

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toEqual({ kind: "ok", aanumber: "AA-12345" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [input, init] = fetchMock.mock.calls[0]!;
    expect(input).toBe(payload.ENDPOINT);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "X-Requested-With": "XMLHttpRequest" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.body).toBeInstanceOf(FormData);
    expect(Array.from((init?.body as FormData).entries())).toEqual(entries);
  });

  test("returns unknown timeout after 15 seconds and does not retry", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn<typeof fetch>(
      async (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    const resultPromise = submitLead(entries, { fetchImpl: fetchMock });
    await vi.advanceTimersByTimeAsync(SUBMIT_TIMEOUT_MS);

    await expect(resultPromise).resolves.toEqual({ kind: "unknown", reason: "timeout" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("returns unknown timeout when json body never resolves before 15 seconds", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
      const signal = init?.signal;
      return {
        json: () =>
          new Promise((_resolve, reject) => {
            signal?.addEventListener("abort", () => {
              reject(new DOMException("aborted", "AbortError"));
            });
          }),
      } as Response;
    });

    const resultPromise = submitLead(entries, { fetchImpl: fetchMock });
    await vi.advanceTimersByTimeAsync(SUBMIT_TIMEOUT_MS);

    await expect(resultPromise).resolves.toEqual({ kind: "unknown", reason: "timeout" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("keeps timeout promise pending at SUBMIT_TIMEOUT_MS - 1", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn<typeof fetch>(
      async (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    const resultPromise = submitLead(entries, { fetchImpl: fetchMock });
    let settled = false;
    void resultPromise.finally(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(SUBMIT_TIMEOUT_MS - 1);

    expect(settled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(resultPromise).resolves.toEqual({ kind: "unknown", reason: "timeout" });
    expect(vi.getTimerCount()).toBe(0);
  });

  test("keeps timeout promise pending at custom timeoutMs - 1", async () => {
    vi.useFakeTimers();
    const timeoutMs = 1234;

    const fetchMock = vi.fn<typeof fetch>(
      async (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    const resultPromise = submitLead(entries, { fetchImpl: fetchMock, timeoutMs });
    let settled = false;
    void resultPromise.finally(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(timeoutMs - 1);

    expect(settled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(resultPromise).resolves.toEqual({ kind: "unknown", reason: "timeout" });
    expect(vi.getTimerCount()).toBe(0);
  });

  test("returns unknown invalid-response for html body", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response("<html>bad gateway</html>", {
          status: 502,
          headers: { "content-type": "text/html" },
        }),
    );

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toEqual({ kind: "unknown", reason: "invalid-response" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("returns unknown invalid-response for body 0", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(0));

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toEqual({ kind: "unknown", reason: "invalid-response" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("returns unknown invalid-response for body -1", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(-1));

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toEqual({ kind: "unknown", reason: "invalid-response" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("returns unknown invalid-response when body misses success", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ data: {} }));

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toEqual({ kind: "unknown", reason: "invalid-response" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("accepts [] in data as empty object", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        jsonResponse({
          success: true,
          data: [],
        }),
    );

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toEqual({ kind: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("accepts [] in data.errors as empty object", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        jsonResponse({
          success: false,
          data: {
            message: "Please check your data",
            errors: [],
          },
        }),
    );

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toEqual({
      kind: "rejected",
      message: "Please check your data",
      fieldErrors: {},
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("accepts [] in data.data as empty object", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        jsonResponse({
          success: true,
          data: {
            data: [],
          },
        }),
    );

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toEqual({ kind: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("rejects non-empty array in data", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        jsonResponse({
          success: true,
          data: ["not-empty"],
        }),
    );

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toEqual({ kind: "unknown", reason: "invalid-response" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("rejects non-empty array in data.errors", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        jsonResponse({
          success: false,
          data: {
            errors: ["not-empty"],
          },
        }),
    );

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toEqual({ kind: "unknown", reason: "invalid-response" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("rejects non-empty array in data.data", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        jsonResponse({
          success: true,
          data: {
            data: ["not-empty"],
          },
        }),
    );

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toEqual({ kind: "unknown", reason: "invalid-response" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("returns unknown network when fetch rejects and does not retry", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Promise.reject(new Error("network down")));

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toEqual({ kind: "unknown", reason: "network" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("does not classify body-construction failures as network", async () => {
    vi.useFakeTimers();

    vi.spyOn(payload, "toFormData").mockImplementation(() => {
      throw new Error("invalid payload");
    });
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ success: true, data: {} }));

    await expect(submitLead(entries, { fetchImpl: fetchMock })).rejects.toThrow("invalid payload");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  test("maps success false with HTTP 200 body to rejected", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            data: {
              message: "Please check your data",
              errors: {
                first_name: "Required",
                email: "Invalid",
              },
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    );

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toEqual({
      kind: "rejected",
      message: "Please check your data",
      fieldErrors: {
        first_name: "Required",
        email: "Invalid",
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("returns rejected without message when only field errors are present", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        jsonResponse({
          success: false,
          data: {
            errors: {
              email: "Invalid",
            },
          },
        }),
    );

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toStrictEqual({
      kind: "rejected",
      fieldErrors: {
        email: "Invalid",
      },
    });
  });

  test("returns rejected without message when success false and data is empty", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        jsonResponse({
          success: false,
          data: {},
        }),
    );

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toStrictEqual({
      kind: "rejected",
      fieldErrors: {},
    });
  });

  test("returns ok without aanumber when success true and data is empty object", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        jsonResponse({
          success: true,
          data: {},
        }),
    );

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toStrictEqual({ kind: "ok" });
  });

  test("returns ok without aanumber when success true and nested data is empty object", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        jsonResponse({
          success: true,
          data: {
            data: {},
          },
        }),
    );

    const result = await submitLead(entries, { fetchImpl: fetchMock });

    expect(result).toStrictEqual({ kind: "ok" });
  });

  test("cleans timeout timer after ok response", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        jsonResponse({
          success: true,
          data: {
            data: {
              aanumber: "AA-12345",
            },
          },
        }),
    );

    await expect(submitLead(entries, { fetchImpl: fetchMock })).resolves.toEqual({
      kind: "ok",
      aanumber: "AA-12345",
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  test("cleans timeout timer after rejected response", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        jsonResponse({
          success: false,
          data: {
            errors: {
              email: "Invalid",
            },
          },
        }),
    );

    await expect(submitLead(entries, { fetchImpl: fetchMock })).resolves.toEqual({
      kind: "rejected",
      fieldErrors: {
        email: "Invalid",
      },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  test("cleans timeout timer after network error", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn<typeof fetch>(async () => Promise.reject(new Error("network down")));

    await expect(submitLead(entries, { fetchImpl: fetchMock })).resolves.toEqual({
      kind: "unknown",
      reason: "network",
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  test("cleans timeout timer after invalid response", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response("<html>bad gateway</html>", {
          status: 502,
          headers: { "content-type": "text/html" },
        }),
    );

    await expect(submitLead(entries, { fetchImpl: fetchMock })).resolves.toEqual({
      kind: "unknown",
      reason: "invalid-response",
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  test("cleans timeout timer after timeout result", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn<typeof fetch>(
      async (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    const resultPromise = submitLead(entries, { fetchImpl: fetchMock });
    await vi.advanceTimersByTimeAsync(SUBMIT_TIMEOUT_MS);

    await expect(resultPromise).resolves.toEqual({ kind: "unknown", reason: "timeout" });
    expect(vi.getTimerCount()).toBe(0);
  });
});
