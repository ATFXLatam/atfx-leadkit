import { describe, expect, test, vi } from "vitest";
import { UnknownFormError, parseMountAttrs } from "./attrs";
import { parseIsoWithZone } from "./time";
import { safeClosedUrl, safeZoomLink } from "./url";

describe("safeZoomLink", () => {
  test("accepts only https zoom.us absolute urls", () => {
    expect(safeZoomLink("https://atfx.zoom.us/webinar/register/WN_x")).toBe(
      "https://atfx.zoom.us/webinar/register/WN_x",
    );
    expect(safeZoomLink("https://zoom.us/j/1")).toBe("https://zoom.us/j/1");
    expect(safeZoomLink("https://zoom.us")).toBe("https://zoom.us/");
    expect(safeZoomLink("https://ZOOM.US/x")).toBe("https://zoom.us/x");
  });

  test("rejects unsafe protocols, malformed authorities, wrong hosts, credentials and ports", () => {
    const invalidCases = [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,test",
      "http://zoom.us/j/1",
      "https://zoom.us.evil.com/",
      "https://evilzoom.us/",
      "//zoom.us/x",
      "https:zoom.us/j/1",
      "https://",
      "/relative",
      "",
      "https://user:pass@zoom.us/j/1",
      "https://x@atfx.zoom.us/",
      "https://@zoom.us/j/1",
      "https://zoom.us:443/j/1",
      "https://zoom.us:8443/j/1",
      "https://zoom.us./j/1",
      "https://x.zoom.us./j/1",
      "https://zoom.us%2Eevil.com",
      "https:\\zoom.us",
      "https://zoom.us.evil.com",
      "https://zo\tom.us.evil.com/j/1",
      "https://zoom.us\r\n.evil.com/j/1",
      "https://xn--zm-fmca.us/j/1",
    ];

    for (const value of invalidCases) {
      expect(safeZoomLink(value)).toBeNull();
    }
  });
});

describe("safeClosedUrl", () => {
  const pageUrl = "https://www.atfxlatam.com/landings/demo";

  test("accepts same-page host over https", () => {
    expect(safeClosedUrl("https://www.atfxlatam.com/thanks", pageUrl)).toBe(
      "https://www.atfxlatam.com/thanks",
    );
    expect(safeClosedUrl("https://WWW.ATFXLATAM.COM/thanks", pageUrl)).toBe(
      "https://www.atfxlatam.com/thanks",
    );
  });

  test("accepts allowlisted https host", () => {
    expect(
      safeClosedUrl("https://go.atfx.com/exit", pageUrl, ["go.atfx.com", "offers.atfx.com"]),
    ).toBe("https://go.atfx.com/exit");
  });

  test("handles ipv6 authorities and still rejects explicit ports", () => {
    expect(safeClosedUrl("https://[::1]/thanks", "https://[::1]/landing")).toBe("https://[::1]/thanks");
    expect(safeClosedUrl("https://[::1]:443/thanks", "https://[::1]/landing")).toBeNull();
  });

  test("rejects non-https, relative, non-allowlisted, subdomains, credentials and ports", () => {
    const invalidCases = [
      "http://www.atfxlatam.com/thanks",
      "javascript:alert(1)",
      "https://",
      "/relative",
      "https://evil.example/thanks",
      "https://www.atfxlatam.com.evil.com/thanks",
      "https://sub.www.atfxlatam.com/thanks",
      "https://user@www.atfxlatam.com/thanks",
      "https://@www.atfxlatam.com/thanks",
      "https://user:pass@www.atfxlatam.com/thanks",
      "https://www.atfxlatam.com:443/thanks",
      "https://www.atfxlatam.com:8443/thanks",
      "https://go.atfx.com:443/thanks",
    ];

    for (const value of invalidCases) {
      expect(safeClosedUrl(value, pageUrl, ["go.atfx.com"])).toBeNull();
    }
  });
});

