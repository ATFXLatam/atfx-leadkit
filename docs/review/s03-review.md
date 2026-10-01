# s03 — review

Reviewer: Claude Code, 2026-10-01.

## Verificado
- typecheck y 88 tests en verde; `url.ts`, `time.ts` y `attrs.ts` cubiertos.
- `safeZoomLink` y `safeClosedUrl`: unos 65 vectores ejecutados por el security-reviewer
  (userinfo, backslash, controles, `%`, punto final, homógrafos, IPv6, puerto). Todos fallan
  cerrado. Se devuelve el `href` ya parseado, no el string original.
- Atributos vacíos o solo espacios → `null`, como espera el builder de s02.
- code-reviewer, security-reviewer y qa-reviewer: APPROVE en ronda 2.

## Rondas
1. Brief `s03-atributos` ESCALADO → APROBADO por Karen, con sus decisiones (sección final del spec).
2. CHANGES (qa WARNING high=3): faltaban regresiones de URLs, zona con offset y `bdmOwner`.
   Resuelto el conflicto entre reviewers sobre la zona: `Intl` solo valida y se devuelve el valor
   recibido, para que Node y Safari iOS 15 den lo mismo.

## Notas para sesiones siguientes
- s8: abrir el popup de Zoom con `noopener,noreferrer`.
- s9/s10: inyectar `console.warn` con mensajes sin datos sensibles (`warn` es opcional aquí).
- Fechas con milisegundos (`toISOString()`) se rechazan: documentarlo para editores.
- `pageUrl` de `safeClosedUrl` lo pone el código, no el host.

VERDICT: APPROVE
