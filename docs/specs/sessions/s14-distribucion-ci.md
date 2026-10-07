# s14 — Distribución y CI de release

Estado: LISTA para la cadena de release. El primer release espera s13 (E2E y peso, D-19) y s16
(pentest). Decisiones: D-13, D-29, D-30, D-31 (APROBADAS, Karen, 2026-10-07); D-18 suma el
ruleset de tags `v*`.
Brief: `docs/research/sdk-vercel-distribution.md` (opción C). Reemplaza al plan npm + jsDelivr.

## Objetivo

Servir cada formulario desde `https://atfx-leadkit-cdn.vercel.app/releases/X.Y.Z/<form>-<HASH>.js`
con bytes inmutables, SRI por archivo y procedencia verificable, sin que un deploy nuevo borre
los archivos de releases anteriores.

## Archivos

- `scripts/release.mjs`: `prepare` (dist -> archivos del release + `release.json` + snippets),
  `assemble` (todos los releases -> sitio de Vercel, verificando hashes), `smoke` (headers y
  bytes en el dominio real).
- `deploy/vercel.json`: headers de `/releases/*` (verificados con curl el 2026-10-07).
- `.github/workflows/release.yml`: jobs `build` y `deploy`.
- `src/release/release.test.ts`.
- `docs/release/README.md`: setup único de Karen y cómo publicar.

## Release (`release.yml`)

- Trigger: push de tag `v*` (protegido por ruleset). `workflow_dispatch` solo re-despliega.
- `permissions: {}` arriba; actions fijadas por SHA.
- Job `build` (`contents: write`, `id-token: write`, `attestations: write`):
  typecheck, tests, build; falla si el tag no es `v` + versión de `package.json`; `prepare`;
  artifact attestation de cada `.js`; release en borrador, adjunta, publica (inmutable).
- Job `deploy` (`environment: production`, `contents: read`, `attestations: read`):
  descarga todos los releases publicados, `gh attestation verify` con `--signer-workflow`,
  `assemble`, CLI de Vercel con versión exacta, deploy prebuilt a producción con `--cwd site`,
  `smoke`.
- Nunca se reconstruyen tags viejos: el hash de esbuild no es reproducible, se sirven los bytes
  guardados.

## Snippet

```html
<div data-atfx-leadkit="lead" data-lang="es"></div>
<script data-cfasync="false" defer nowprocket data-wpmeteor-nooptimize="true"
  src="https://atfx-leadkit-cdn.vercel.app/releases/X.Y.Z/lead-<HASH>.js"
  integrity="sha384-..."
  crossorigin="anonymous"></script>
```

Sin `type="module"`: el bundle es IIFE. Una sola fuente de pin por página y formulario (D-30).

## Tests

- `prepare`: ruta con versión exacta y sha384 de los bytes; falla sin un formulario o con rango.
- Snippet: `data-cfasync` antes de `src`, `integrity`, `crossorigin`, sin `type`; rechaza ruta sin
  versión exacta, archivo de otro formulario e integrity que no sea sha384.
- `assemble`: conserva todos los releases; falla si un hash no coincide, si falta `release.json`
  o un archivo, si el tag no coincide con la versión o si una ruta se repite.
- `smoke`: reporta falta de CORS y bytes distintos.

## Fuera de alcance

- Presupuesto de peso (D-19, s13) y dependabot.
- Revocación de versiones: `releases.json` solo indexa; revocar se agrega cuando haga falta.
- Instant Rollback está prohibido por proceso: se corrige con un redeploy (`workflow_dispatch`).