describe("parseIsoWithZone", () => {
  test("parses valid iso with explicit zone", () => {
    expect(parseIsoWithZone("2026-10-06T18:00:00-05:00")).toBe(Date.parse("2026-10-06T18:00:00-05:00"));
    expect(parseIsoWithZone("2026-10-06T18:00:00Z")).toBe(Date.parse("2026-10-06T18:00:00Z"));
    expect(parseIsoWithZone("2000-02-29T18:00:00Z")).toBe(Date.parse("2000-02-29T18:00:00Z"));
  });

  test("rejects malformed, zone-less and impossible dates", () => {
    const invalidCases = [
      "2026-10-06 18:00",
      "2026-10-06T18:00:00",
      "2026-13-01T00:00:00Z",
      "2026-02-30T00:00:00Z",
      "2026-04-31T00:00:00Z",
      "2100-02-29T00:00:00Z",
      "2026-10-06T24:00:00Z",
      "2026-10-06T18:00:00+24:00",
    ];

    for (const value of invalidCases) {
      expect(parseIsoWithZone(value)).toBeNull();
    }
  });

  test("returns null when Date.parse reports NaN", () => {
    const parseSpy = vi.spyOn(Date, "parse").mockReturnValue(Number.NaN);
    expect(parseIsoWithZone("2026-10-06T18:00:00Z")).toBeNull();
    parseSpy.mockRestore();
  });
});

