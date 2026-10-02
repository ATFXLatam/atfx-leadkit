# s05 — review

Reviewer: Claude Code, 2026-10-02.

## Verificado
- typecheck y tests en verde tras integrar `main`; `src/forms` al 100 %.
- Validación según la columna Validación de `03-contrato-salesforce.md` y D-08 (estricta en
  cliente): ninguna llave ni valor enviado cambia, solo se rechazan entradas.
- code-reviewer, security-reviewer y qa-reviewer: APPROVE en ronda 5.

## Rondas
1. `LeadValues` duplicado: pasa a importarse de `src/contract/types.ts` (s02).
2. BLOCK de seguridad: nombres aceptaban CRLF, NUL, bidi y fórmulas (`=`, `@`, `+`, `-`).
   Allowlist de letras y marcas que empieza por letra; email sin `\p{Cc}`/`\p{Cf}`.
3. El apóstrofo tipográfico `’` (iOS/Android) se rechazaba; `PHONE_PATTERN` no compilaba con
   flag `v` (el navegador ignoraba el `pattern`).
4. Teléfono que empezaba con `=` o `*` era fórmula en Excel: ahora dígito o `(` al inicio.
5. Asserts con el caso en el mensaje; casos corriendo en lead e interest.

## Notas
- Apellidos de un carácter (`李`) fallan por el mínimo de 2 del spec; revisar con D-08 si aparecen.
- LOW pendientes: bordes del teléfono sin espacios, `country: "mex"` y `"52 "` solo en lead.

VERDICT: APPROVE
