# Reference Brief: controlador s08 (submit con lock, popup de Zoom en el gesto, errores como texto, analitica aislada)

Slug: s08-controlador | Nivel: quick | Fecha: 2026-10-02 | Estado: APROBADO
Versiones: typescript=5.9.3, vitest=5.0.3, jsdom=30.1.1, zod=3.25.76
Verificador: research-verifier 2026-10-02 ESCALATE

## 1. Pregunta y decisiones abiertas

Sesion s08 de atfx-leadkit: `src/core/controller.ts` une validacion (schemas de s05), honeypot,
un solo envio en vuelo, `submitLead` de s06 (sin reintento automatico, D-07), errores de campo y
`message` del servidor pintados como texto, el popup de Zoom endurecido de D-12 y la analitica
aislada de `src/core/analytics.ts`; `src/ui/states.ts` agrega el estado "resultado desconocido"
con reintento MANUAL. s7 (UI) se implementa en paralelo: este brief no depende de su codigo, solo
de las firmas escritas en su spec.

Decisiones que este brief informa:
1. Como cumplir a la vez "abrir en el gesto", `opener = null`, "noopener,noreferrer" y "navegar
   solo tras success:true" (las cuatro no caben juntas en una sola llamada a `window.open`).
2. Donde vive el lock de doble envio y que garantiza frente a Enter, doble clic y `requestSubmit`.
3. Como pintar el `message` de Elementor, que trae HTML, sin `innerHTML`.
4. Como aislar gtag/dataLayer/fbq para que ni un throw sincrono ni una promesa rechazada toquen el exito.
5. Como acoplar el controlador a s7 (paralelo) y a `scheduleState` (que pertenece a s10) sin depender de su codigo.

Reuso: `embed-form-submit-privacy` (D4 popup) y `forms-v2-thank-you` (conversiones) sostienen D-12 y
RF-14; `s06-envio-cliente` (APROBADO) fija `submitLead`; `s03-atributos` (APROBADO) fija `safeZoomLink`.
Sus afirmaciones se re-verificaron aqui contra las fuentes, porque los dos primeros citan el repo
viejo y versiones distintas (typescript 5.5.4).

## 2. Estado actual

