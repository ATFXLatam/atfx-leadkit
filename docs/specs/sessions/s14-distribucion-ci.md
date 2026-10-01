# s14 — Distribución y CI de release

Estado: BLOQUEADA (D-13, D-18). Depende de: s13.
Brief: `docs/research/forms-v2-distribution.md` (en curso) sobre `docs/research/embed-form-distribution.md`.
Deploy y merge son de Karen; ningún agente despliega.

## Ya decidido por la investigación previa

- CI en GitHub Actions con `permissions: {}` global; job de build y test con `contents: read`;
  solo el job de publicación con permisos de escritura.
- Actions fijadas por SHA; Dependabot para npm y github-actions.
- Gate: `typecheck`, `test:cov` (80 %), `e2e`, `size`, `build`. Sin esos verdes no hay release.
- Release por PR de release (release-please o equivalente): mergearlo es la aprobación.
- Sin `|| true` en pasos de publicación: si falla, el job falla.
- Sin source maps en el artefacto publicado.

## Pendiente del brief

Canal (host propio, npm + CDN con versión fija y SRI, plugin de WordPress del mismo origen),
forma del snippet para Elementor, SRI, y cómo se fija la versión por landing.

## Archivos previstos

- `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/dependabot.yml`
- loader o snippet según D-13
