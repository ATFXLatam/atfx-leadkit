# s04 — review

Reviewer: Claude Code, 2026-10-01.

## Verificado
- typecheck, tests y cobertura (100 % en `src/data` y `src/i18n`) en verde.
- Comparación independiente contra `atfx-forms/src/data/options.ts`: los 237 ISO3, los 225 valores
  de prefijo y los nombres en español son idénticos (el paquete viejo solo anteponía la bandera
  al nombre). Esos valores viajan a Salesforce, así que era lo crítico.
- Paridad de llaves entre es/en/pt y códigos `sf` según el contrato.

## Ronda 1: CHANGES
- El test de nombres en/pt dependía de `Intl.DisplayNames` del ICU local y fallaría en CI con otra
  versión de Node. Corregido con literales fijos.

## Notas
- Textos de thank-you son placeholder (prometen correo): s11 los reemplaza.

VERDICT: APPROVE
