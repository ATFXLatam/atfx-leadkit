# s08 — handoff

## Archivos
- creado: `src/core/controller.ts`
- creado: `src/core/analytics.ts`
- creado: `src/ui/states.ts`
- creado: `src/core/controller.test.ts`
- creado: `docs/review/s08-handoff.md`

Sin dependencias nuevas, sin git, sin red real. `submit` y `openPopup` son dobles inyectados. El controlador no importa s7 ni `fetch`.

## RED

`npm test` en el paquete, 2026-10-02 09:39:58, exit 1. Los módulos de la sesión aún no existían.

```
 RUN  v5.0.3 /Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit

 ✓ src/smoke.test.ts (1 test) 3ms
 ✓ src/contract/payload.test.ts (19 tests) 13ms
 ❯ src/core/controller.test.ts (0 test)
 ✓ src/core/attrs.test.ts (30 tests) 38ms
 ✓ src/core/submit.test.ts (27 tests) 42ms
 ✓ src/core/production-fixtures.test.ts (2 tests) 23ms
 ✓ src/i18n/i18n.test.ts (9 tests) 39ms
 ✓ src/forms/schemas.test.ts (30 tests) 40ms

 FAIL  src/core/controller.test.ts [ src/core/controller.test.ts ]
Error: Failed to resolve import "../ui/states" from "src/core/controller.test.ts". Does the file exist?

 Test Files  1 failed | 7 passed (8)
      Tests  118 passed (118)
   Duration  3.53s
```

## GREEN

`npm run typecheck && npx vitest run --coverage`, 2026-10-02 09:51:49, exit 0. `tsc --noEmit` no imprimió diagnósticos.

```
 ✓ src/smoke.test.ts (1 test)
 ✓ src/contract/payload.test.ts (19 tests)
 ✓ src/core/attrs.test.ts (30 tests)
 ✓ src/i18n/i18n.test.ts (9 tests)
 ✓ src/core/submit.test.ts (27 tests)
 ✓ src/core/production-fixtures.test.ts (2 tests)
 ✓ src/forms/schemas.test.ts (30 tests)
 ✓ src/core/controller.test.ts (35 tests)

 Test Files  8 passed (8)
      Tests  153 passed (153)
   Duration  2.16s
```

## Cobertura

Archivos de la sesión, todos al 100% en sentencias, ramas, funciones y líneas: `src/core/controller.ts`, `src/core/analytics.ts`, `src/ui/states.ts`.

Agregado del mismo run:

```
All files          |   99.1 |    98.03 |     100 |   99.03
```

Las ramas que faltan para el 100% agregado están en `src/core/submit.ts` y `src/core/url.ts`, fuera de esta sesión. `src/contract/types.ts` y `src/i18n/types.ts` siguen sin código ejecutable.

## Criterios cubiertos

- CA-08: `shows thank-you for a filled honeypot without submit, popup, or analytics`
- CA-11: `one in-flight submit ignores a second submit, requestSubmit, and click` y `keeps a separate lock for each instance`
- CA-12: `unknown result waits for the retry button before a second submit`
- CA-13: `unknown timeout shows the dictionary message and does not auto retry` (también `network` e `invalid-response`)
- CA-14: `maps elementor field ids and shows only the dictionary rejection`, `renders the unknown message as text and retries from the button`, `renders a rejection as text and a thank-you backup link`
- CA-15: `a throwing gtag, a missing fbq, and a rejecting hook still leave the thank-you`
- CA-16: `opens the webinar popup before submit, with no features, and clears opener`
- CA-17: `unchecked acceptance shows the dictionary message and does not submit`
- CA-21: `a not-started schedule does not submit or open a popup` (también `expired` e `invalid`)
- Foco en orden del DOM: `focuses the first invalid field in DOM order and does not open a popup` (`choice` antes que `accepted`)
- Analítica solo tras `ok`, con id solo si hay `aanumber`: `sends transaction_id, eventID, and dataLayer id only when aanumber exists` y `omits aanumber on the hook when the success payload has none`
- Sin PII en los hooks: `passes hooks only the form and aanumber`
- Popup bloqueado o ya cerrado, con CTA de respaldo: `shows the webinar backup flag when the popup is blocked or already closed`
- Lock en `finally`: `releases the lock after ok`, `rejected`, `unknown`, `releases the lock when the success step throws`, `drops the lock when setBusy throws after the submit is accepted`
- `preventDefault` antes de un throw: `prevents the default submit before a later step throws`
- `window.open("about:blank", "_blank")` sin tercer argumento: `opens about:blank in a new tab with no feature string`. El resto de los tests espían `window.open` y esperan que el controlador no lo llame. `afterEach` llama `vi.unstubAllGlobals`.
- Payload: cada `deps.submit` se compara con `buildPayload`. `submits an interest form with the page captured at send time` comprueba `Trading_Experience__c`, `referrer` y `email`. Un `redirect_url` colgado del resultado `ok` no cambia el `href` del popup.

