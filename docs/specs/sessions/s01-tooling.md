# s1 — Tooling

Estado: HECHA (PR #1). Depende de: s0.

## Objetivo

Que `typecheck`, `test`, `test:cov` y `build` funcionen sobre un repo casi vacío, con un bundle
autocontenido por formulario y nombres con hash.

## Archivos (solo estos)

- `tsconfig.json`
- `esbuild.config.mjs`
- `vitest.config.ts`
- `package.json` (solo la sección `scripts`)
- `src/entries/lead.ts` y `src/entries/interest.ts` (placeholders de una línea que exportan nada)
- `src/smoke.test.ts`

## Requisitos

- `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`,
  `target: "ES2019"`, `module: "ESNext"`, `moduleResolution: "Bundler"`, `lib: ["ES2020","DOM","DOM.Iterable"]`,
  `noEmit: true`.
- `esbuild.config.mjs`:
  - entries `src/entries/lead.ts` y `src/entries/interest.ts`, `bundle`, `minify`, `format: "iife"`,
    `target: "es2019"`, `entryNames: "[name]-[hash]"`, `outdir: "dist/assets"`, `metafile: true`.
  - Sin archivo CSS de salida: el CSS se importa como texto desde cada entry (`loader: ".css" => "text"`),
    y luego se inyecta en runtime una sola vez con `<style data-atfx-style="<form>">`.
  - `sourcemap`: solo con `--dev`. El build de release no genera mapas.
  - `--dev`: watch + `serve({ host: "127.0.0.1", servedir: "dist", port: 8765 })`. Nunca `servedir: "."`.
  - Escribe `dist/manifest.json` con `{ "<form>": { "js": "..." } }` a partir del
    metafile (lo usa s14).
  - Inyecta `__LEADKIT_VERSION__` con `define` desde `package.json`.
- `vitest.config.ts`: `environment: "jsdom"`, `include: ["src/**/*.test.ts"]`, cobertura v8 con
  umbral global 80 % en líneas, ramas, funciones y statements; excluye `src/entries/**`.
- Scripts: `typecheck`, `test` (`vitest run`), `test:watch`, `test:cov`, `build`, `dev`.

## Tests primero

`src/smoke.test.ts`: un test que importe `vitest` y verifique `typeof document !== "undefined"`
(confirma jsdom).

## Criterios

- `npm run typecheck && npm test && npm run build` termina en 0.
- `dist/assets/` contiene `lead-<hash>.js` e `interest-<hash>.js`; no hay `.map`.
- `dist/manifest.json` existe y lista ambos formularios con su JS.

## Fuera de alcance

Playwright (s13), CI (s14).
