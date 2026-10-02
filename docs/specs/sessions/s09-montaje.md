# s9 — Montaje

Estado: LISTA (D-11 aprobada: 5B). Depende de: s8.

## Objetivo

Encontrar contenedores, montarlos una sola vez (también los que aparecen tarde) y exponer la
API pública.

## Archivos

- `src/core/mount.ts`
- `src/forms/lead/config.ts`, `src/forms/interest/config.ts` (`FormDefinition` de cada uno)
- `src/entries/lead.ts`, `src/entries/interest.ts`
- `src/core/mount.test.ts`

## API

```ts
export function mountAll(definition: FormDefinition, root?: ParentNode): number; // cuántos montó
export function observe(definition: FormDefinition): () => void;                   // devuelve disconnect
declare global { interface Window { atfxLeadkit?: { readonly version: string; mount(root?: ParentNode): void } } }
```

Reglas:
- Selector: `[data-atfx-leadkit="<key>"]`. Contenedores de otro formulario se ignoran en silencio.
- Montados registrados en un `WeakSet` y marcados con `data-atfx-mounted` (CA-01).
- `instanceId`: contador del módulo + `key` (determinista, sin `Math.random`).
- `MutationObserver` sobre `document.body` con `childList: true, subtree: true`, que solo mira
  nodos agregados que sean o contengan el selector.
- `window.atfxLeadkit` se define una sola vez; si ya existe de otro entry, se extiende sin
  pisarlo (ambos formularios pueden estar en la misma página).
- La versión impresa en consola solo si algún contenedor tiene `data-debug`.
- Si `scheduleState` no es `open` al montar, se renderiza el estado cerrado de s10 (en esta
  sesión, un placeholder con el texto del diccionario).

## Tests primero

CA-01, CA-02 (con `await` de microtareas y nodo insertado después), dos formularios distintos
en la misma página, contenedor con `data-atfx-leadkit="desconocido"` ignorado, `mount()` público.

## Decisiones de Karen (brief `s09-montaje` APROBADO, 2026-10-02)

- Arranque 1A: si `readyState` es `loading`, esperar `DOMContentLoaded`; luego `observe(body)` y
  despues el escaneo inicial. El observador no se desconecta solo. Cada contenedor se monta en su
  propio try/catch.
- Idempotencia 2A + 2C: `data-atfx-mounted` se pone antes de renderizar y es la guarda entre
  ejecuciones; un contenedor con el atributo pero cuyo `form` no está en el `WeakSet` de forms
  enlazados compartido en `window.atfxLeadkit` es un clon y se vuelve a montar (un clon sin
  listener haría un GET nativo con datos personales en la URL).
- Global 2D: `window.atfxLeadkit = window.atfxLeadkit ?? crear()` con registro por key;
  `mount(root)` recorre el registro. Versión por key (`versions: { lead, interest }`), no un
  `version` único, porque dos bundles pueden traer versiones distintas.
- `instanceId` 3B: contador del módulo + key, avanzando mientras el id ya exista en el documento.
- Adaptador 4A: el host tiene dos hijos, el `form` y un contenedor de estados `role="status"`
  presente desde el montaje; `showState` pinta solo ahí; thank-you oculta el form; rejected y
  unknown lo dejan conectado. `Intentar de nuevo` pasa al diccionario por idioma.
- D-11 5B: sin país preseleccionado por defecto. El código ya lee `data-country` si el host lo
  pone; activarlo desde `CF-IPCountry` (5A) queda para cuando se confirme que el HTML de las
  landings no se cachea.
- Agenda hasta s10: `scheduleState` mínimo que solo distingue `open` de `invalid` (falla cerrado
  con `scheduleInvalid`); s10 agrega `not-started` y `expired`.
- La lógica del global y del arranque vive en `src/core/mount.ts`; los entries solo la llaman.
- Incluye la deuda residual de s08: si `setBusy` lanza en `true` y en `false`, el popup se cierra
  y la excepción no sale del listener (test ya escrito en la rama `fix/s08-popup-release`).
- Checklist de aceptación: sección 10 del brief.
