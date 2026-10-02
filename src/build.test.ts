// @vitest-environment node
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import * as esbuild from "esbuild";

interface BuildConfig {
  readonly options: esbuild.BuildOptions;
  readonly buildManifest: (metafile: esbuild.Metafile) => Record<string, { js: string }>;
}

async function loadConfig(): Promise<BuildConfig> {
  // Variable specifier: the .mjs has no type declarations and tsconfig does not allow JS.
  const path = resolve("esbuild.config.mjs");
  return (await import(/* @vite-ignore */ path)) as BuildConfig;
}

describe("production build", () => {
  test("emits only js bundles that embed and inject the stylesheet, and a {js} manifest", async () => {
    const { options, buildManifest } = await loadConfig();
    const result = await esbuild.build({ ...options, write: false, plugins: [] });

    expect(result.errors).toHaveLength(0);
    const paths = result.outputFiles!.map((file) => file.path);
    expect(paths.some((path) => path.endsWith(".css"))).toBe(false);
    expect(paths).toHaveLength(2);
    for (const file of result.outputFiles!) {
      expect(file.text).toContain("data-atfx-leadkit-style");
      expect(file.text).toContain("atfx-leadkit-enter");
      expect(file.text).toContain("atfx-leadkit__honeypot-container");
    }

    const manifest = buildManifest(result.metafile!);
    expect(Object.keys(manifest).sort()).toEqual(["interest", "lead"]);
    for (const form of ["lead", "interest"]) {
      expect(Object.keys(manifest[form]!)).toEqual(["js"]);
      expect(manifest[form]!.js).toMatch(new RegExp(`^assets/${form}-[A-Z0-9]+\\.js$`));
    }
  });
});
