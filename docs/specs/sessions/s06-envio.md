# s6 — Cliente de envío

Estado: BLOQUEADA (D-07). Depende de: s2.

## Objetivo

Enviar un lead exactamente una vez y distinguir éxito, rechazo y resultado desconocido. Arregla
los duplicados del paquete viejo (audit Q-01).

## Archivos

- `src/core/response.ts`
- `src/core/submit.ts`
- `src/core/submit.test.ts`

## API

```ts
export const SUBMIT_TIMEOUT_MS = 15_000;
export function parseElementorResponse(body: unknown): ElementorResponse | null; // zod

export async function submitLead(
  entries: PayloadEntries,
  options?: { readonly timeoutMs?: number; readonly fetchImpl?: typeof fetch },
): Promise<SubmitResult>;
```

Comportamiento:
- Un solo `fetch` a `ENDPOINT`, `method: "POST"`, `body: toFormData(entries)`,
  `headers: { "X-Requested-With": "XMLHttpRequest" }`, `signal` con timeout.
- **Nunca** reintenta.
- Abort por timeout → `{ kind: "unknown", reason: "timeout" }`.
- `fetch` rechaza → `{ kind: "unknown", reason: "network" }`.
- Cuerpo que no es JSON, o JSON que no cumple el schema → `{ kind: "unknown", reason: "invalid-response" }`.
- `success: true` → `{ kind: "ok", aanumber }`.
- `success: false` → `{ kind: "rejected", fieldErrors: data.errors ?? {}, message: data.message }`.
- Ningún `console.*` con contenido del payload.

## Tests primero (fake timers, `fetchImpl` mockeado)

- Headers, método, URL y cuerpo exactos (inspeccionar el `FormData` recibido).
- Timeout a 15 s: un solo llamado y `unknown/timeout` (CA-12, parte pura).
- Respuesta `text/html` 502, cuerpo `0`, cuerpo `-1`, JSON sin `success` → `unknown/invalid-response`
  y un solo llamado (CA-13).
- `fetch` rechaza → `unknown/network`, un solo llamado.
- `success:false` con errores y mensaje → `rejected` con esos datos.
