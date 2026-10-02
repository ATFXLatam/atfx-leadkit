import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const dev = process.argv.includes("--dev");
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/**
 * @param {import("esbuild").Metafile} metafile
 * @returns {Record<string, { js: string }>}
 */
export function buildManifest(metafile) {
  /** @type {Record<string, { js: string }>} */
  const manifest = {};
  for (const [outfile, meta] of Object.entries(metafile.outputs)) {
    if (!meta.entryPoint) continue;
    const form = meta.entryPoint.split("/").pop()?.replace(/\.ts$/, "");
    if (form !== "lead" && form !== "interest") continue;
    manifest[form] = {
      js: outfile.replace(/^dist\//, ""),
    };
  }
  return manifest;
}

/** @param {import("esbuild").Metafile} metafile */
function writeManifest(metafile) {
  mkdirSync("dist", { recursive: true });
  writeFileSync("dist/manifest.json", `${JSON.stringify(buildManifest(metafile), null, 2)}\n`);
}

/** @type {import("esbuild").BuildOptions} */
export const options = {
  entryPoints: ["src/entries/lead.ts", "src/entries/interest.ts"],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2019",
  entryNames: "[name]-[hash]",
  loader: {
    ".css": "text",
  },
  outdir: "dist/assets",
  metafile: true,
  sourcemap: dev,
  define: {
    __LEADKIT_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    {
      name: "manifest",
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length > 0 || !result.metafile) return;
          writeManifest(result.metafile);
        });
      },
    },
  ],
};

// The test imports this module for the options; only a CLI run may build and wipe dist.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Hashed names do not replace the previous file. A stale asset would still be served.
  rmSync("dist", { recursive: true, force: true });
  if (dev) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    const server = await ctx.serve({
      host: "127.0.0.1",
      servedir: "dist",
      port: 8765,
    });
    console.log(`dev http://${server.hosts[0] ?? "127.0.0.1"}:${server.port}`);
  } else {
    await esbuild.build(options);
  }
}
