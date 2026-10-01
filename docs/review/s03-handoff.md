# s03 — handoff

## Archivos
- creado/modificado: `src/core/url.ts`
- creado/modificado: `src/core/time.ts`
- creado/modificado: `src/core/attrs.ts`
- creado/modificado: `src/core/attrs.test.ts`

## RED
`npx vitest run src/core/attrs.test.ts`

```text
RUN  v5.0.3 /Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit-wt-cursor

❯ src/core/attrs.test.ts (0 test)

FAIL  src/core/attrs.test.ts [ src/core/attrs.test.ts ]
Error: Failed to resolve import "./attrs" from "src/core/attrs.test.ts". Does the file exist?
Plugin: vite:import-analysis
File: /Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit-wt-cursor/src/core/attrs.test.ts:2:50
```

## GREEN
`npm run typecheck && npx vitest run --coverage`

```text
> atfx-leadkit@0.0.0 typecheck
> tsc --noEmit

RUN  v5.0.3 /Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit-wt-cursor
Coverage enabled with v8

Test Files  6 passed (6)
Tests       79 passed (79)

% Coverage report from v8
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |     100 |    98.92 |     100 |     100 |
core               |     100 |    98.71 |     100 |     100 |
submit.ts          |     100 |       90 |     100 |     100 |
-------------------|---------|----------|---------|---------|
```

## Cobertura
| Archivo | Statements | Branches | Funcs | Lines |
|---|---:|---:|---:|---:|
| `src/core/url.ts` | 100.00% (42/42) | 100.00% (31/31) | 100.00% (8/8) | 100.00% (41/41) |
| `src/core/time.ts` | 100.00% (25/25) | 100.00% (26/26) | 100.00% (3/3) | 100.00% (25/25) |
| `src/core/attrs.ts` | 100.00% (72/72) | 100.00% (73/73) | 100.00% (12/12) | 100.00% (72/72) |

## Criterios cubiertos
- CA-04 (parte pura): `safeZoomLink` rechaza `javascript:`, `data:`, `http`, host no zoom, relativas, credenciales y puertos explícitos; `safeClosedUrl` aplica allowlist estricta.
- CA-05: `parseMountAttrs` normaliza idioma (`pt-BR`, `pt_BR`, `EN`) y fallback a `es`.
- CA-06: `parseMountAttrs` invalida `data-bdm-owner` fuera del patrón `005...` y deja `bdmOwner: null`.
- CA-20 (parte pura): `parseIsoWithZone` exige offset explícito y `parseMountAttrs` marca `scheduleInvalid: true` + `warn` cuando `data-opens-at`/`data-closes-at` no parsean.
- Decisiones de Karen s03: `XX`/`T1` -> `country: null`, `data-webinar-date` imposible -> `null`, `data-webinar-tz` offset (`+01:00`) -> `null`, puertos/credenciales rechazados.

## Desviaciones y preguntas
- Ninguna.

## Ronda 2

### RED
`npx vitest run src/core/attrs.test.ts`

```text
RUN  v5.0.3 /Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit-wt-cursor

❯ src/core/attrs.test.ts (30 tests | 4 failed)
  × parseMountAttrs > parses and normalizes all supported attributes
  × parseMountAttrs > warn output clips at 120 chars without breaking surrogate pairs
  × parseMountAttrs > validates webinar timezone and preserves original iana value
  × parseMountAttrs > clips webinar topic to 120 code points without breaking emoji
```

### GREEN
`npm run typecheck && npx vitest run --coverage`

```text
> atfx-leadkit@0.0.0 typecheck
> tsc --noEmit

RUN  v5.0.3 /Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit-wt-cursor
Coverage enabled with v8

Test Files  6 passed (6)
Tests       88 passed (88)

% Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |    98.4 |    97.31 |     100 |    98.4 |
core               |   97.91 |    96.85 |     100 |    97.9 |
submit.ts          |     100 |       90 |     100 |     100 | 27,72
url.ts             |    93.1 |       94 |     100 |   92.98 | 5,41,71,97
-------------------|---------|----------|---------|---------|-------------------
```
