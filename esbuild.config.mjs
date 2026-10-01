import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as esbuild from "esbuild";

const dev = process.argv.includes("--dev");
// Hashed names do not replace the previous file. A stale asset would still be served.
rmSync("dist", { recursive: true, force: true });
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @param {import("esbuild").Metafile} metafile */
function writeManifest(metafile) {
  /** @type {Record<string, { js: string; css: string }>} */
  const manifest = {};
  for (const [outfile, meta] of Object.entries(metafile.outputs)) {
    if (!meta.entryPoint) continue;
    const form = meta.entryPoint.split("/").pop()?.replace(/\.ts$/, "");
    if (form !== "lead" && form !== "interest") continue;
    manifest[form] = {
      js: outfile.replace(/^dist\//, ""),
      css: meta.cssBundle ? meta.cssBundle.replace(/^dist\//, "") : "",
    };
  }
  mkdirSync("dist", { recursive: true });
  writeFileSync("dist/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
}

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: ["src/entries/lead.ts", "src/entries/interest.ts"],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2019",
  entryNames: "[name]-[hash]",
  outdir: "dist/assets",
  metafile: true,
  sourcemap: dev,
  define: {
    __LEADKIT_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    {
      // No CSS file belongs to this session. The entry import still has to
      // produce a sibling stylesheet so the manifest shape stays stable.
      name: "placeholder-css",
      setup(build) {
        build.onResolve({ filter: /^\.\/(lead|interest)\.css$/ }, (args) => {
          const path = resolve(dirname(args.importer), args.path);
          if (existsSync(path)) return null;
          return { path, namespace: "placeholder-css" };
        });
        build.onLoad({ filter: /.*/, namespace: "placeholder-css" }, () => ({
          contents: ".atfx-leadkit{--atfx-placeholder:0}\n",
          loader: "css",
        }));
      },
    },
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