## Desviaciones y preguntas

- `ControllerDeps` conserva `submit`, `now`, `openPopup`, `page` e `integrations`, y suma `schedule(attrs, now)` y el puerto `ui` (`readValues`, `setBusy`, `showFieldErrors`, `focusFirstInvalid`, `showState`). Karen nombró `setBusy`, `showFieldErrors` y `showState`. `readValues` y `focusFirstInvalid` están en el mismo puerto para no importar s7.
- `InstanceContext` queda definido en esta sesión como `{ attrs: MountAttrs; dict: Dict }`. La UI no vive en el contexto.
- `ScheduleState` (`open | not-started | expired | invalid`) está declarado aquí. `scheduleState` de s10 no se implementa. `not-started` y `expired` usan `dict.schedule`. `invalid` usa `dict.errors.generic`.
- En `rejected` solo se muestra `dict.errors.rejected` y los errores de campo ya mapeados. El `message` de Elementor no se pinta. Las llaves `first_name`, `last_name`, `email`, `dialling_code`, `phone`, `country_of_residence`, `Trading_Experience__c` y `field_8f8f3d5` pasan a llaves de `LeadValues`. Una llave desconocida se descarta. El HTML del servidor queda como texto (`textContent`); no hay `innerHTML` ni `DOMParser`.
- El botón de reintento dice `Intentar de nuevo`. Esa cadena no está en el diccionario y no se editó i18n. El mensaje del panel es `dict.errors.unknownResult`.
- El controlador no importa `src/ui/states.ts`. El puerto entrega el estado `unknown` con `onRetry`, y `onRetry` llama `form.requestSubmit()` en el mismo tick. `states.ts` se prueba desde `controller.test.ts`.
- `openAboutBlank` es el envoltorio que s9 puede inyectar como `openPopup`. El handler llama `deps.openPopup()` sin argumentos, en el turno del submit, antes de cualquier `await`, y pone `opener = null` enseguida. Solo navega a `attrs.zoomLink` tras `ok`. En `rejected` y `unknown` cierra el popup. Si `openPopup` devuelve null o el popup ya está `closed`, no lanza y el éxito de webinar igual lleva `zoomCta: true`.
- Un honeypot con texto muestra thank-you con `zoomCta: false`, sin submit, sin popup y sin hooks. La cadena vacía y la ausencia de la llave no cuentan como honeypot.
- El listener atrapa un throw posterior a `preventDefault` para no dejar el lock tomado y para que la excepción del listener no dispare el envío. El test comprueba `defaultPrevented` y que `location.href` no cambia.

## Ronda 2

Archivos tocados: `src/core/controller.ts`, `src/core/controller.test.ts`, este handoff. `analytics.ts` y `states.ts` sin cambios. Sin git, sin dependencias, sin red. Ningún hook ni gate bloqueó.

### RED

