# s09 — handoff

## Archivos
- creado: `src/core/mount.ts`, `src/core/mount.test.ts`, `src/core/mount.integration.test.ts`
- creado: `src/forms/lead/config.ts`, `src/forms/interest/config.ts`
- creado: `src/ui/form-ui.ts` (adaptador del puerto `FormUi`), `src/ui/form-ui.test.ts`
- modificado: `src/entries/lead.ts`, `src/entries/interest.ts` (solo estilos + `observe(definition)`)
- modificado: `src/core/controller.ts` (deuda s08: `closePopup` antes de `release()`, `release()` no propaga el error de `setBusy(false)`; `closedMessage` exportado)
- modificado: `src/core/time.ts` (`scheduleState` minimo `open | invalid`, con marcador HACK hacia s10)
- modificado: `src/ui/states.ts` (`renderUnknownResult` recibe `retryLabel`), `src/core/controller.test.ts` (dos llamadas pasan `dict.errors.retry`)
- modificado: `src/i18n/{types,es,en,pt}.ts` (`errors.retry`: Intentar de nuevo / Try again / Tentar novamente)

## RED
Antes de implementar (`npx vitest run`):
```
× closes the popup and frees the lock when setBusy throws on both calls
  AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
FAIL src/core/mount.integration.test.ts  Failed to resolve import "../forms/lead/config"
FAIL src/core/mount.test.ts              Failed to resolve import "../forms/interest/config"
FAIL src/ui/form-ui.test.ts              Failed to resolve import "./form-ui"
Test Files  4 failed | 10 passed (14)    Tests  1 failed | 244 passed (245)
```

## GREEN
```
npm run typecheck   -> sin errores
npx vitest run --coverage   Test Files 14 passed (14)   Tests 293 passed (293)
npm run build       -> interest-33EH66XV.js, lead-6VHVMWXN.js (124k cada uno)
```
El bundle trae `"0.0.0"` inyectado por `define` y el global `atfxLeadkit`.

## Cobertura (reportsDirectory en scratchpad cov-s09)
Total: 99.08 % stmts, 96.46 % branches, 100 % funcs, 99.17 % lines.
- `core/mount.ts`: 99.03 / 94.73 / 100 / 100 (ramas sin cubrir: lineas 168 y 204, guardas defensivas `!document.body` y `stopped` en `begin`)
- `ui/form-ui.ts`, `forms/*/config.ts`, `core/time.ts`: 100 %
- `core/controller.ts`, `ui/states.ts`: 100 %

