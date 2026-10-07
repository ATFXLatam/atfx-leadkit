// @vitest-environment node
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

interface FileEntry {
  readonly path: string;
  readonly integrity: string;
}
interface ReleaseJson {
  readonly version: string;
  readonly commit: string;
  readonly files: Record<string, FileEntry>;
}
interface Release {
  readonly tag: string;
  readonly releaseJson: ReleaseJson | null;
  readonly bytesByName: Map<string, Uint8Array>;
}
interface FakeResponse {
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
}
interface ReleaseModule {
  readonly integrityOf: (bytes: Uint8Array) => string;
  readonly prepareRelease: (input: {
    version: string;
    commit: string;
    manifest: Record<string, { js?: string }>;
    read: (path: string) => Uint8Array;
  }) => { files: (FileEntry & { form: string; bytes: Uint8Array })[]; releaseJson: ReleaseJson };
  readonly renderSnippet: (input: { form: string; path: string; integrity: string; lang?: string }) => string;
  readonly assembleStore: (releases: Release[]) => {
    files: (FileEntry & { bytes: Uint8Array })[];
    index: { versions: string[] };
  };
  readonly smoke: (files: FileEntry[], fetchImpl: (url: string) => Promise<FakeResponse>, origin?: string) => Promise<string[]>;
}

async function load(): Promise<ReleaseModule> {
  // Variable specifier: the .mjs has no type declarations and tsconfig does not allow JS.
  const path = resolve("scripts/release.mjs");
  return (await import(/* @vite-ignore */ path)) as ReleaseModule;
}

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
const MANIFEST = { lead: { js: "assets/lead-AAA111.js" }, interest: { js: "assets/interest-BBB222.js" } };
const read = (path: string): Uint8Array => bytes(`code of ${path}`);

async function release(version: string): Promise<Release & { releaseJson: ReleaseJson }> {
  const { prepareRelease } = await load();
  const { files, releaseJson } = prepareRelease({ version, commit: "abc", manifest: MANIFEST, read });
  const bytesByName = new Map(files.map((file) => [file.path.split("/").pop()!, file.bytes]));
  return { tag: `v${version}`, releaseJson, bytesByName };
}

describe("prepareRelease", () => {
  test("pins each form to its exact version path with the sha384 of its bytes", async () => {
    const { prepareRelease, integrityOf } = await load();
    const { releaseJson } = prepareRelease({ version: "1.2.3", commit: "abc", manifest: MANIFEST, read });
    expect(releaseJson.files.lead).toEqual({
      path: "/releases/1.2.3/lead-AAA111.js",
      integrity: integrityOf(read("assets/lead-AAA111.js")),
    });
    expect(releaseJson.files.interest?.path).toBe("/releases/1.2.3/interest-BBB222.js");
  });

  test("fails when a form is missing from the manifest or the version is a range", async () => {
    const { prepareRelease } = await load();
    expect(() => prepareRelease({ version: "1.2.3", commit: "abc", manifest: { lead: MANIFEST.lead }, read })).toThrow(/interest/);
    expect(() => prepareRelease({ version: "^1.2.3", commit: "abc", manifest: MANIFEST, read })).toThrow(/X\.Y\.Z/);
  });
});

describe("renderSnippet", () => {
  test("puts data-cfasync before src and carries integrity and crossorigin, no module type", async () => {
    const { renderSnippet } = await load();
    const { releaseJson } = await release("1.0.0");
    const html = renderSnippet({ form: "lead", ...releaseJson.files.lead!, lang: "pt" });
    expect(html.indexOf('data-cfasync="false"')).toBeLessThan(html.indexOf("src="));
    expect(html).toContain(`integrity="${releaseJson.files.lead!.integrity}"`);
    expect(html).toContain('crossorigin="anonymous"');
    expect(html).toContain('src="https://atfx-leadkit-cdn.vercel.app/releases/1.0.0/lead-AAA111.js"');
    expect(html).toContain('data-lang="pt"');
    expect(html).not.toContain("type=");
  });

  test("rejects a path without exact version, another form's file, or a non-sha384 integrity", async () => {
    const { renderSnippet } = await load();
    const { releaseJson } = await release("1.0.0");
    const lead = releaseJson.files.lead!;
    expect(() => renderSnippet({ form: "lead", ...lead, path: "/releases/latest/lead-AAA111.js" })).toThrow();
    expect(() => renderSnippet({ form: "interest", ...lead })).toThrow();
    expect(() => renderSnippet({ form: "lead", ...lead, integrity: "sha256-abc" })).toThrow(/sha384/);
  });
});

describe("assembleStore", () => {
  test("keeps every published release and indexes versions in semver order", async () => {
    const { assembleStore } = await load();
    const store = assembleStore([await release("1.10.0"), await release("1.2.0")]);
    expect(store.files.map((file) => file.path)).toHaveLength(4);
    expect(store.index.versions).toEqual(["1.2.0", "1.10.0"]);
  });

  test("fails when stored bytes do not match release.json", async () => {
    const { assembleStore } = await load();
    const tampered = await release("1.0.0");
    const bytesByName = new Map(tampered.bytesByName).set("lead-AAA111.js", bytes("evil"));
    expect(() => assembleStore([{ ...tampered, bytesByName }])).toThrow(/hash distinto/);
  });

  test("fails when a release lacks release.json, a file, or its tag disagrees with the version", async () => {
    const { assembleStore } = await load();
    const ok = await release("1.0.0");
    expect(() => assembleStore([{ ...ok, releaseJson: null }])).toThrow(/release\.json/);
    expect(() => assembleStore([{ ...ok, bytesByName: new Map() }])).toThrow(/falta/);
    expect(() => assembleStore([{ ...ok, tag: "v2.0.0" }])).toThrow(/dice 1\.0\.0/);
  });

  test("fails when two releases claim the same path", async () => {
    const { assembleStore } = await load();
    const ok = await release("1.0.0");
    expect(() => assembleStore([ok, ok])).toThrow(/ruta repetida/);
  });
});

describe("smoke", () => {
  const good: Record<string, string> = {
    "access-control-allow-origin": "*",
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    "content-type": "application/javascript; charset=utf-8",
  };
  const respond = (body: Uint8Array, headers: Record<string, string>) => async (): Promise<FakeResponse> => ({
    status: 200,
    headers: { get: (name) => headers[name] ?? null },
    arrayBuffer: async () => body.slice().buffer,
  });

  test("passes when headers and bytes match", async () => {
    const { smoke, integrityOf } = await load();
    const body = bytes("x");
    expect(await smoke([{ path: "/releases/1.0.0/lead-A.js", integrity: integrityOf(body) }], respond(body, good))).toEqual([]);
  });

  test("reports a missing CORS header and different bytes", async () => {
    const { smoke, integrityOf } = await load();
    const { "access-control-allow-origin": _cors, ...noCors } = good;
    const errors = await smoke([{ path: "/releases/1.0.0/lead-A.js", integrity: integrityOf(bytes("x")) }], respond(bytes("y"), noCors));
    expect(errors.join("\n")).toMatch(/access-control-allow-origin/);
    expect(errors.join("\n")).toMatch(/hash distinto/);
  });
});
