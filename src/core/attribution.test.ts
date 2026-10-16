import { describe, expect, it } from "vitest";
import { CXD_STORAGE_KEY, CXD_TTL_MS, cxdFromUrl, resolveCxd, type KeyValueStorage } from "./attribution";

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { readonly data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

const LANDING = "https://www.atfxlatam.com/es/lp-operar-oro/";
const NOW = 1_800_000_000_000;

describe("cxd attribution", () => {
  it("takes cxd from the URL and remembers it", () => {
    const storage = memoryStorage();
    expect(resolveCxd(`${LANDING}?cxd=12345_67890&utm_source=fb`, storage, NOW)).toBe("12345_67890");
    expect(JSON.parse(storage.data.get(CXD_STORAGE_KEY) ?? "null")).toEqual({ value: "12345_67890", savedAt: NOW });
  });

  it("falls back to the remembered cxd when the URL has none", () => {
    const storage = memoryStorage();
    resolveCxd(`${LANDING}?cxd=111_222`, storage, NOW);
    expect(resolveCxd(LANDING, storage, NOW + 1000)).toBe("111_222");
  });

  it("lets a new click replace the remembered one", () => {
    const storage = memoryStorage();
    resolveCxd(`${LANDING}?cxd=old_1`, storage, NOW);
    expect(resolveCxd(`${LANDING}?cxd=new_2`, storage, NOW + 1000)).toBe("new_2");
    expect(resolveCxd(LANDING, storage, NOW + 2000)).toBe("new_2");
  });

  it("drops a remembered cxd older than the attribution window", () => {
    const storage = memoryStorage();
    resolveCxd(`${LANDING}?cxd=111_222`, storage, NOW);
    expect(resolveCxd(LANDING, storage, NOW + CXD_TTL_MS + 1)).toBeNull();
  });

  it("rejects values that are not a Cellxpert token", () => {
    expect(cxdFromUrl(`${LANDING}?cxd=%3Cscript%3E`)).toBeNull();
    expect(cxdFromUrl(`${LANDING}?cxd=${"a".repeat(65)}`)).toBeNull();
    expect(cxdFromUrl(`${LANDING}?cxd=`)).toBeNull();
    const tampered = memoryStorage({ [CXD_STORAGE_KEY]: JSON.stringify({ value: "x y", savedAt: NOW }) });
    expect(resolveCxd(LANDING, tampered, NOW)).toBeNull();
  });

  it("still returns the URL cxd when storage throws", () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(resolveCxd(`${LANDING}?cxd=111_222`, broken, NOW)).toBe("111_222");
    expect(resolveCxd(LANDING, broken, NOW)).toBeNull();
  });
});
