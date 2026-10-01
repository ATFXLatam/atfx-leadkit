# s10 — Caducidad de campaña (cliente)

Estado: BLOQUEADA (D-14). Depende de: s9.
Brief: `docs/research/forms-v2-campaign-expiry.md` (en curso). Esta sesión se ajusta al brief
aprobado; lo de abajo es lo ya decidido por los requisitos.

## Objetivo

Que un formulario fuera de su ventana de campaña no acepte envíos y lo diga con claridad.
Recordatorio: esto es la capa de experiencia. El bloqueo real contra POST directos es s15.

## Archivos

- `src/core/time.ts` (agrega `scheduleState`)
- `src/ui/states.ts` (agrega estados `not-started`, `expired`, `invalid`)
- `src/core/schedule.test.ts`

## API

```ts
export function scheduleState(
  attrs: Pick<MountAttrs, "startsAt" | "expiresAt" | "scheduleInvalid">, now: number,
): ScheduleState;
```

- `scheduleInvalid` → `invalid` (se trata como cerrado: fallar cerrado).
- `now < startsAt` → `not-started`; `now >= expiresAt` → `expired`; si no, `open`.
- Los estados muestran texto del diccionario, con `role="status"`; `expired` puede mostrar un CTA
  si existe `data-expired-url` (pendiente de confirmar en el brief).

## Tests primero

CA-19, CA-20, CA-21 (con el controlador de s8), y bordes: `now === expiresAt` → expirado;
solo `startsAt`; solo `expiresAt`; ninguno → abierto.