## Criterios cubiertos (seccion 10 del brief)
- readyState loading espera DOMContentLoaded, nunca observa con body nulo: `waits for DOMContentLoaded while the document is loading...`, `a disconnect before DOMContentLoaded cancels the start`, `starts immediately when the document is already parsed`
- observer antes del escaneo y disconnect: `registers the observer before the first scan and returns a disconnect`
- filtro de Element y busqueda en subarbol: `mounts a container nested inside a node inserted later`, `ignores text nodes and nodes removed before the callback runs`
- CA-02: `CA-02: a container inserted later is mounted after a microtask, without calling anything`
- CA-01: `CA-01: a second mountAll leaves a single form...`, `CA-01: a second evaluation of the module (duplicate script)...`
- marca antes de renderizar y try/catch por contenedor: `marks the container before rendering and keeps mounting the rest when one throws`
- `desconocido` ignorado: `ignores an unknown container without touching it or throwing`
- lead + interest, global unico, `mount()` monta ambos: `lead and interest share one global, each bundle mounts only its key, mount() mounts both`; `ignores containers of another form key`
- re-ejecutar no pisa: `re-running an entry keeps the same object and the first registration`
- instanceId determinista y unico con ids previos: `derives instance ids from a counter and the key`, `skips ids already used by another copy of the bundle`
- CA-03: `CA-03: two instances have no repeated ids and each label points into its own form`
- status `role="status"` presente y vacio: `mounts one form and an empty status region per matching container`
- rejected y unknown dejan el form conectado y el reintento reenvia: integracion `rejected leaves the form connected...`, `unknown leaves the form connected and the retry button triggers a new submit`; unit `rejected keeps the form visible and connected`, `unknown keeps the form connected...`
- thank-you oculta el form y pinta en el status: integracion `fills, submits through the mock and shows thank-you in the status region, hiding the form`; unit `thank-you hides the form and paints only the status region...`
- agenda no open: `renders no form and the dictionary text when the schedule is invalid`, `uses the language of the container`, `does not remount a closed container on a second pass`, `scheduleState`
- `focusFirstInvalid`: `focusFirstInvalid focuses the control of its own instance`; integracion `an invalid submit shows field errors, focuses the first one...`
- `Intentar de nuevo` por idioma: integracion `the retry label comes from the %s dictionary` (es/en/pt)
- version solo con `data-debug`, `declare const` con valor en tests: `prints the version only when a container has data-debug`, `falls back to a placeholder version...`, `vi.stubGlobal("__LEADKIT_VERSION__")` en `loadMount`
- logica en `mount.ts`, entries solo llaman: ver archivos
- cada test desconecta y limpia: `afterEach` de los tres archivos (disconnect, `delete window.atfxLeadkit`, `body.innerHTML = ""`)
- clon (2C): `remounts a clone of a mounted container so its form has a listener`, `remounts a clone inserted later`, `does not remount a container mounted by another copy of the bundle`
- deuda s08: `closes the popup and frees the lock when setBusy throws on both calls` (RED a GREEN)

## Desviaciones y preguntas
1. `vitest.config.ts` no tiene `define` y no lo toque (instruccion: detenerme si hacia falta). `mount.ts` usa `typeof __LEADKIT_VERSION__ === "string" ? ... : "dev"` y los tests hacen `vi.stubGlobal`. Si Karen prefiere `define` en vitest, es un cambio de una linea fuera de alcance.
2. `FormDefinition` sigue siendo el de `render.ts` (`{ key }`), no el de 04-arquitectura (`choiceOptions`, `createSchema`): el controlador resuelve el schema por `attrs.form` y nada leeria esos campos (YAGNI). Los `config.ts` exportan `leadDefinition` e `interestDefinition`.
3. Archivo nuevo no listado por nombre en la sesion: `src/ui/form-ui.ts` (+ test), el adaptador pedido en el alcance. Se separo de `mount.ts` por tamano y cohesion.
4. Clon (2C): el `WeakSet` de forms vive en `window.atfxLeadkit.forms`. Un contenedor con atributo y sin `form` hijo (placeholder cerrado) se considera montado, porque no hay nada enviable.
5. `window.atfxLeadkit` expone `versions`, `forms`, `register`, `mount` (decision 2D); el tipo de la spec (`version` unico) queda reemplazado.
6. El estado `closed` (agenda) tambien oculta el form y pinta el mensaje en el status; no hay `closedUrl` ni redireccion (s10).
7. CSS fuera de alcance: `.atfx-leadkit { display: grid }` vence al atributo `hidden`, por eso `hideForm` pone tambien `style.display = "none"`. El contenedor de estados y los botones de reintento no tienen estilos (s11); conviene agregar `.atfx-leadkit[hidden]{display:none}` ahi.
8. El `catch` de `release()` traga el error de `setBusy(false)` sin senal (mismo hueco de log que ya anoto s08 para s11).
9. Nada de git ni de red; `package.json`, `tsconfig`, `.github`, `docs/specs` y `docs/research` intactos. Sin hooks ni gates que bloquearan.

## Ronda 2

### Cambio de produccion (`src/core/mount.ts`)
- `ensureGlobal` valida la forma del global existente (`register` funcion, `forms` WeakSet genuino, probado con `WeakSet.prototype.has` para rechazar Proxy). Si no cumple: `console.warn("[atfx-leadkit] unexpected window.atfxLeadkit; not mounting")` (texto fijo, sin datos), `mountAll` devuelve 0 y `observe` devuelve un disconnect vacio sin observar ni registrar.
- `alreadyMounted` y el alta en `forms` usan `WeakSet.prototype.has/add` nativos: un `forms.has` que siempre responde true ya no marca como montado un clon sin listener; el clon se remonta con listener.
- Sin cambios en el resto (el filtro `nodeType`, el catch y la guarda de body ya existian; los tests nuevos los fijan).

