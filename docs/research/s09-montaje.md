# Reference Brief: Montaje s09 (idempotente, tardio, multi-instancia) en light DOM sobre WordPress/Elementor

Slug: s09-montaje | Nivel: standard | Fecha: 2026-10-02 | Estado: APROBADO
Versiones: typescript=5.9.3, vitest=5.0.3, jsdom=30.1.1, esbuild=0.28.2
Verificador: research-verifier 2026-10-02 ESCALATE

## 1. Pregunta y decisiones abiertas

Como montar los formularios `lead` e `interest` en contenedores `div[data-atfx-leadkit]` de landings WordPress/Elementor de forma idempotente (CA-01), tardia (CA-02, popups de Elementor) y multi-instancia (CA-03), cableando el controlador de s08 con la UI de s07.

Decisiones grises (una por bloque en las secciones 5 y 9):

1. Observador: `MutationObserver` sobre `document.body` con `childList` + `subtree`, filtro de nodos agregados, costo, desconexion, y que hacer si el bundle corre antes de que exista `body`.
2. Idempotencia: `WeakSet` + `data-atfx-mounted` ante doble carga del mismo bundle (dos `script` iguales), y `window.atfxLeadkit` extendido sin pisarse entre los entries `lead` e `interest`.
3. `instanceId` determinista (contador + key) y colision entre dos copias de bundle en la misma pagina.
4. Adaptador del puerto `FormUi` de s08 sobre las funciones de `render.ts` y `states.ts`: `focusFirstInvalid`, `showState` con contenedor de estados que no destruya el host ni el form, y el estado `closed` como placeholder.
5. D-11 (pendiente de Karen): pais preseleccionado por `data-country` que imprime el servidor desde `CF-IPCountry`, contra no preseleccionar nada. Impacto en s9 y en privacidad. Se recomienda, no se decide.

## 2. Estado actual

