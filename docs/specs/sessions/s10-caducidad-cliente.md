# s10 — Caducidad de campaña (cliente)

Estado: BLOQUEADA (D-14, D-21, D-22, D-24). Depende de: s9.
Brief: `docs/research/forms-v2-campaign-expiry.md` (ESCALADO).

## Objetivo

Aplicar ventana de campaña en cliente con `data-opens-at` y `data-closes-at`, con fail-closed
ante fecha inválida, y mostrar estados claros (`not-started`, `expired`, `invalid`) con CTA
opcional de cerrado (`data-closed-url`) cuando sea válido.

Esto cubre UX y reduce intentos fuera de ventana. El bloqueo real contra POST directos sigue en s15.

## Archivos

- `src/core/time.ts`
- `src/ui/states.ts`
- `src/core/controller.ts` (revalidación de ventana dentro del submit)
- `src/core/schedule.test.ts`

## API

```ts
export function scheduleState(
  attrs: Pick<MountAttrs, "opensAt" | "closesAt" | "scheduleInvalid">,
  now: number,
): ScheduleState;
```

`parseIsoWithZone` y su regex estricta se implementan en s3; esta sesión consume ese contrato.

Reglas:
- `scheduleInvalid` => `invalid` (cerrado por seguridad).
- `opensAt` definido y `now < opensAt` => `not-started`.
- `closesAt` definido y `now >= closesAt` => `expired`.
- En los demás casos => `open`.
- `scheduleState` se evalúa al montar y dentro del submit (antes de `fetch`).
- `expired` puede mostrar CTA solo si `attrs.closedUrl` ya fue validado en s3.

## Tests primero (RED)

- `parseIsoWithZone`:
  - (regresión de s3) válido: `2026-10-06T18:00:00-05:00`, `2026-10-06T23:00:00Z`
  - (regresión de s3) inválido: sin offset, con espacio (`2026-10-06 18:00`), mes/día fuera de rango, string vacío.
- `scheduleState`:
  - `now === closesAt` => `expired`.
  - solo `opensAt`, solo `closesAt`, ambos, ninguno.
  - `scheduleInvalid=true` gana sobre cualquier otra condición.
- Integración con controlador:
  - abierto al montar, luego pasa `closesAt`, submit => no hay `fetch` (CA-21).
  - `not-started` al montar => no render de `<form>` enviable.
  - `expired` con `closedUrl` válida => muestra CTA; con inválida => sin CTA.

## Criterios de aceptación de la sesión

- Cubre CA-19, CA-20 y CA-21 de `01-requisitos.md`.
- Estado cerrado siempre se decide con `now >= closesAt`.
- Fechas inválidas o sin offset cierran el formulario y registran `warn`.
- Ninguna ruta de submit fuera de ventana dispara `fetch`.
