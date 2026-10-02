import { describe, expect, test, vi } from "vitest";
import { buildPayload } from "../contract/payload";
import type { LeadValues, MountAttrs, PayloadEntries } from "../contract/types";
import { parseElementorResponse } from "./response";
import { submitLead } from "./submit";
import elementorSuccessFixtureRaw from "./fixtures/elementor-success.json";
import productionPayloadFixtureRaw from "../contract/fixtures/production-payload.json";

type JsonEntry = readonly [string, string];

function toPayloadEntries(value: ReadonlyArray<ReadonlyArray<string>>): PayloadEntries {
  return value.map((entry) => {
    if (entry.length !== 2) {
      throw new Error("Invalid payload fixture entry length");
    }
    const key = entry[0];
    const fieldValue = entry[1];
    if (key === undefined || fieldValue === undefined) {
      throw new Error("Invalid payload fixture entry value");
    }
    return [key, fieldValue] as const;
  });
}

function toSortedEntries(entries: PayloadEntries): ReadonlyArray<JsonEntry> {
  return [...entries].sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

describe("production fixtures", () => {
  test("parses production success body and submitLead returns ok with aanumber", async () => {
    const parsed = parseElementorResponse(elementorSuccessFixtureRaw);

    expect(parsed).not.toBeNull();

    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(elementorSuccessFixtureRaw));
    const result = await submitLead(
      [
        ["action", "elementor_pro_forms_send_form"],
        ["form_fields[first_name]", "Karentest"],
      ],
      { fetchImpl: fetchMock },
    );

    expect(result).toStrictEqual({ kind: "ok", aanumber: "wpQATEST0000000001" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("buildPayload matches production payload key/value set exactly", () => {
    const attrs: MountAttrs = {
      form: "lead",
      lang: "es",
      theme: "light",
      zoomLink: null,
      webinarTopic: null,
      webinarDate: null,
      webinarTz: null,
      leadSource: "Webinar",
      bdmOwner: null,
      opensAt: null,
      closesAt: null,
      closedUrl: null,
      scheduleInvalid: false,
      country: null,
    };
    const values: LeadValues = {
      firstName: "Karentest",
      lastName: "karentestapellidos",
      email: "test223@karentest.com",
      diallingCode: "52",
      phone: "7373737373",
      country: "MEX",
      choice: "Intermedio",
      accepted: true,
    };
    const page = {
      href: "https://www.atfxlatam.com/es/bono-deposito/",
      title: "training-sessions-25jun - ATFX IT Website Team Site",
    };

    const expectedEntries = toPayloadEntries(productionPayloadFixtureRaw);
    const actualEntries = buildPayload("lead", attrs, values, page);

    expect(toSortedEntries(actualEntries)).toStrictEqual(toSortedEntries(expectedEntries));
  });
});