### RED
Primera corrida de `mount.test.ts` con los tests nuevos y `mount.ts` sin tocar:
```
Tests  4 failed | 40 passed (44)
x fails closed without forms: ...            expected "observe" to not be called at all
x fails closed when register is not a function   expected 1 to be +0
x fails closed when forms is not a WeakSet       expected 1 to be +0
x a forms.has that always answers true ...       expected false to be true
```
Los puntos 1, 2, 3, 4 y 6 pasaron en RED porque el comportamiento ya existia; se demuestra que cada test falla sin su comportamiento con mutaciones (abajo). Para el punto 2 en integracion hubo un primer intento con contador por copia que fallaba con 2 llamadas: `vi.mock` conserva un solo mock de `./submit` tras `resetModules`, asi que contaba dos veces el mismo `vi.fn`; se corrigio a contar sobre el mock unico.

### GREEN
```
npm run typecheck   -> sin errores
npx vitest run --coverage   Test Files 14 passed (14)   Tests 306 passed (306)
npm run build       -> ok
```
Cobertura total 99.11 / 96.6 / 100 / 99.18 (stmts/branches/funcs/lines); `core/mount.ts` 99.2 / 96.15 / 100 / 100 (ramas sin cubrir: linea 60, global que no es objeto o es null en `isLeadkitGlobal`; linea 194, el `"unknown"` cuando el error lanzado no es `Error`).

### Mapa test -> punto
1. HIGH nodo no-Element: `a text node in the same tick as a live container raises no error and the container still mounts` (unit, patron `addEventListener("error")`); nodo removido separado: `does not mount a container removed before the callback runs`.
2. MEDIUM script duplicado: unit `CA-01: two live observers from duplicate scripts mount a late container once, with unique ids` (1 form, 1 `replaceChildren`, ids unicos) y `CA-01: a duplicate script's initial scan does not remount...`; integracion `a submit calls submitLead exactly once after two evaluations with an early container` / `... with a late container`.
3. LOW desconocido: `ignores an unknown container through mountAll, mount() and a late insert, silently` (fusiona y reemplaza el test vacuo; assert sin console.error ni warn).
4. LOW catch de safeMount: `empties a host that already had children when mounting fails, and the next host still mounts` (vi.doMock del controlador, primer `bindController` lanza). Body nulo: `does not observe nor throw when the document has no body`.
5. MEDIUM global: `fails closed without forms...`, `fails closed when register is not a function`, `fails closed when forms is not a WeakSet`, `a forms.has that always answers true cannot leave a clone with an unbound form`, `a Proxy standing in for the WeakSet is rejected`.
6. LOW data-debug: `prints the version for a late container with data-debug`.

### Mutaciones (cada una restaurada despues)
- quitar el filtro `nodeType` -> falla el test 1; quitar solo `isConnected` -> falla el de nodo removido
- quitar `host.replaceChildren()` del catch -> falla el test de limpieza
- `alreadyMounted` siempre false -> fallan los CA-01 unit (incl. observers duplicados) y los dos de integracion
- quitar `!document.body` -> falla el test de body nulo
- quitar el log de debug -> falla el test nuevo de debug
- `api.forms.has` en lugar del nativo -> falla el test de `forms.has` siempre true

### Notas
- El test de body nulo restaura el getter en `finally`: el `afterEach` toca `document.body` antes de `restoreAllMocks`.
- El warning de forma inesperada se emite en cada llamada a `mountAll` directa con ese global; `observe` retorna antes, asi que no se repite por mutacion.
- Sin git, sin red, sin dependencias; sin hooks ni gates que bloquearan. Solo se tocaron los 4 archivos permitidos.