- s9 esta BLOQUEADA solo por D-11 y depende de s8 [repo:docs/specs/sessions/s09-montaje.md:3]
- La API pedida es `mountAll(definition, root?)`, `observe(definition)` que devuelve disconnect, y `window.atfxLeadkit` con `version` y `mount(root?)` [repo:docs/specs/sessions/s09-montaje.md:20]
- El tipo global declarado en la spec solo tiene `readonly version: string` y `mount(root?: ParentNode): void` [repo:docs/specs/sessions/s09-montaje.md:22]
- El selector es `[data-atfx-leadkit="<key>"]` y los contenedores de otro formulario se ignoran en silencio [repo:docs/specs/sessions/s09-montaje.md:26]
- La spec pide `WeakSet` mas atributo `data-atfx-mounted` para CA-01 [repo:docs/specs/sessions/s09-montaje.md:27]
- La spec pide `instanceId` = contador del modulo + key, sin `Math.random` [repo:docs/specs/sessions/s09-montaje.md:28]
- La spec pide `MutationObserver` sobre `document.body` con `childList` y `subtree`, mirando solo nodos agregados que sean o contengan el selector [repo:docs/specs/sessions/s09-montaje.md:29]
- La spec pide definir `window.atfxLeadkit` una vez y extenderlo sin pisarlo si ya existe de otro entry [repo:docs/specs/sessions/s09-montaje.md:31]
- La version solo se imprime en consola si algun contenedor tiene `data-debug` [repo:docs/specs/sessions/s09-montaje.md:33]
- Si el estado de agenda no es `open` al montar, s9 pinta un placeholder cerrado con texto del diccionario [repo:docs/specs/sessions/s09-montaje.md:34]
- Los tests pedidos son CA-01, CA-02 con `await` de microtareas, dos formularios distintos, contenedor desconocido ignorado y `mount()` publico [repo:docs/specs/sessions/s09-montaje.md:39]
- CA-01: con un contenedor montado, si el script corre otra vez, sigue habiendo un solo `form` [repo:docs/specs/01-requisitos.md:126]
- CA-02: un contenedor insertado 500 ms despues de la carga queda montado sin llamar a nada [repo:docs/specs/01-requisitos.md:127]
- CA-03: con dos formularios no hay ids repetidos y cada `label[for]` apunta a su propio campo [repo:docs/specs/01-requisitos.md:128]
- La arquitectura prohibe estado global mutable salvo el `WeakSet` de nodos montados [repo:docs/specs/04-arquitectura.md:17]
- El flujo de arquitectura evalua la agenda al montar y, si no es `open`, pinta el estado y termina [repo:docs/specs/04-arquitectura.md:127]
- D-11 sigue PENDIENTE: pais desde `data-country` puesto por el servidor con `CF-IPCountry`, o nada, terceros solo con consentimiento [repo:docs/specs/02-decisiones.md:19]
- El puerto `FormUi` de s08 tiene `readValues`, `setBusy`, `showFieldErrors`, `focusFirstInvalid` y `showState` [repo:src/core/controller.ts:47]
- `bindController(form, ctx, deps)` agrega el listener de submit al form que recibe [repo:src/core/controller.ts:72]
- El controlador cancela el submit nativo porque un form sin action haria GET a la URL actual con los valores en la query [repo:src/core/controller.ts:75]
- El reintento del estado `unknown` llama `form.requestSubmit()` sobre el mismo form [repo:src/core/controller.ts:232]
- La agenda entra como dependencia inyectada `schedule(attrs, now)` y no hay implementacion en `src/core/time.ts` todavia [repo:src/core/controller.ts:66]
- `scheduleState` esta especificada en s10, que depende de s9 [repo:docs/specs/sessions/s10-caducidad-cliente.md:24]
- `openAboutBlank` es el envoltorio que s9 puede inyectar como `openPopup` [repo:docs/review/s08-handoff.md:95]
- `render.ts` exporta un `FormDefinition` que solo tiene `key` [repo:src/ui/render.ts:19]
- s07 dejo dicho que s9 puede sustituir ese `FormDefinition` [repo:docs/review/s07-handoff.md:56]
- `renderForm` ya preselecciona pais y prefijo desde `attrs.country` via `resolveFieldDefaults` [repo:src/ui/render.ts:36]
- `readValues(form, instanceId)` lee los campos y el honeypot del form [repo:src/ui/render.ts:52]
- `showFieldErrors(form, errors)` pinta errores por campo [repo:src/ui/render.ts:66]
- `setBusy(form, busy)` pone `aria-busy` y deshabilita el boton de envio [repo:src/ui/render.ts:85]
- Cada control lleva `data-atfx-field` con el nombre del campo, que sirve para enfocarlo [repo:src/ui/render.ts:198]
- Los ids de campo son `atfx-<campo>-<instanceId>` [repo:src/ui/fields.ts:38]
- Los renderers de estado vacian su `parent` con `replaceChildren` [repo:src/ui/states.ts:8]
- `renderUnknownResult` tambien vacia su `parent` con `replaceChildren` [repo:src/ui/states.ts:22]
- `renderThankYou` tambien vacia su `parent` con `replaceChildren` [repo:src/ui/states.ts:34]
- El texto `Intentar de nuevo` esta fijo en `states.ts`, fuera del diccionario [repo:src/ui/states.ts:3]
- No existe renderer para el estado `closed`; s07 lo dejo para s9 junto al adaptador `FormUi` [repo:docs/review/s07-review.md:29]
- `parseMountAttrs` lanza `UnknownFormError` si `data-atfx-leadkit` no es `lead` ni `interest` [repo:src/core/attrs.ts:72]
- `parseMountAttrs` ya normaliza `data-country` a ISO2 y descarta `XX` y `T1` [repo:src/core/attrs.ts:80]
- `parseMountAttrs` pide contexto `pageUrl` y `closedUrlAllowlist` [repo:src/core/attrs.ts:101]
- `injectStylesOnce` ya es idempotente entre bundles porque consulta el DOM, no estado del modulo [repo:src/styles/styles.ts:10]
- Los entries hoy solo inyectan estilos [repo:src/entries/lead.ts:4]
- Cada entry se empaqueta como IIFE con target es2019 [repo:esbuild.config.mjs:37]
- La version se inyecta con `define` como `__LEADKIT_VERSION__` [repo:esbuild.config.mjs:47]
- Los tests corren en jsdom [repo:vitest.config.ts:5]
- La cobertura excluye `src/entries/**`, asi que la logica que quede en los entries no cuenta para el umbral del 80% [repo:vitest.config.ts:10]
- El target de navegador es Safari iOS 15+ (RNF-02) [repo:docs/research/s07-ui.md:54]
- El repo prohibe a Claude llamar a www.atfxlatam.com, admin-ajax real, Salesforce o geo-IP, asi que las pruebas contra produccion de la seccion 9 son de Karen o IT [repo:CLAUDE.md:10]
Contextos: landing en produccion (WordPress + Elementor, bundle IIFE por formulario cargado con Elementor Pro Custom Code, Cloudflare delante); popup de Elementor (contenedor insertado tarde); editor/preview de Elementor; vitest + jsdom 30.1.1; build esbuild (src/build.test.ts); e2e Playwright de s13 (aun no existe e2e/); cache HTML (Cloudflare o plugin de cache de WordPress) para D-11

## 3. Fuentes primarias

