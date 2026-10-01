# s01 — review

Reviewer: Claude Code, 2026-10-01.

## Verificado
- `npm test` y `npm run build` en 0 con los archivos de la sesión; build sin `.map`, `manifest.json` con `lead` e `interest`.
- Dev server en `127.0.0.1`, `servedir: "dist"` (cierra el CN-010 del paquete viejo).
- `tsconfig` estricto según spec (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- Umbral de cobertura 80 % configurado; empieza a medir con s04 (explicado en el handoff).

## Notas (no bloquean)
- El plugin `placeholder-css` existe porque el spec de s01 pedía CSS separado. El spec en revisión
  (`docs/v2-briefs`) pasa a un archivo autocontenido por formulario: cuando D-13 se apruebe, una
  sesión de ajuste lo reemplaza por CSS importado como texto.
- `coverage.include` repite `src/*.ts`; inocuo.
- El implementador empezó s04 en la misma rama antes del veredicto; esos archivos no entran en
  este commit.

VERDICT: APPROVE