- `submitLead` clasifica en su `catch` los errores de `fetch` y de parseo como `unknown` (timeout, network, invalid-response) en vez de propagarlos [repo:src/core/submit.ts:75]
- `submitLead` hace un unico `fetch` por llamada, sin bucle de reintento [repo:src/core/submit.ts:38]
- `rejected` trae `fieldErrors` y, si existe, `message` crudo del servidor [repo:src/core/submit.ts:70]
- El `message` de rechazo de Elementor une errores con `<br>` y puede llevar un `div` de errores de admin [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/ajax-handler.php#L287-L297@84c616b]
- Las llaves de `errors` de Elementor son ids de campo del form (`$this->errors[ $field ]`), no las llaves camelCase de `LeadValues` [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/ajax-handler.php#L248-L252@84c616b]
- `safeZoomLink` ya exige https, host `zoom.us` o `*.zoom.us`, sin credenciales ni puerto, y devuelve la URL normalizada o null [repo:src/core/url.ts:60]
- `buildPayload` recibe `(form, attrs, values, page)` y devuelve entradas del contrato [repo:src/contract/payload.ts:34]
- El diccionario ya tiene `errors.unknownResult`, `errors.generic` y `errors.rejected` para los tres idiomas [repo:src/i18n/types.ts:38]
- El schema de `lead` se crea por diccionario con `createLeadSchema(dict)` (s05) [repo:src/forms/lead/schema.ts:8]
- `time.ts` solo exporta `parseIsoWithZone`; `scheduleState` no existe todavia [repo:src/core/time.ts:34]
- `scheduleState` esta especificada en s10, que depende de s9, que depende de s8: s08 la necesita antes de que exista [repo:docs/specs/sessions/s10-caducidad-cliente.md:24]
- La spec de s08 pide recalcular `scheduleState(attrs, now())` dentro del submit [repo:docs/specs/sessions/s08-controlador.md:38]
- La spec de s08 tipa `openPopup` como `() => Window | null` que envuelve `window.open("about:blank","_blank")` [repo:docs/specs/sessions/s08-controlador.md:23]
- La spec de s08 usa `InstanceContext` en `bindController`, tipo que no esta definido en ningun archivo del repo ni de la spec [repo:docs/specs/sessions/s08-controlador.md:27]
- s7 solo publica firmas en su spec: `readValues`, `showFieldErrors`, `setBusy` [repo:docs/specs/sessions/s07-ui.md:26]
- s7 promete que `readValues` devuelve el honeypot bajo la llave `honeypot` [repo:docs/specs/sessions/s07-ui.md:43]
- `DEFAULT_INTEGRATIONS` (gtag `generate_lead`, dataLayer `atfx_lead`, fbq `Lead`) es nuevo de s08: no existe codigo de analitica previo en este repo [repo:docs/specs/sessions/s08-controlador.md:31]
- Los tests corren en jsdom [repo:vitest.config.ts:5]
- `exactOptionalPropertyTypes` esta activo: no se puede pasar `{ eventID: undefined }` a una propiedad opcional tipada [repo:tsconfig.json:5]
- El bundle compila a ES2019 [repo:tsconfig.json:6]
Contextos: navegador en landings WordPress/Elementor (Chrome/Android, Safari iOS 15+, navegadores in-app de Instagram/Facebook sobre WKWebView, popups de Elementor); vitest 5.0.3 + jsdom 30.1.1 (unitarios); Playwright (e2e de s13, todavia sin codigo); bundle esbuild por formulario

## 3. Fuentes primarias

- WHATWG: `window.open` devuelve null si las features traen `noopener` y el target no es `_self`/`_parent`/`_top` [doc:https://html.spec.whatwg.org/multipage/nav-history-apis.html#window-open-steps@2026-10-02]
- WHATWG: el setter de `opener` con null anula el opener browsing context de esa ventana [doc:https://html.spec.whatwg.org/multipage/nav-history-apis.html#dom-opener@2026-10-02]
- WHATWG: si la ventana activa no tiene transient activation y hay bloqueador de popups, el agente puede bloquear el popup [doc:https://html.spec.whatwg.org/multipage/document-sequences.html#popup-blocker@2026-10-02]
- WHATWG: crear un top-level traversable nuevo consume la user activation de la ventana [doc:https://html.spec.whatwg.org/multipage/document-sequences.html#the-rules-for-choosing-a-navigable@2026-10-02]
- WHATWG: transient activation dura un tiempo definido por el agente, "a lo sumo unos segundos" [doc:https://html.spec.whatwg.org/multipage/interaction.html#transient-activation-duration@2026-10-02]
- WHATWG: eventos que activan: keydown (salvo Esc y atajos), mousedown, pointerdown de mouse, pointerup no mouse, touchend [doc:https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event@2026-10-02]
- WHATWG: la sumision implicita (Enter) dispara click en el default button solo si este no esta disabled [doc:https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#implicit-submission@2026-10-02]
- WHATWG: si el evento `submit` se cancela, el algoritmo de sumision retorna sin navegar [doc:https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-algorithm@2026-10-02]
- WHATWG: sin `action` la URL de envio es la del documento y el metodo por defecto es GET [doc:https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-attributes@2026-10-02]
- MDN: `window.open` devuelve null si el bloqueador de popups lo impide, y cada llamada exige su propio gesto [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/open@2026-10-02]
- MDN: `noreferrer` omite el header Referer y ademas fija `noopener` [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/open@2026-10-02]
- MDN: una ventana abierta con opener cross-origin puede navegar la pestana original (phishing) [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/opener@2026-10-02]
- MDN: la politica de referrer por defecto es `strict-origin-when-cross-origin`, que en https a https cross-origin envia solo el origen [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy@2026-10-02]
- MDN: no usar `innerHTML` para texto porque es susceptible a XSS; `textContent` no invoca el parser HTML [doc:https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent@2026-10-02]
- MDN: `DOMParser.parseFromString` es un injection sink (Trusted Types) aunque marque los scripts como no ejecutables [doc:https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString@2026-10-02]
- WebKit bug 225559 (abierto): Safari usa heuristicas por API; en la demo, popup tras timer de 500 ms funciona y tras `await` de FileReader o roundtrip de postMessage se bloquea [doc:https://bugs.webkit.org/show_bug.cgi?id=225559@2026-10-02]
- WebKit blog: la duracion de transient activation la decide cada motor y un trabajo async largo la agota sin solucion por ahora [doc:https://webkit.org/blog/13862/the-user-activation-api/@2023-02-15]
- OWASP: contra tabnabbing, `noopener,noreferrer` en `window.open` y `newWindow.opener = null` [doc:https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html@2026-10-02]
- W3C WAI: tras un envio con errores, conviene mover el foco al primer input con error [doc:https://www.w3.org/WAI/tutorials/forms/notifications/@2026-10-02]
- Google tag: `generate_lead` es "cuando un usuario envia un form" y `transaction_id` es el ID unico para deduplicar [doc:https://developers.google.com/tag-platform/devguides/gtag-integration@2026-10-02]
- Meta: `fbq('track', evento, params, {eventID})`; deduplica con el `event_id` del servidor dentro de 48 horas [doc:https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events@2026-10-02]
- Vitest 5.0.3: `vi.useFakeTimers` envuelve setTimeout y Date; `vi.advanceTimersByTimeAsync` corre timers async; `vi.stubGlobal` se revierte con `vi.unstubAllGlobals` [doc:https://vitest.dev/api/vi@5.0.3]
- TypeScript 5.9.3 lib.dom: `open(url?, target?, features?)` devuelve `WindowProxy | null` [ref:https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/lib/dom.generated.d.ts#L36705@c63de15]
- TypeScript 5.9.3 lib.dom: `opener` esta tipado `any`, asi que asignarle null compila sin cast [ref:https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/lib/dom.generated.d.ts#L36487@c63de15]
- jsdom 30.1.1: `window.open` es "not implemented": emite `jsdomError` y devuelve undefined, no null [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/lib/jsdom/browser/Window.js#L921@0a117f4]
- jsdom 30.1.1: `requestSubmit` dispara `submit` cancelable y solo si no se cancela emite "not implemented" [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/lib/jsdom/living/nodes/HTMLFormElement-impl.js#L106-L110@0a117f4]
- MDN browser-compat-data: Safari iOS marca `window.open` como implementacion parcial, "no funciona si target no se especifica o es `_blank`" [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/api/Window.json#L3717@f2dd714]

## 4. Implementaciones de referencia

- auth0-spa-js (SDK oficial de Auth0, activo: commit 2026-10-02): `loginWithPopup` abre el popup vacio como primera sentencia, antes de cualquier await [ref:https://github.com/auth0/auth0-spa-js/blob/49ccb51b9750c757a8a9fa7e4cde7253a31c12bf/src/Auth0Client.ts#L632@49ccb51]
- auth0-spa-js: si `openPopup` devuelve null lanza `PopupOpenError` en vez de seguir [ref:https://github.com/auth0/auth0-spa-js/blob/49ccb51b9750c757a8a9fa7e4cde7253a31c12bf/src/Auth0Client.ts#L634-L636@49ccb51]
- auth0-spa-js documenta que el metodo debe llamarse desde un handler iniciado por el usuario o el popup se bloquea [ref:https://github.com/auth0/auth0-spa-js/blob/49ccb51b9750c757a8a9fa7e4cde7253a31c12bf/src/Auth0Client.ts#L615-L617@49ccb51]
- govuk-frontend (Government Digital Service, design system de GOV.UK, commit 2026-10-01): `preventDoubleClick` corta el segundo click con `preventDefault` mientras un timer esta activo [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/components/button/button.mjs#L70-L84@283cc58]
- Segment analytics-next (Twilio Segment, commit 2026-09-11): `tryAsync` convierte un throw sincrono del plugin en promesa rechazada [ref:https://github.com/segmentio/analytics-next/blob/2d6d5530180489c45675fe9537a42745df9a847e/packages/core/src/queue/delivery.ts#L4-L10@2d6d553]
- Segment: cada plugin corre envuelto y su error se registra y se devuelve, sin propagarse al resto [ref:https://github.com/segmentio/analytics-next/blob/2d6d5530180489c45675fe9537a42745df9a847e/packages/core/src/queue/delivery.ts#L24-L54@2d6d553]

## 5. Opciones

Decision 1 (popup: las cuatro exigencias de D-12 no caben en una llamada).

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. `window.open("about:blank","_blank")` sin features en el gesto, `opener = null` de inmediato, navegar tras `ok`, cerrar en `rejected`/`unknown`, CTA de respaldo siempre visible | Respeta el gesto [ref:https://github.com/auth0/auth0-spa-js/blob/49ccb51b9750c757a8a9fa7e4cde7253a31c12bf/src/Auth0Client.ts#L632@49ccb51]; corta el opener [doc:https://html.spec.whatwg.org/multipage/nav-history-apis.html#dom-opener@2026-10-02] | No logra `noreferrer`: Zoom recibe el origen de la landing [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy@2026-10-02] | baja | Si (es la API de la spec y D-12) |
| B. `window.open(url, "_blank", "noopener,noreferrer")` tras `ok` | Sin opener ni referrer [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/open@2026-10-02] | Va despues de un await: Safari lo bloquea [doc:https://bugs.webkit.org/show_bug.cgi?id=225559@2026-10-02] | baja | No |
| C. `window.open("about:blank","_blank","noopener,noreferrer")` en el gesto | Sin opener | Devuelve null: no se puede navegar ni cerrar despues [doc:https://html.spec.whatwg.org/multipage/nav-history-apis.html#window-open-steps@2026-10-02] | baja | No |
| D. Sin popup: solo el CTA `<a target="_blank" rel="noopener noreferrer">` del thank-you | Gesto propio del clic, sin opener ni referrer [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/opener@2026-10-02] | Un clic mas; contradice D-12 aprobada [repo:docs/specs/02-decisiones.md:20] | baja | Solo si Karen reabre D-12 |

Decision 2 (doble envio).

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Bandera `inFlight` en el closure de `bindController`, revisada como primera sentencia despues de `preventDefault`, liberada en `finally`; `setBusy(true)` como refuerzo | Cubre Enter, doble clic y `requestSubmit` porque todos pasan por el evento `submit` [doc:https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-algorithm@2026-10-02] | Ninguno relevante; un lock por instancia, no global [repo:docs/specs/04-arquitectura.md:17] | baja | Si |
| B. Solo `disabled` en el boton | Bloquea Enter si el default button esta disabled [doc:https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#implicit-submission@2026-10-02] | No cubre `requestSubmit()` de scripts ni el lapso antes del primer render [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/lib/jsdom/living/nodes/HTMLFormElement-impl.js#L106-L110@0a117f4] | baja | No como unica defensa |
| C. Debounce por tiempo (patron GOV.UK) | Probado a escala [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/components/button/button.mjs#L70-L84@283cc58] | El envio puede durar hasta 15 s: un timer de 1 s deja pasar el segundo [repo:src/core/submit.ts:5] | baja | No |

Decision 3 (`message` de Elementor con HTML).

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Mensaje del diccionario (`errors.rejected`/`generic`) como texto principal; errores por campo del servidor con `textContent` solo si su llave mapea a un campo; `message` crudo nunca a `innerHTML` | Cumple RF-13 y CA-14 [repo:docs/specs/01-requisitos.md:61]; sin sink [doc:https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent@2026-10-02] | Se pierde el texto exacto del servidor si no se muestra | baja | Si |
| B. `message` crudo con `textContent` | Literal, seguro [doc:https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent@2026-10-02] | La persona ve `<br>` y el `div` de admin literal [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/ajax-handler.php#L287-L297@84c616b] | baja | Aceptable como texto secundario |
| C. `DOMParser` para extraer texto | Texto limpio | Es injection sink y rompe bajo Trusted Types [doc:https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString@2026-10-02] | media | No |

Decision 4 (analitica).

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Cada hook en su `try/catch`; si devuelve thenable, colgarle `.catch` sin await; hooks llaman a `gtag`/`fbq` solo si `typeof === "function"` | Throw sincrono y rechazo async quedan dentro del hook [ref:https://github.com/segmentio/analytics-next/blob/2d6d5530180489c45675fe9537a42745df9a847e/packages/core/src/queue/delivery.ts#L24-L54@2d6d553] | Un hook que cuelga no se detecta (no importa: no se espera) [repo:docs/specs/sessions/s08-controlador.md:49] | baja | Si |
| B. Solo `try/catch` sincrono | Lo que dice la spec al pie de la letra [repo:docs/specs/sessions/s08-controlador.md:49] | Un hook async que rechaza deja un unhandled rejection [ref:https://github.com/segmentio/analytics-next/blob/2d6d5530180489c45675fe9537a42745df9a847e/packages/core/src/queue/delivery.ts#L4-L10@2d6d553] | baja | No |

Decision 5 (acoplamiento a s7 y s10).

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Puerto de UI y `schedule` inyectados en `ControllerDeps` (o en el contexto), con fakes en los tests | s8 se prueba sin el codigo de s7 [repo:docs/specs/sessions/s07-ui.md:26]; no espera a s10 [repo:docs/specs/sessions/s10-caducidad-cliente.md:24] | Cambia la API escrita de s8 (necesita a Karen) [repo:docs/specs/sessions/s08-controlador.md:20] | baja | Si, sujeto a Karen |
| B. Importar s7 directo y escribir `scheduleState` en s8 | API de la spec intacta [repo:docs/specs/sessions/s08-controlador.md:27] | Bloquea s8 hasta mergear s7 y mueve trabajo de s10 a s8 [repo:docs/specs/00-programa.md:35] | media | No |

## 6. Evidencia en contra

- Contra 1A: OWASP pide `noopener,noreferrer` en las features, y A no los pasa [doc:https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html@2026-10-02]
- Resuelto: el propio snippet de OWASP hace `newWindow.opener = null` sobre el retorno, que con `noopener` es null por especificacion y lanzaria TypeError [doc:https://html.spec.whatwg.org/multipage/nav-history-apis.html#window-open-steps@2026-10-02]
- Resuelto: `opener = null` cumple el objetivo de OWASP (cortar el back-link) [doc:https://html.spec.whatwg.org/multipage/nav-history-apis.html#dom-opener@2026-10-02]
- Aceptado: sin `noreferrer`, Zoom recibe el origen (no la ruta) de la landing por la politica por defecto; la URL de la landing no lleva PII porque el envio es POST con `preventDefault` [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy@2026-10-02]
- Contra 1A: en iOS el popup vacio puede quedar en primer plano hasta 15 s mientras el envio sigue en la pestana original [repo:src/core/submit.ts:5]
- Aceptado por D-12 (Karen la aprobo con ese costo descrito como "pestana en blanco breve") [repo:docs/specs/02-decisiones.md:20]
- Contra 1A: BCD dice que en Safari iOS `window.open` con `_blank` "no funciona" [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/api/Window.json#L3717@f2dd714]
- No resuelto con una fuente: la nota no dice si devuelve null o una ventana inerte; por eso el CTA de respaldo debe mostrarse siempre en el exito webinar, no solo cuando `openPopup` devuelve null (ver seccion 9) [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/api/Window.json#L3717@f2dd714]
- Contra 3A: ocultar el `message` del servidor puede esconder una razon util (p. ej. un error de configuracion) [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/ajax-handler.php#L287-L290@84c616b]
- Aceptado: CA-14 solo exige que, si se muestra, sea texto literal; mostrarlo como texto secundario (3B) es compatible [repo:docs/specs/01-requisitos.md:139]

## 7. Ejemplares y anti-ejemplos

- Bien (popup): abrir vacio como primera accion del handler y tratar null como "bloqueado" [ref:https://github.com/auth0/auth0-spa-js/blob/49ccb51b9750c757a8a9fa7e4cde7253a31c12bf/src/Auth0Client.ts#L631-L637@49ccb51]
- Bien (aislar hooks): envolver cada hook para que un throw sincrono tambien se capture como rechazo [ref:https://github.com/segmentio/analytics-next/blob/2d6d5530180489c45675fe9537a42745df9a847e/packages/core/src/queue/delivery.ts#L4-L10@2d6d553]
- Bien (Pixel con dedupe): `fbq('track', 'Lead', {}, {eventID: aanumber})`, solo cuando hay `aanumber` [doc:https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events@2026-10-02]
- Bien (Ads): `transaction_id` = `aanumber` para no contar dos veces el mismo envio [doc:https://developers.google.com/tag-platform/devguides/gtag-integration@2026-10-02]
- Bien (foco): tras errores de validacion, foco al primer input con error [doc:https://www.w3.org/WAI/tutorials/forms/notifications/@2026-10-02]
- Anti-ejemplo: el snippet de OWASP asigna `opener` sobre el retorno de `window.open(..., 'noopener,...')`, que es null [doc:https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html@2026-10-02]
- Anti-ejemplo: debounce de 1 s como unica defensa contra doble envio de una peticion que puede tardar 15 s [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/components/button/button.mjs#L82-L84@283cc58]
- Forma esperada del handler, ilustrativa y sin codigo de s7, siguiendo la secuencia de la spec [repo:docs/specs/sessions/s08-controlador.md:34]

```ts
form.addEventListener("submit", (event) => {
  event.preventDefault();               // primero: sin action, el default es GET a la URL actual
  if (inFlight) return;                 // CA-11
  const raw = ui.readValues();
  if (raw.honeypot) { ui.showThankYou(); return; }          // CA-08, sin popup ni analitica
  const parsed = schema.safeParse(raw);                      // sincrono
  if (!parsed.success) { ui.showFieldErrors(...); ui.focusFirstInvalid(); return; }
  if (schedule(now()) !== "open") { ui.showClosed(); return; } // CA-21
  const popup = attrs.zoomLink ? openPopup() : null;          // antes de cualquier await
  if (popup) popup.opener = null;
  inFlight = true; ui.setBusy(true);
  void send(parsed.data, popup).finally(() => { inFlight = false; ui.setBusy(false); });
});
```

## 8. Trampas

- Cualquier `await` (o `.then`) antes de `openPopup()` saca la llamada del gesto y Safari la bloquea [doc:https://bugs.webkit.org/show_bug.cgi?id=225559@2026-10-02]
- `schema.safeParse` debe ser sincrono: `parseAsync`/`safeParseAsync` meterian un await antes del popup [doc:https://bugs.webkit.org/show_bug.cgi?id=225559@2026-10-02]
- Un solo `window.open` por gesto: abrir el popup y luego otra ventana en el mismo evento falla [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/open@2026-10-02]
- El reintento manual de "resultado desconocido" debe reabrir el popup dentro del click del boton, en el mismo tick (p. ej. `form.requestSubmit()`), no tras un timer o await [doc:https://html.spec.whatwg.org/multipage/document-sequences.html#popup-blocker@2026-10-02]
- `preventDefault` tiene que ir antes de todo: si algo lanza antes, el form sin `action` se envia por GET a la URL actual y los datos personales quedan en la query [doc:https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-attributes@2026-10-02]
- Pasar `noopener` o `noreferrer` a `openPopup` devuelve null y deja sin forma de navegar o cerrar el popup [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/open@2026-10-02]
- Asignar `popup.location.href` cuando la persona ya cerro la pestana: revisar `popup.closed` antes y caer al CTA [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/open@2026-10-02]
- Navegar el popup solo a `attrs.zoomLink` ya validado por `safeZoomLink`, nunca a `redirect_url` ni a nada de la respuesta [repo:src/core/url.ts:60]
- `redirect_url` viene en la respuesta de exito y el schema lo acepta: el controlador no debe usarlo (thank-you inline) [repo:src/core/response.ts:16]
- Las llaves de `fieldErrors` del servidor son ids de Elementor; pasarlas tal cual a `showFieldErrors` no marca ningun campo si s7 indexa por llave camelCase [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/ajax-handler.php#L248-L252@84c616b]
- `{ eventID: undefined }` no compila con `exactOptionalPropertyTypes`; construir el objeto solo si hay `aanumber` [repo:tsconfig.json:5]
- Un hook async que rechaza no lo atrapa un `try/catch` sin await: hace falta `.catch` en el thenable [ref:https://github.com/segmentio/analytics-next/blob/2d6d5530180489c45675fe9537a42745df9a847e/packages/core/src/queue/delivery.ts#L4-L10@2d6d553]
- Honeypot lleno: muestra thank-you pero NO dispara conversiones, porque no hubo `success:true` [repo:docs/specs/01-requisitos.md:63]
- No enviar email ni telefono a gtag/fbq: enhanced conversions sigue pendiente (D-28) [repo:docs/specs/02-decisiones.md:36]
- Contexto jsdom: `window.open` devuelve undefined y emite `jsdomError`; los tests siempre inyectan `openPopup` y nunca tocan el real [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/lib/jsdom/browser/Window.js#L921@0a117f4]
- Contexto jsdom: no hay transient activation real, asi que ningun unitario prueba el bloqueador; se prueba el orden (open llamado antes que submit) con mocks [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/lib/jsdom/living/nodes/HTMLFormElement-impl.js#L106-L110@0a117f4]
- Contexto jsdom: `requestSubmit` dispara `submit`; si el handler no cancela, jsdom emite "not implemented" en vez de navegar [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/lib/jsdom/living/nodes/HTMLFormElement-impl.js#L106-L110@0a117f4]
- Contexto vitest: stubs de `gtag`/`dataLayer`/`fbq` con `vi.stubGlobal` y `vi.unstubAllGlobals` en afterEach, o un test contamina al siguiente [doc:https://vitest.dev/api/vi@5.0.3]
- Contexto vitest: el timeout de 15 s de CA-12 se prueba con `vi.useFakeTimers` y `advanceTimersByTimeAsync`, no esperando [doc:https://vitest.dev/api/vi@5.0.3]
- Contexto navegador in-app (Instagram/Facebook, WKWebView): `window.open` con `_blank` puede no abrir nada; solo el CTA salva el acceso a Zoom [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/api/Window.json#L3717@f2dd714]
- Contexto Playwright (s13): ahi si hay gesto real; el e2e es el lugar para comprobar que el popup abre y que `opener` es null [doc:https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event@2026-10-02]
- Contexto bundle esbuild: el controlador no importa nada de s7 en tiempo de test si la UI se inyecta; el bundle si la une via `controller.create` en el montaje [repo:docs/specs/04-arquitectura.md:127]

## 9. Incertidumbre

- ASSUMPTION: en Safari iOS 15, un `window.open("about:blank","_blank")` sincrono dentro del `submit` disparado por la tecla "Ir" del teclado cuenta como gesto y no se bloquea. prueba: iPhone con iOS 15 (o simulador), Safari con bloqueo de popups activo, enviar con "Ir" y con toque al boton y registrar si `openPopup()` devuelve ventana
- ASSUMPTION: en Instagram/Facebook in-app sobre iOS, `window.open` devuelve null (y no una ventana inerte), de modo que el controlador sabe que fallo. prueba: abrir el harness desde un DM de Instagram en iOS, loggear `openPopup() === null` y `popup.closed`
- ASSUMPTION: cerrar el popup con `popup.close()` en iOS Safari devuelve a la persona a la pestana de la landing, donde ve "resultado desconocido". prueba: forzar `unknown` en el harness (timeout) en iOS Safari y observar la pestana activa
- ASSUMPTION: s7 indexa `showFieldErrors` por la llave de `LeadValues`, no por el id de Elementor. prueba: leer `src/ui/render.ts` cuando s7 llegue a main y comparar con las llaves de `errors` de una respuesta real de rechazo
- [NEEDS CLARIFICATION: Karen - `scheduleState` es de s10 pero s8 la usa: (a) inyectarla en `ControllerDeps` y que s10 la implemente, o (b) adelantarla a s8?]
- [NEEDS CLARIFICATION: Karen - la API de s8 no recibe las funciones de s7 ni define `InstanceContext`: aceptar un puerto de UI inyectado (opcion 5A) para no depender del codigo de s7?]
- [NEEDS CLARIFICATION: Karen - la nota de `docs/review/s03-review.md` pide "noopener,noreferrer" (D-12 solo dice `opener = null`), que es incompatible con navegar el popup despues; confirmar que basta `opener = null` y que se acepta enviar el origen de la landing como Referer a Zoom]
- [NEEDS CLARIFICATION: Karen - en `rejected`, mostrar el `message` del servidor como texto secundario (con `<br>` literal) o solo el mensaje del diccionario?]

## 10. Checklist de estandar

- [ ] `event.preventDefault()` es la primera sentencia del handler de `submit` (test: un error lanzado despues no provoca navegacion ni GET)
- [ ] Dos `submit` seguidos (y `requestSubmit` + click) producen un solo llamado a `deps.submit` (CA-11)
- [ ] El lock se libera y `setBusy(false)` corre en `finally` para `ok`, `rejected`, `unknown` y si un paso del exito lanza
- [ ] Honeypot lleno: cero llamadas a `submit`, a `openPopup` y a hooks; se muestra thank-you (CA-08)
- [ ] Validacion fallida: cero `openPopup`, foco en el primer campo invalido en orden del DOM
- [ ] `scheduleState` distinto de `open` en el submit: cero `openPopup` y cero `submit` (CA-21)
- [ ] En modo webinar, `openPopup` se llama antes que `deps.submit` y sin await intermedio (test por orden de llamadas de mocks)
- [ ] `openPopup` nunca pasa `noopener`/`noreferrer`; tras abrir, `popup.opener === null`
- [ ] `ok`: el exito se pinta antes de navegar el popup, el popup navega exactamente a `attrs.zoomLink`, y los hooks corren despues (CA-16, RF-14)
- [ ] `rejected` y `unknown`: `popup.close()` llamado y cero hooks de analitica
- [ ] `openPopup` devuelve null o el popup esta `closed`: no lanza y el CTA de Zoom queda visible; en exito webinar el CTA se muestra siempre
- [ ] `unknown`: estado con `errors.unknownResult` y boton de reintento; ningun `submit` extra hasta pulsarlo, y el reintento repite validacion y popup dentro del click (CA-12, CA-13)
- [ ] `message` y `fieldErrors` del servidor con `<img src=x onerror=...>` quedan como texto literal; ningun `innerHTML` en controller ni states (CA-14)
- [ ] `gtag` que lanza, `fbq` ausente y un hook async que rechaza: el exito no cambia, los demas hooks se llaman y no hay unhandled rejection (CA-15)
- [ ] Con `aanumber`: `transaction_id`, `eventID` y el push de `dataLayer` lo llevan; sin `aanumber`, ningun ID inventado ni `eventID: undefined`
- [ ] Ningun hook recibe email, telefono ni nombre
- [ ] Ningun test usa el `window.open` de jsdom; globals de analitica se restauran con `vi.unstubAllGlobals`

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | HTML Standard: window open steps, opener, rules for choosing a navigable | WHATWG | living, source @eeb895f | 2026-10-02 | high |
| 2 | HTML Standard: user activation | WHATWG | living | 2026-10-02 | high |
| 3 | HTML Standard: implicit submission y form submission algorithm | WHATWG | living, source @eeb895f | 2026-10-02 | high |
| 4 | Window.open(), Window.opener, Node.textContent, DOMParser.parseFromString, Referrer-Policy | MDN | 2026-10-02 | 2026-10-02 | high |
| 5 | Bug 225559: user gesture tracking | WebKit | abierto | 2026-10-02 | high |
| 6 | The User Activation API | WebKit blog | 2023-02-15 | 2026-10-02 | medium |
| 7 | HTML5 Security Cheat Sheet (tabnabbing) | OWASP | 2026-10-02 | 2026-10-02 | medium |
| 8 | Forms tutorial: notifications | W3C WAI | 2026-10-02 | 2026-10-02 | high |
| 9 | Google tag integration guide | Google | 2026-10-02 | 2026-10-02 | high |
| 10 | Deduplicate Pixel and server events | Meta | 2026-10-02 | 2026-10-02 | high |
| 11 | Vitest vi API | Vitest | 5.0.3 | 2026-10-02 | high |
| 12 | lib.dom (dom.generated.d.ts) | Microsoft TypeScript | v5.9.3 @c63de15 | 2026-10-02 | high |
| 13 | jsdom Window.js y HTMLFormElement-impl.js | jsdom | v30.1.1 @0a117f4 | 2026-10-02 | high |
| 14 | browser-compat-data api/Window.json | MDN | @f2dd714 | 2026-10-02 | medium |
| 15 | auth0-spa-js Auth0Client.ts | Auth0 | @49ccb51 | 2026-10-02 | high |
| 16 | govuk-frontend button.mjs | GDS | @283cc58 | 2026-10-02 | high |
| 17 | analytics-next core delivery.ts | Segment | @2d6d553 | 2026-10-02 | high |
| 18 | proelements ajax-handler.php | proelements (redistribucion GPL de Elementor Pro) | @84c616b | 2026-10-02 | medium |