- `subtree` extiende la observacion a todo el subarbol del target y `childList` reporta altas y bajas de hijos [doc:https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe@2025-06-23]
- Tras quitar una parte del subarbol, el observador sigue viendo cambios en ella solo hasta que se entrega el registro de la baja [doc:https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe@2025-06-23]
- Los registros se entregan en una microtarea: "queue a mutation observer microtask" encola una sola vez "notify mutation observers" [doc:https://dom.spec.whatwg.org/#queue-a-mutation-observer-compound-microtask@2026-09-24]
- "notify mutation observers" recorre los observadores pendientes en el orden en que se agregaron e invoca cada callback con "report", asi que una excepcion se reporta y no frena a los demas observadores [doc:https://dom.spec.whatwg.org/#notify-mutation-observers@2026-09-24]
- "queue a mutation record" recorre los ancestros inclusivos del target y agrega cada observador interesado a la lista de pendientes; el orden entre observadores del mismo nodo es el de registro [doc:https://dom.spec.whatwg.org/#queue-a-mutation-record@2026-09-24]
- `disconnect()` quita los registros del observador de cada nodo y vacia su cola de registros [doc:https://dom.spec.whatwg.org/#dom-mutationobserver-disconnect@2026-09-24]
- Las citas DOM anteriores se leyeron en el source del estandar, commit b2e32dc [ref:https://github.com/whatwg/dom/blob/b2e32dc730eb0dc0cce1a431393fe4a17fda1d54/dom.bs#L3979-L4030@b2e32dc]
- `document.body` es `null` si todavia no existe `body` (script en el head durante el parseo) [doc:https://developer.mozilla.org/en-US/docs/Web/API/Document/body@2025-08-19]
- `readyState` es `loading` mientras el parser trabaja e `interactive` cuando el documento ya se parseo [doc:https://developer.mozilla.org/en-US/docs/Web/API/Document/readyState@2026-01-02]
- Un script clasico `defer` corre despues del parseo y antes de `DOMContentLoaded`; uno `async` corre apenas llega, incluso antes de terminar el parseo [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script@2026-05-09]
- El HTML Standard define el flag "already started" por elemento `script`, de modo que dos elementos con el mismo `src` se preparan y ejecutan cada uno [doc:https://html.spec.whatwg.org/multipage/scripting.html#already-started@2026-10-02]
- El formato IIFE de esbuild envuelve el codigo en una funcion para que sus variables no choquen con el scope global [doc:https://esbuild.github.io/api/#format-iife@0.28]
- `WeakSet` guarda objetos de forma debil, no es iterable y la igualdad es por identidad [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet@consultado-2026-10-02]
- `replaceChildren()` quita todos los hijos del elemento y pone los nuevos; es Baseline desde octubre de 2020 [doc:https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceChildren@2024-07-12]
- El algoritmo de submit empieza con "If form cannot navigate, then return", antes de disparar el evento `submit` [doc:https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#concept-form-submit@2026-10-02]
- Un elemento que no es `a` y no esta conectado "cannot navigate" [ref:https://github.com/whatwg/html/blob/0cd32204c6d9408be0a42cb15c86145e21deab9d/source#L27197-L27205@0cd3220]
- Una region viva debe existir en el DOM antes de cambiar su contenido; lo mas fiable es incluirla en el markup inicial [doc:https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions@2026-09-11]
- Elementor Pro Custom Code permite elegir ubicacion (head, body start, body end) y prioridad [doc:https://elementor.com/blog/introducing-pro-3-1/@2025-12-02]
- Elementor Pro 2.7 documento los eventos jQuery `elementor/popup/show` y `elementor/popup/hide` [doc:https://developers.elementor.com/elementor-pro-2-7-popup-events/@2019-08-29]
- En Elementor 3.9 se reporto que `elementor/popup/show` dejo de dispararse respecto a 3.8 (issue con etiqueta solved) [doc:https://github.com/elementor/elementor/issues/20708@elementor-3.9]
- Cloudflare IP geolocation agrega `CF-IPCountry` a todas las peticiones hacia el origen y esta en todos los planes [doc:https://developers.cloudflare.com/network/ip-geolocation/@2026-08-27]
- La cache key por defecto de Cloudflare es la URL completa mas algunos headers; no incluye el pais [doc:https://developers.cloudflare.com/cache/how-to/cache-keys/@2026-09-29]
- Incluir el pais (`geo`) en la cache key es una opcion solo de Enterprise [doc:https://developers.cloudflare.com/cache/how-to/cache-keys/@2026-09-29]
- El CDN de Cloudflare no cachea HTML ni JSON por defecto [doc:https://developers.cloudflare.com/cache/concepts/default-cache-behavior/@2026-09-14]
- `/cdn-cgi/trace` esta documentado solo como ayuda de troubleshooting, sin contrato de estabilidad [doc:https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/@2026-04-20]
- jsdom 30.1.1 implementa la microtarea de mutation observers con `Promise.resolve().then` siguiendo el estandar [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/lib/jsdom/living/helpers/mutation-observers.js#L155-L166@0a117f4]

## 4. Implementaciones de referencia

- Stimulus (Hotwired/37signals, base de Rails), ultimo commit en main 2026-07-25: su `ElementObserver` es el patron de montaje por selector con `MutationObserver` [ref:https://github.com/hotwired/stimulus/blob/4145d2672562389ba06bc38138761edf86450899/src/mutation-observers/element_observer.ts#L17@4145d26]
- Stimulus llama `observe()` y enseguida `refresh()` (escaneo inicial), en ese orden, para no perder nodos entre ambos pasos [ref:https://github.com/hotwired/stimulus/blob/4145d2672562389ba06bc38138761edf86450899/src/mutation-observers/element_observer.ts#L28-L34@4145d26]
- Stimulus descarta nodos que no son `ELEMENT_NODE` y nodos ya desconectados antes de procesarlos [ref:https://github.com/hotwired/stimulus/blob/4145d2672562389ba06bc38138761edf86450899/src/mutation-observers/element_observer.ts#L139-L151@4145d26]
- Stimulus busca coincidencias en el nodo agregado y en sus descendientes (`matches` mas `querySelectorAll`) [ref:https://github.com/hotwired/stimulus/blob/4145d2672562389ba06bc38138761edf86450899/src/mutation-observers/selector_observer.ts#L76-L82@4145d26]
- Stimulus espera `DOMContentLoaded` solo si `readyState` es `loading`; si no, arranca enseguida [ref:https://github.com/hotwired/stimulus/blob/4145d2672562389ba06bc38138761edf86450899/src/core/application.ts#L110-L118@4145d26]
- Alpine.js (framework muy usado, commit en main 2026-09-29) observa el documento con `childList` y `subtree` desde un solo observador del modulo [ref:https://github.com/alpinejs/alpine/blob/da60871ea404e23e46938c9e6137f05258614c63/packages/alpinejs/src/mutation.js#L54@da60871]
- Alpine ignora nodos no elemento, trata alta mas baja del mismo nodo como movimiento, y salta nodos ya inicializados [ref:https://github.com/alpinejs/alpine/blob/da60871ea404e23e46938c9e6137f05258614c63/packages/alpinejs/src/mutation.js#L151-L161@da60871]
- Alpine marca los nodos inicializados con una propiedad JS (`_x_marker`) de un contador del modulo, no con un atributo [ref:https://github.com/alpinejs/alpine/blob/da60871ea404e23e46938c9e6137f05258614c63/packages/alpinejs/src/lifecycle.js#L113@da60871]
- Alpine avisa si arranca sin `document.body` y pide `defer` en su `script` [ref:https://github.com/alpinejs/alpine/blob/da60871ea404e23e46938c9e6137f05258614c63/packages/alpinejs/src/lifecycle.js#L15@da60871]
- Typeform embed (SDK oficial del vendor) marca cada contenedor con `data-tf-loaded="true"` y salta los ya marcados [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/packages/embed/src/initializers/initialize.ts#L28-L44@ffcede3]
- Typeform no usa observador: corre `load` en `DOMContentLoaded` o enseguida segun `readyState` y expone `load()` para contenido tardio [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/packages/embed/src/browser.ts#L40-L44@ffcede3]
- Cal.com embed (snippet oficial, commit 2026-09-20) define el global con `C.Cal = C.Cal || ...` y registra cada namespace con `ns[namespace] = ns[namespace] || api` para no pisarlo si el snippet se re-ejecuta [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-snippet/src/index.ts#L36-L58@54343aa]

## 5. Opciones

Bloque 1. Arranque y observador

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| 1A. Si `readyState` es `loading`, esperar `DOMContentLoaded`; luego `observe(body)` y despues `mountAll(document)` (orden de Stimulus) | Funciona con `script` en head sin `defer`, con `async` y en body end; sin hueco entre escaneo y observador | Un form en head sin defer aparece al terminar el parseo, no antes | baja | Si |
| 1B. Observar `document.documentElement` desde el head para montar mientras el parser inserta | Montaje mas temprano | Mas registros durante el parseo y se aparta de la spec (body) | media | No |
| 1C. Sin observador, solo `window.atfxLeadkit.mount()` (Typeform) | Cero costo de observacion | Rompe CA-02: obliga a cablear cada popup, y los eventos de popup de Elementor fallaron entre versiones | baja | No |
| 1D. Escuchar `elementor/popup/show` | Costo cero fuera del popup | Acopla a la version de Elementor y a jQuery | media | No |

Bloque 2. Idempotencia y global

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| 2A. `WeakSet` del modulo + `data-atfx-mounted` puesto antes de renderizar; el atributo es la guarda entre ejecuciones | Lo que pide la spec; cubre dos `script` iguales y lead + interest; estilo Typeform | Un clon (`cloneNode`) hereda el atributo sin listeners y queda como form muerto | baja | Si, con el chequeo de clon de 2C |
| 2B. Solo `WeakSet` del modulo | Sin huella en el DOM | No cubre CA-01 si el script corre dos veces: cada IIFE crea su propio `WeakSet` | baja | No |
| 2C. 2A mas detectar clon: atributo presente, nodo fuera del `WeakSet` y el `form` interno fuera de un `WeakSet` de forms enlazados compartido en `window.atfxLeadkit` | Distingue clon muerto de montado por otra copia | Un `WeakSet` en `window` es estado global compartido; hay que aceptarlo como el unico permitido | media | Si, si Karen acepta el global; si no, 2A y documentar la trampa |
| 2D. Global: `window.atfxLeadkit = window.atfxLeadkit ?? crear()` y `register(key, montador)` por key; `mount(root)` recorre el registro (patron Cal.com) | lead e interest conviven; re-ejecutar no pisa; `mount()` monta ambos | `version` unico es ambiguo con dos bundles de versiones distintas | baja | Si |

Bloque 3. instanceId

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| 3A. Contador del modulo + key (`lead-1`) | Lo que pide la spec; determinista | Dos copias del mismo bundle reinician el contador; colision posible si ambas montan algo | baja | Aceptable solo con 3B |
| 3B. 3A + avanzar el contador mientras `document.getElementById(fieldId("firstName", id))` exista | Determinista dado el DOM; sin estado global extra; cubre copias y versiones mezcladas | Una consulta por montaje | baja | Si |
| 3C. Contador compartido en `window.atfxLeadkit` | Unico por pagina | Estado global mutable fuera de lo que permite la arquitectura | baja | No |

Bloque 4. Adaptador FormUi

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| 4A. Host con dos hijos: `form` y un contenedor de estados (`role="status"`, presente desde el montaje); `showState` pinta solo en ese contenedor; thank-you oculta el form (`hidden`); rejected y unknown dejan el form conectado | `requestSubmit` del reintento funciona; region viva registrada antes; los renderers de s07 se reusan tal cual | Un nodo mas por instancia | baja | Si |
| 4B. `showState` pinta sobre el host con `replaceChildren` | Menos nodos | Desconecta el form: el reintento de unknown no dispara `submit` y la region viva nace con el contenido | baja | No |

Bloque 5. D-11 (decide Karen)

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| 5A. El servidor imprime `data-country` desde `CF-IPCountry` | Primera parte, nada sale a terceros; s9 no cambia codigo (attrs y render ya lo usan) | Con HTML cacheado sin geo en la key, todos reciben el pais del primero; requiere cambio en WordPress | media | Recomendada solo si el HTML de las landings no se cachea o se excluye de cache |
| 5B. Nada: selects vacios | Cero procesamiento geo; sin trampa de cache | Un paso mas para la persona | baja | Recomendada por defecto mientras no se compruebe la cache |
| 5C. Leer `loc` de `/cdn-cgi/trace` desde el cliente | Primera parte y sin problema de cache | Endpoint de troubleshooting sin contrato; una peticion mas | media | No |

## 6. Evidencia en contra

- Contra 1A (observar todo el body): con `subtree` el callback corre en cada microtarea con cambios del DOM del host, incluidos sliders y animaciones de Elementor; se acepta porque el filtro descarta no-elementos y nodos sin el selector antes de cualquier trabajo, igual que Stimulus y Alpine [ref:https://github.com/hotwired/stimulus/blob/4145d2672562389ba06bc38138761edf86450899/src/mutation-observers/element_observer.ts#L139-L151@4145d26]
- Contra 1A: el observador nunca se desconecta solo; se acepta porque las landings no son SPA y el popup puede llegar en cualquier momento; `observe()` devuelve el disconnect para tests [doc:https://dom.spec.whatwg.org/#dom-mutationobserver-disconnect@2026-09-24]
- Contra 2A: el atributo sobrevive a `cloneNode`, asi que un clon del contenedor parece montado pero su form no tiene listener y un submit nativo haria GET con datos personales en la URL; se resuelve con 2C o, si no se acepta el global, se acepta y se documenta como trampa con prueba en s13 [repo:src/core/controller.ts:75]
- Contra 2D: un global en `window` es escribible por cualquier script del host; se acepta porque el host ya ejecuta codigo en el mismo scope global que el widget, y el IIFE solo aisla las variables internas, no protege de la pagina [doc:https://esbuild.github.io/api/#format-iife@0.28]
- Contra 4A: los renderers de s07 llaman `replaceChildren` sobre el `parent`, y pasar el host por error borra el form; se resuelve fijando por test que tras `rejected` y `unknown` el form sigue conectado [repo:src/ui/states.ts:8]
- Contra 5B (recomendacion por defecto): la persona elige pais y prefijo a mano; se acepta hasta probar que el HTML no se cachea, porque un pais equivocado preseleccionado puede terminar en Salesforce si nadie lo corrige [doc:https://developers.cloudflare.com/cache/how-to/cache-keys/@2026-09-29]

## 7. Ejemplares y anti-ejemplos

- Bien: observar primero y escanear despues (`observe` y luego `refresh`), sin hueco entre ambos pasos [ref:https://github.com/hotwired/stimulus/blob/4145d2672562389ba06bc38138761edf86450899/src/mutation-observers/element_observer.ts#L28-L34@4145d26]
- Bien: el arranque espera `DOMContentLoaded` solo con `readyState === "loading"` [ref:https://github.com/hotwired/stimulus/blob/4145d2672562389ba06bc38138761edf86450899/src/core/application.ts#L110-L118@4145d26]
- Bien: buscar el selector en el nodo agregado y en su subarbol, porque `addedNodes` solo trae la raiz insertada [ref:https://github.com/hotwired/stimulus/blob/4145d2672562389ba06bc38138761edf86450899/src/mutation-observers/selector_observer.ts#L76-L82@4145d26]
- Bien: global extendido sin pisar con `ns[namespace] = ns[namespace] || api` [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-snippet/src/index.ts#L56-L58@54343aa]
- Bien: marca de montado en el DOM leida antes de inicializar [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/packages/embed/src/initializers/initialize.ts#L28@ffcede3]
- Anti-ejemplo: Typeform pone la marca despues de un `await` y del factory; dos llamadas solapadas pueden montar el mismo nodo dos veces; en s9 la marca va antes de renderizar [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/packages/embed/src/initializers/initialize.ts#L35-L44@ffcede3]
- Anti-ejemplo: pintar estados sobre el host con `replaceChildren` desconecta el form y su reintento ya no envia [repo:src/ui/states.ts:22]
- Anti-ejemplo: un `script` sin `defer` en head que llama `observe(document.body)` lanza porque `body` es `null` [doc:https://developer.mozilla.org/en-US/docs/Web/API/Document/body@2025-08-19]

## 8. Trampas

- Produccion: `addedNodes` trae solo la raiz insertada; un popup que inserta un arbol con el contenedor dentro no coincide con `matches` y hay que buscar tambien con `querySelectorAll` [doc:https://dom.spec.whatwg.org/#queue-a-mutation-record@2026-09-24]
- Produccion: una excepcion en el callback del observador corta el resto de ese lote para este observador; cada contenedor se monta dentro de su propio try/catch [doc:https://dom.spec.whatwg.org/#notify-mutation-observers@2026-09-24]
- Produccion: el propio render del widget dispara el observador (inserta el form en el host); el filtro debe descartarlo sin trabajo [doc:https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe@2025-06-23]
- Produccion: solo se observa `childList`; un contenedor al que se le pone `data-atfx-leadkit` despues de insertarlo no se monta solo y requiere `window.atfxLeadkit.mount()` [doc:https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe@2025-06-23]
- Produccion: dos `script` iguales ejecutan dos IIFE con su propio `WeakSet`, contador y observador; solo el atributo o un global compartido evita el doble montaje [doc:https://html.spec.whatwg.org/multipage/scripting.html#already-started@2026-10-02]
- Produccion: con dos copias del bundle, el observador registrado primero en `body` recibe primero los registros y reclama el contenedor [doc:https://dom.spec.whatwg.org/#queue-a-mutation-record@2026-09-24]
- Produccion: el reintento del estado unknown usa `form.requestSubmit()`, que no hace nada si el form esta desconectado [repo:src/core/controller.ts:232]
- Produccion: la region de estados debe existir vacia desde el montaje para que el lector de pantalla anuncie el cambio [doc:https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions@2026-09-11]
- Produccion: `parseMountAttrs` lanza con un form desconocido; el selector exacto por key lo evita, pero el montaje debe atraparlo igual [repo:src/core/attrs.ts:72]
- Produccion: no hay `scheduleState` hasta s10; s9 tiene que inyectar una agenda provisional que al menos cierre con `scheduleInvalid` para no fallar abierto [repo:docs/specs/sessions/s10-caducidad-cliente.md:24]
- Produccion: `__LEADKIT_VERSION__` existe solo como `define` de esbuild; TypeScript necesita su `declare const` y vitest no lo define [repo:esbuild.config.mjs:47]
- Produccion (D-11 con 5A): el HTML con `data-country` cacheado sin pais en la key sirve el pais de un visitante a todos [doc:https://developers.cloudflare.com/cache/how-to/cache-keys/@2026-09-29]
- Popup de Elementor: `elementor/popup/show` dejo de dispararse en 3.9 segun el issue, por eso el montaje tardio no debe depender de esos eventos [doc:https://github.com/elementor/elementor/issues/20708@elementor-3.9]
- Editor/preview de Elementor: no se verifico si Custom Code corre dentro del editor; ver seccion 9 [doc:https://elementor.com/blog/introducing-pro-3-1/@2025-12-02]
- vitest + jsdom: los registros llegan en una microtarea encolada al mutar; el test inserta el nodo y hace `await` antes de afirmar (CA-02) [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/lib/jsdom/living/helpers/mutation-observers.js#L155-L166@0a117f4]
- vitest + jsdom: `document` y el global persisten entre tests del mismo archivo; cada test debe desconectar su observador y borrar `window.atfxLeadkit` [doc:https://dom.spec.whatwg.org/#dom-mutationobserver-disconnect@2026-09-24]
- vitest: la logica del global y del arranque debe vivir en `mount.ts`, porque `src/entries/**` esta fuera de la cobertura [repo:vitest.config.ts:10]
- Build esbuild: cada entry es una IIFE, asi que el `WeakSet` y el contador no se comparten entre lead e interest [doc:https://esbuild.github.io/api/#format-iife@0.28]
- e2e de s13: el caso de dos `script` iguales y el de clon solo se prueban de verdad en navegador real con `e2e/host.html` [repo:docs/specs/04-arquitectura.md:64]

## 9. Incertidumbre

- ASSUMPTION: el popup de Elementor mueve el nodo del popup al dialogo (appendChild) y no lo clona, asi que un contenedor ya montado conserva sus listeners. prueba: en una landing de staging con popup que contenga el form, abrir el popup y verificar que el submit vacio muestra errores sin cambiar la URL
- ASSUMPTION: ningun widget de Elementor usado en las landings (carrusel en loop, tabs) clona el contenedor del form. prueba: inventario de las landings con el form y comparar en consola el numero de `[data-atfx-mounted]` con el de forms que reaccionan al submit
- ASSUMPTION: Elementor Custom Code no se ejecuta dentro del editor, solo en el front. prueba: con el snippet activo, abrir el editor de una landing y revisar si aparece `style[data-atfx-leadkit-style]` en el iframe de preview
- ASSUMPTION: el HTML de las landings de ATFX no se cachea en Cloudflare ni en un plugin de cache de WordPress. prueba: Karen o IT revisan Cache Rules/APO en Cloudflare y el plugin de cache de WordPress (un agente no debe llamar al sitio, por CLAUDE.md)
- ASSUMPTION: la snippet de D-13 se pone en body end o con `defer`, de modo que `body` existe al correr. prueba: revisar la ubicacion configurada en Elementor Pro Custom Code del sitio; la opcion 1A funciona igual en cualquier ubicacion
- [NEEDS CLARIFICATION: D-11. Opciones: 5A `data-country` desde `CF-IPCountry` impreso por WordPress (requiere que el HTML no se cachee sin pais en la key), 5B nada, 5C `/cdn-cgi/trace`. Recomendacion: 5B por defecto y 5A cuando se compruebe la cache. En ambos casos el codigo de s9 es el mismo, porque `parseMountAttrs` y `renderForm` ya leen `data-country`; D-11 no deberia bloquear s9.]
- [NEEDS CLARIFICATION: contrato publico de `window.atfxLeadkit`. Con dos bundles de versiones distintas, `version` unico es ambiguo. Opciones: mantener `version` del primero que llego, o cambiar a `versions` por key. Tambien: aceptar un `WeakSet` compartido en el global (2C) como el unico estado global, ampliando el principio 4 de la arquitectura.]
- [NEEDS CLARIFICATION: agenda provisional en s9 antes de s10. Opciones: implementar ya `scheduleState` segun la spec de s10 (D-14 capa cliente esta aprobada), o un stub que solo cierre con `scheduleInvalid`.]

## 10. Checklist de estandar

- [ ] Si `document.readyState === "loading"`, el arranque espera `DOMContentLoaded`; si no, arranca enseguida; nunca llama `observe` con `body` nulo (test con `readyState` simulado)
- [ ] `observe()` registra el observador antes del escaneo inicial y devuelve una funcion que llama `disconnect()`
- [ ] El callback descarta nodos que no son `Element` y busca el selector en el nodo y en su subarbol (test: contenedor anidado dentro de un `div` insertado tarde queda montado)
- [ ] CA-02: insertar un contenedor despues del arranque y, tras `await` de microtareas, hay un solo `form` en el sin llamar a nada
- [ ] CA-01: correr el arranque dos veces (dos evaluaciones del modulo o dos `mountAll`) deja un solo `form` por contenedor
- [ ] `data-atfx-mounted` se pone antes de renderizar; un error al renderizar un contenedor no impide montar los demas del mismo lote
- [ ] Un contenedor con `data-atfx-leadkit="desconocido"` no se toca y no lanza
- [ ] lead e interest en la misma pagina: cada bundle solo monta su key, `window.atfxLeadkit` existe una vez y `mount()` monta ambos
- [ ] Re-ejecutar un entry no reemplaza el objeto `window.atfxLeadkit` ni un registro ya existente
- [ ] `instanceId` es determinista y unico en el documento aunque otra copia del bundle haya usado el mismo contador (test con ids preexistentes)
- [ ] CA-03: con dos instancias no hay ids repetidos y cada `label[for]` apunta a un control de su propio form
- [ ] El host tiene un contenedor de estados con `role="status"` presente y vacio desde el montaje
- [ ] Tras `rejected` y `unknown` el form sigue conectado y el boton de reintento dispara un nuevo `submit` (test de integracion render + controlador)
- [ ] Tras `thank-you` el form queda oculto o fuera y el mensaje esta en el contenedor de estados
- [ ] Con agenda no `open` al montar no hay `form` enviable y se ve el placeholder cerrado con texto del diccionario
- [ ] `focusFirstInvalid(field)` enfoca el control `[data-atfx-field=field]` del form de esa instancia
- [ ] `Intentar de nuevo` sale del diccionario por idioma
- [ ] La version solo se imprime si algun contenedor tiene `data-debug`; `__LEADKIT_VERSION__` tiene `declare const` y un valor en tests
- [ ] La logica del global y del arranque vive en `src/core/mount.ts` (cubierta por tests); los entries solo la llaman
- [ ] Cada test desconecta su observador y borra `window.atfxLeadkit` y los contenedores al terminar

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | MutationObserver.observe() | MDN | 2025-06-23 | 2026-10-02 | high |
| 2 | DOM Standard, Mutation observers (y source dom.bs b2e32dc) | WHATWG | 2026-09-24 | 2026-10-02 | high |
| 3 | HTML Standard, scripting y form submission (y source 0cd3220) | WHATWG | 2026-10-02 | 2026-10-02 | high |
| 4 | Document.body, Document.readyState, script, WeakSet, replaceChildren, ARIA live regions | MDN | 2024-07-12 a 2026-09-11 | 2026-10-02 | high |
| 5 | esbuild API, format iife | esbuild | docs vigentes (proyecto en 0.28.2) | 2026-10-02 | high |
| 6 | Introducing Elementor Pro 3.1 (Custom Code) | Elementor | 2025-12-02 | 2026-10-02 | medium |
| 7 | Elementor Pro 2.7 Popup Events | Elementor Developers | 2019-08-29 | 2026-10-02 | medium |
| 8 | Issue 20708, popup show en 3.9 | elementor/elementor | Elementor 3.9 | 2026-10-02 | medium |
| 9 | IP geolocation; Cache keys; Default cache behavior; /cdn-cgi/ endpoint | Cloudflare | 2026-04-20 a 2026-09-29 | 2026-10-02 | high |
| 10 | Stimulus element_observer, selector_observer, application | hotwired/stimulus | 4145d26 | 2026-10-02 | high |
| 11 | Alpine.js mutation.js, lifecycle.js | alpinejs/alpine | da60871 | 2026-10-02 | high |
| 12 | Typeform embed initialize.ts, browser.ts | typeform/embed | ffcede3 | 2026-10-02 | high |
| 13 | Cal.com embed-snippet | calcom/cal.com | 54343aa | 2026-10-02 | medium |
| 14 | jsdom mutation-observers.js | jsdom/jsdom | v30.1.1 (0a117f4) | 2026-10-02 | high |
