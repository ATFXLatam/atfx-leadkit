import { describe, expect, it } from "vitest";
import { cxdFromUrl } from "./attribution";

const LANDING = "https://www.atfxlatam.com/es/lp-operar-oro/";

describe("cxd attribution", () => {
  it("takes cxd from the landing URL", () => {
    expect(cxdFromUrl(`${LANDING}?cxd=12345_67890&utm_source=fb`)).toBe("12345_67890");
    expect(cxdFromUrl(LANDING)).toBeNull();
  });

  it("rejects values that are not a Cellxpert token", () => {
    expect(cxdFromUrl(`${LANDING}?cxd=%3Cscript%3E`)).toBeNull();
    expect(cxdFromUrl(`${LANDING}?cxd=${"a".repeat(65)}`)).toBeNull();
    expect(cxdFromUrl(`${LANDING}?cxd=`)).toBeNull();
  });
});
