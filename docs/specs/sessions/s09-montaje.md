# s9 — Montaje

Estado: BLOQUEADA (D-11). Depende de: s8.

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