describe("parseMountAttrs", () => {
  const context = {
    pageUrl: "https://www.atfxlatam.com/landings/demo",
    closedUrlAllowlist: ["go.atfx.com"],
  } as const;

  test("parses and normalizes all supported attributes", () => {
    const attrs = parseMountAttrs(
      {
        atfxLeadkit: "lead",
        lang: "pt_BR",
        theme: "dark",
        zoomLink: "https://atfx.zoom.us/webinar/register/WN_x",
        webinarTopic: `  ${"T".repeat(130)}  `,
        webinarDate: "2026-10-06 18:00:00",
        webinarTz: "america/mexico_city",
        leadSource: "Website",
        bdmOwner: "005ABC123DEF456XYZ",
        opensAt: "2026-10-01T12:00:00-05:00",
        closesAt: "2026-10-10T12:00:00-05:00",
        closedUrl: "https://go.atfx.com/exit",
        country: "MX",
      },
      context,
    );

    expect(attrs).toEqual({
      form: "lead",
      lang: "pt",
      theme: "dark",
      zoomLink: "https://atfx.zoom.us/webinar/register/WN_x",
      webinarTopic: "T".repeat(120),
      webinarDate: "2026-10-06 18:00:00",
      webinarTz: "america/mexico_city",
      leadSource: "Website",
      bdmOwner: "005ABC123DEF456XYZ",
      opensAt: Date.parse("2026-10-01T12:00:00-05:00"),
      closesAt: Date.parse("2026-10-10T12:00:00-05:00"),
      closedUrl: "https://go.atfx.com/exit",
      scheduleInvalid: false,
      country: "MX",
    });
  });

  test("throws UnknownFormError for unknown form", () => {
    expect(() =>
      parseMountAttrs(
        {
          atfxLeadkit: "unknown",
        },
        context,
      ),
    ).toThrow(UnknownFormError);
  });

  test("throws UnknownFormError for missing form attribute", () => {
    try {
      parseMountAttrs({}, context);
      throw new Error("expected parseMountAttrs to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownFormError);
      expect((error as UnknownFormError).value).toBeNull();
    }
  });

  test("normalizes lang variants and falls back to es", () => {
    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          lang: "pt-BR",
        },
        context,
      ).lang,
    ).toBe("pt");

    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          lang: "EN",
        },
        context,
      ).lang,
    ).toBe("en");

    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          lang: "fr",
        },
        context,
      ).lang,
    ).toBe("es");
  });

  test("sets null for empty or whitespace attributes", () => {
    const attrs = parseMountAttrs(
      {
        atfxLeadkit: "interest",
        zoomLink: "   ",
        webinarTopic: "",
        webinarDate: "   ",
        webinarTz: " ",
        leadSource: "  ",
        bdmOwner: "",
        opensAt: " ",
        closesAt: "",
        closedUrl: "   ",
        country: " ",
      },
      context,
    );

    expect(attrs.form).toBe("interest");
    expect(attrs.zoomLink).toBeNull();
    expect(attrs.webinarTopic).toBeNull();
    expect(attrs.webinarDate).toBeNull();
    expect(attrs.webinarTz).toBeNull();
    expect(attrs.leadSource).toBeNull();
    expect(attrs.bdmOwner).toBeNull();
    expect(attrs.opensAt).toBeNull();
    expect(attrs.closesAt).toBeNull();
    expect(attrs.closedUrl).toBeNull();
    expect(attrs.country).toBeNull();
    expect(attrs.scheduleInvalid).toBe(false);
  });

  test("marks scheduleInvalid and warns when opensAt or closesAt are invalid", () => {
    const warn = vi.fn<(message: string) => void>();

    const attrs = parseMountAttrs(
      {
        atfxLeadkit: "lead",
        opensAt: "2026-10-06T18:00:00",
        closesAt: "bad-close",
      },
      context,
      warn,
    );

    expect(attrs.opensAt).toBeNull();
    expect(attrs.closesAt).toBeNull();
    expect(attrs.scheduleInvalid).toBe(true);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]?.[0]).toContain("data-opensAt");
    expect(warn.mock.calls[1]?.[0]).toContain("data-closesAt");
  });

  test("does not warn when opensAt and closesAt are valid", () => {
    const warn = vi.fn<(message: string) => void>();

    const attrs = parseMountAttrs(
      {
        atfxLeadkit: "lead",
        opensAt: "2026-10-06T18:00:00Z",
        closesAt: "2026-10-07T18:00:00-05:00",
      },
      context,
      warn,
    );

    expect(attrs.opensAt).toBe(Date.parse("2026-10-06T18:00:00Z"));
    expect(attrs.closesAt).toBe(Date.parse("2026-10-07T18:00:00-05:00"));
    expect(attrs.scheduleInvalid).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  test("warn output clips at 120 chars without breaking surrogate pairs", () => {
    const warn = vi.fn<(message: string) => void>();
    const longInvalid = `${"x".repeat(116)}😀ABCD`;

    parseMountAttrs(
      {
        atfxLeadkit: "lead",
        closesAt: longInvalid,
      },
      context,
      warn,
    );

    expect(warn).toHaveBeenCalledOnce();
    const message = warn.mock.calls[0]?.[0] ?? "";
    const clipped = message.split(": ")[1] ?? "";
    expect(clipped).toBe(`${"x".repeat(116)}😀...`);
    expect(clipped).not.toContain(longInvalid);
  });

  test("applies field-level validation from RF-05 and Karen decisions", () => {
    const attrs = parseMountAttrs(
      {
        atfxLeadkit: "lead",
        theme: "unexpected",
        zoomLink: "https://evilzoom.us/",
        webinarDate: "2026-13-99 99:99:99",
        webinarTz: "Invalid/Zone",
        bdmOwner: "006ABC",
        closedUrl: "https://evil.example/closed",
        country: "XX",
      },
      context,
    );

    expect(attrs.theme).toBe("light");
    expect(attrs.zoomLink).toBeNull();
    expect(attrs.webinarDate).toBeNull();
    expect(attrs.webinarTz).toBeNull();
    expect(attrs.bdmOwner).toBeNull();
    expect(attrs.closedUrl).toBeNull();
    expect(attrs.country).toBeNull();
  });

  test("accepts country in lowercase and normalizes to uppercase", () => {
    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          country: "mx",
        },
        context,
      ).country,
    ).toBe("MX");
  });

  test("uses defaults when lang or theme contain only spaces", () => {
    const attrs = parseMountAttrs(
      {
        atfxLeadkit: "lead",
        lang: "   ",
        theme: "   ",
      },
      context,
    );

    expect(attrs.lang).toBe("es");
    expect(attrs.theme).toBe("light");
  });

  test("rejects webinar date values with invalid time and impossible day", () => {
    const invalidDates = [
      "2026-10-06 24:00:00",
      "2026-10-06 10:60:00",
      "2026-10-06 10:00:60",
      "2026-02-30 10:00:00",
    ];

    for (const webinarDate of invalidDates) {
      expect(
        parseMountAttrs(
          {
            atfxLeadkit: "lead",
            webinarDate,
          },
          context,
        ).webinarDate,
      ).toBeNull();
    }
  });

  test("validates webinar timezone and preserves original iana value", () => {
    const attrs = parseMountAttrs(
      {
        atfxLeadkit: "lead",
        webinarTz: "Asia/Calcutta",
      },
      context,
    );

    expect(attrs.webinarTz).toBe("Asia/Calcutta");
    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          webinarTz: "america/mexico_city",
        },
        context,
      ).webinarTz,
    ).toBe("america/mexico_city");
  });

  test("rejects webinar timezone offsets", () => {
    const invalidZones = ["+01:00", "-05", "05:00"];
    for (const webinarTz of invalidZones) {
      expect(
        parseMountAttrs(
          {
            atfxLeadkit: "lead",
            webinarTz,
          },
          context,
        ).webinarTz,
      ).toBeNull();
    }
  });

  test("accepts bdmOwner with 15 chars and 005 prefix", () => {
    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          bdmOwner: "005ABC123DEF456",
        },
        context,
      ).bdmOwner,
    ).toBe("005ABC123DEF456");
  });

  test("rejects bdmOwner with invalid prefix, length or characters", () => {
    const invalidOwners = [
      "006ABC123DEF456",
      "006ABC123DEF456XYZ",
      "005ABC123DEF4567",
      "005ABC123DEF-56",
    ];

    for (const bdmOwner of invalidOwners) {
      expect(
        parseMountAttrs(
          {
            atfxLeadkit: "lead",
            bdmOwner,
          },
          context,
        ).bdmOwner,
      ).toBeNull();
    }
  });

  test("clips webinar topic to 120 code points without breaking emoji", () => {
    const webinarTopic = `${"t".repeat(119)}😀tail`;
    const attrs = parseMountAttrs(
      {
        atfxLeadkit: "lead",
        webinarTopic,
      },
      context,
    );

    expect(attrs.webinarTopic).toBe(`${"t".repeat(119)}😀`);
  });

  test("rejects non-leap and impossible webinar dates", () => {
    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          webinarDate: "2026-13-01 10:00:00",
        },
        context,
      ).webinarDate,
    ).toBeNull();

    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          webinarDate: "2100-02-29 10:00:00",
        },
        context,
      ).webinarDate,
    ).toBeNull();

    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          webinarDate: "2026-04-31 10:00:00",
        },
        context,
      ).webinarDate,
    ).toBeNull();
  });

  test("accepts leap-day webinar dates for leap years", () => {
    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          webinarDate: "2024-02-29 10:00:00",
        },
        context,
      ).webinarDate,
    ).toBe("2024-02-29 10:00:00");

    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          webinarDate: "2000-02-29 10:00:00",
        },
        context,
      ).webinarDate,
    ).toBe("2000-02-29 10:00:00");
  });

  test("rejects invalid country patterns", () => {
    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          country: "A1",
        },
        context,
      ).country,
    ).toBeNull();
  });

  test("maps cloudflare no-country markers to null", () => {
    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          country: "XX",
        },
        context,
      ).country,
    ).toBeNull();

    expect(
      parseMountAttrs(
        {
          atfxLeadkit: "lead",
          country: "T1",
        },
        context,
      ).country,
    ).toBeNull();
  });
});