`npx vitest run src/core/controller.test.ts`, 2026-10-02, tests nuevos escritos antes del código: 10 fallan, 42 pasan.

```
 FAIL  submit rejects / buildPayload throws / page() throws  (expected [] to deeply equal [ unknown ])
 FAIL  retry after a failed send works through the unknown state
 FAIL  treats a whitespace-only honeypot as empty  (submit llamado 0 veces)
 FAIL  closes the popup when setBusy(true) throws after it opened  (close 0 veces)
 FAIL  closes the popup when showState throws on rejected / unknown  (close 0 veces)
 FAIL  runs the hooks even when the popup navigation throws  (sin 'hook')
 FAIL  drops constructor, toString and __proto__ and keeps real fields  (llegaba la llave 'constructor')
 Test Files  1 failed (1)
      Tests  10 failed | 42 passed (52)
```

Los tests de los puntos 2, 3, 4 (page por envío) y 5 pasaron en RED: el código ya cumplía y quedan como caracterización contra regresiones.

### GREEN

`npm run typecheck && npx vitest run --coverage`, exit 0, `tsc --noEmit` sin diagnósticos.

```
 Test Files  8 passed (8)
      Tests  170 passed (170)
All files          |   99.12 |       98 |     100 |   99.05
```

### Cambios en `controller.ts`

- `finish`: un rechazo de `submit`, un throw de `buildPayload` o de `page()` se convierte en `{kind:"unknown"}`; el pintado va en su propio `try`.
- Listener: `prepare` y el bloqueo van en `try` separados; si `setBusy(true)` lanza se libera el lock y se cierra el popup.
- `applyRejected` / `applyUnknown`: `closePopup` en `finally`. `applyOk`: `showState` -> navegar popup -> `runIntegrations` encadenados con `try/finally`.
- `mapFieldErrors`: `ELEMENTOR_TO_FIELD` pasa a `Map` y se recorre con `Object.entries` (`Object.hasOwn` no está en `lib` ES2020 del tsconfig).
- Honeypot: solo espacios cuenta como vacío (el spec no lo dice; se aplicó la regla indicada).

### Qué punto cubre cada test nuevo

1. [HIGH] `round 2: failures before the result arrives`: tres casos (submit rechaza, buildPayload lanza, page() lanza) con zoomLink; unknown con `dict.errors.unknownResult`, `close` 1 vez, `busy [true,false]`, segundo submit posible. Más `retry after a failed send...`.
2. [HIGH] `uses the now() and the schedule of each submit`: open luego expired; el segundo da estado cerrado, sin submit ni popup; `schedule` recibe 1000 y 2000.
3. [MEDIUM] `the lock after paths that never send`: inválido->válido, cerrado->abierto, honeypot->válido; `submit` 1 vez, `busy [true,false]`. Más `treats a whitespace-only honeypot as empty`.
4. [MEDIUM] El `expect` salió del mock de submit: se registra en `harness.submitted` y se asierta en los tests (`opens the webinar popup...`, `submits an interest form...`). `uses the page of each submit`: `page()` distinto por llamada.
5. [MEDIUM] `round 2: CA-15 with a throwing gtag`: `fbq("track","Lead",{},{eventID:"AA-100"})` y `dataLayer`.
6. [MEDIUM] `round 2: no orphan popup`: `setBusy(true)` lanza, `showState` lanza en rejected y unknown, navegación del popup lanza y los hooks corren.
7. [MEDIUM] `prototype keys from the server`: `constructor`, `toString`, `__proto__` (vía `JSON.parse`) no llegan a `showFieldErrors`; la llave real sí.
8. [LOW] Test de unknown ahora compara con igualdad el estado con `dict.errors.unknownResult`; el de popup bloqueado asierta que `openPopup` devolvió null y que no hay entrada `navigate:` en el log.

### Pregunta abierta

El texto `Intentar de nuevo` sigue hardcodeado en `src/ui/states.ts`, fuera del diccionario. Queda para s9/s11.
