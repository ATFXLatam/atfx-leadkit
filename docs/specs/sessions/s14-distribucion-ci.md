# s14 — Distribución y CI de release

Estado: BLOQUEADA (D-13, D-18, D-29, D-30, D-31, D-32). Depende de: s13.
Brief: `docs/research/forms-v2-distribution.md` (ESCALADO).
Deploy, merge y publicación son de Karen.

## Objetivo

Dejar una cadena de distribución reproducible y auditable:
- release por PR,
- publicación npm solo por OIDC (trusted publishing) con provenance,
- snippet versionado con SRI por archivo de formulario.

## Archivos

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `.github/dependabot.yml`
- `scripts/release-snippet.mjs`
- `docs/release/snippets.md`

## CI (`ci.yml`)

- `permissions: {}` a nivel workflow.
- Jobs de verificación con mínimos permisos (`contents: read`).
- Checks obligatorios:
  - `npm run typecheck`
  - `npm run test:cov`
  - `npm run e2e`
  - `npm run size`
  - `npm run build`
- Actions fijadas por SHA (no `@v*`).
- Falla dura ante cualquier error (sin `|| true`).

## Release (`release.yml`)

- Trigger por merge de PR de release a `main`.
- Job de publicación npm:
  - `permissions`: `contents: read`, `id-token: write`.
  - Node/NPM compatibles con trusted publishing.
  - `npm publish --provenance` (sin token npm de larga vida).
- Publica paquete con un JS autocontenido por formulario (CSS dentro del JS).
- Calcula sha384 por cada archivo de formulario publicado (un hash por archivo).
- Genera snippets con:
  - URL jsDelivr `/npm/` con versión exacta.
  - `integrity="sha384-..."`.
  - `crossorigin="anonymous"`.
  - `data-cfasync="false"` antes de `src`.
- Guarda snippets generados en artefacto y actualiza `docs/release/snippets.md`.

## Formato de snippet esperado

```html
<script data-cfasync="false" type="module"
  src="https://cdn.jsdelivr.net/npm/@scope/atfx-leadkit@X.Y.Z/dist/lead.js"
  integrity="sha384-..."
  crossorigin="anonymous"></script>
```

`interest` usa su propio archivo y su propio hash.

## Tests primero (RED)

- Test de script (`release-snippet.mjs`) que:
  - falla si falta hash de algún formulario;
  - falla si una URL no va pinneada a versión exacta;
  - falla si el snippet no incluye `integrity`, `crossorigin` y `data-cfasync="false"`.
- Test de workflow lint:
  - falla si alguna action no está fijada por SHA;
  - falla si el job de publicar no usa `id-token: write`;
  - falla si hay permisos de escritura fuera del job de publicación.

## Criterios de aceptación de la sesión

- Release solo por PR aprobado (sin publicación en push directo a `main`).
- npm publica con provenance verificable.
- Cada formulario tiene snippet propio con SRI propio.
- La documentación de snippet queda lista para pin por sitio en Elementor Pro Custom Code.
