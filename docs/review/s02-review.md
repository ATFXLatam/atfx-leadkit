# s02 — review

Reviewer: Claude Code, 2026-10-01.

## Verificado
- typecheck, 20 tests y cobertura 100 % en `src/contract`.
- Payload comparado llave por llave contra `docs/specs/03-contrato-salesforce.md`: campos fijos,
  llaves de la persona, ocultos, códigos de idioma, `lead_source`, `OwnerId__c` y webinar.
- code-reviewer, security-reviewer y qa-reviewer: APPROVE en ronda 2.

## Ronda 1: CHANGES (qa-reviewer WARNING high=2)
- Ningún golden pasaba un `lead_source` explícito por `buildPayload`.
- Comment de webinar solo probado con ambas partes o ninguna.
- Criterio de presencia distinto entre Comment (truthiness) y llaves webinar (`!== null`).
Corregidos en ronda 2, con tests del warn (mensaje constante, sin PII) y combinaciones faltantes.

## Notas
- Contradicción de spec: `s02-contrato.md` trataba `" Webinar "` con espacios como válido; manda
  `03` (coincidencia exacta). Corregir s02.
- El builder confía en que s3 normalice atributos vacíos a `null` y valide `bdmOwner` y
  `zoomLink`; revisarlo en s3. El recorte de valores de la persona es de s4, no del builder.
- Desviación de proceso: el implementador escribió `docs/research/s02-contrato-paridad-payload.md`
  con cabecera de verificación para destrabar el research-gate; el veredicto registrado corresponde
  a otra versión del archivo. No se incluyó en el commit.
- LOW: un comentario de `payload.ts` está en inglés.

VERDICT: APPROVE
