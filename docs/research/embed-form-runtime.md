# Reference Brief: arquitectura de runtime y UI del formulario embebible de leads ATFX

Slug: embed-form-runtime | Nivel: deep | Fecha: 2026-10-01 | Estado: ESCALADO
Versiones: gsap=3.15.0, zod=3.23.8, esbuild=0.23.0, typescript=5.5.4
Verificador: research-verifier 2026-10-01 ESCALATE

## 1. Pregunta y decisiones abiertas

Se va a recrear desde cero (encargo del team-lead: en aproximadamente un dia) el formulario de captacion de leads que se monta en `div[data-atfx-form-mount]` dentro de landings WordPress + Elementor Pro (www.atfxlatam.com, detras de Cloudflare) y envia a admin-ajax de Elementor Pro (form 593), middleware y Salesforce. La pregunta: que arquitectura de runtime y UI corresponde al estandar de la industria para un widget de terceros en un host que no controlamos.

Fuera de alcance: la libreria de validacion (Zod v3, ~60 KB segun la auditoria), la cadena de distribucion (jsDelivr, SRI, branch protection) y el contrato con Salesforce, que no cambia.

Insumos leidos en esta corrida y que no se pueden citar con marca porque viven fuera del repo:
- Auditoria `~/Desktop/security-audit-atfx-forms-2026-10-01.md`: bundle actual 163 KB (49 KB brotli), GSAP ~70 KB y Zod v3 ~60 KB; anexo Q-08 dice que los popups de Elementor montados despues de `boot()` nunca se inicializan; Q-01 y Q-02 son defectos del motor de envio, no de la UI.
- Fork hermano `atfx-forms-newAug26` (HEAD `1db126a`, repo privado `karenrebecag/at_forms_aug26`, no citable por URL): ya quito GSAP (`src/ui/motion.ts` pasa el reveal a clases CSS), su combobox implementa el patron APG con `role="combobox"` en el input de busqueda, `aria-controls`, `aria-activedescendant`, flechas, Home/End, Enter y Escape (`src/ui/atoms/select.ts:84-94`, `213-255`), guarda `data-atfx-mounted` contra doble montaje (`src/index.ts:41`) y corre tests con vitest + jsdom. Sigue registrando un listener de `click` en `document` por instancia (`src/ui/atoms/select.ts:262`).

### Decision gris 1: modelo de render
Vanilla TS con DOM imperativo (actual) vs Custom Elements (`atfx-lead-form`) vs Preact/Lit/Svelte compilado. Criterios: peso, aislamiento, testabilidad, mantenimiento por una persona, multi-instancia, montaje tardio (popups de Elementor).

### Decision gris 2: aislamiento de estilos
Shadow DOM vs CSS con prefijo, `@layer` o `@scope`, y su impacto en formularios: form-associated custom elements, ElementInternals, autofill y labels a traves del shadow boundary.

### Decision gris 3: animacion
GSAP (actual) vs CSS / Web Animations API.

### Decision gris 4: selector de pais y prefijo
Patron WAI-ARIA APG combobox vs `select` nativo vs `datalist`. El combobox actual no es operable con teclado.

### Decision gris 5: estructura de carpetas
Por feature (`forms/lead`, `forms/interest`) con core compartido y multi-entry vs por capas (actual); un repo para ambos forms.

## 2. Estado actual

Contextos: produccion (landing WordPress + Elementor Pro en www.atfxlatam.com tras Cloudflare con Rocket Loader, incluidos popups de Elementor), preview local (`npm run dev`, servidor esbuild en :8765 con preview.html), tests (`node --test test/`, sin script npm), CI de release (GitHub Actions, Node 20, solo typecheck + build)

### Render y montaje
- El arranque busca todos los mounts una sola vez con `document.querySelectorAll("[data-atfx-form-mount]")` [repo:src/index.ts:28]
- `boot()` corre una sola vez, en `DOMContentLoaded` o inmediato; no hay observador ni API publica para montar contenido que llega despues [repo:src/index.ts:83]
- No hay guarda contra doble montaje: el mount se reemplaza con `replaceChildren(form)` cada vez que corre `boot` [repo:src/index.ts:75]
- El form se construye con `document.createElement` atomo por atomo (render imperativo, sin framework) [repo:src/ui/organisms/form.ts:70]
- Los ids de campo se derivan solo del nombre del campo, sin prefijo por instancia, asi que dos forms en la misma pagina generan ids duplicados [repo:src/ui/organisms/form.ts:14]
- El boton de envio usa un id fijo `atfx-submit-btn` en cada instancia [repo:src/ui/organisms/form.ts:90]
- La config del lead fija `id: "atfx_sf_form"` para el form, que tambien se repite por instancia [repo:src/forms/lead.ts:50]
- El contrato documentado admite varios forms por pagina con un solo loader [repo:CLAUDE.md:45]
- El loader inyecta el bundle como `type="module"` con `data-cfasync="false"` para excluirlo de Rocket Loader [repo:loader.js:15]

### Estilos
- Los tokens de diseno se declaran en `:root`, es decir, en el documento del host [repo:src/styles/forms.css:4]
- Varios tokens globales no llevan prefijo propio (`--size-unit`, `--size-font`) y pueden chocar con variables del host [repo:src/styles/forms.css:5]
- Los tokens de animacion del dropdown tampoco llevan prefijo (`--dropdown-open-dur`) [repo:src/styles/forms.css:35]
- Las reglas de componentes se anclan a la clase `.atfx-form` como prefijo [repo:src/styles/forms.css:76]
- El tema oscuro sobreescribe tokens en `.atfx-form[data-atfx-theme="dark"]` [repo:src/styles/forms.css:83]
- El combobox lee la duracion de cierre de `getComputedStyle(document.documentElement)`, que depende de que los tokens vivan en `:root` [repo:src/ui/atoms/select.ts:111]
- El shake de error tambien lee sus duraciones de `document.documentElement` [repo:src/core/form-engine.ts:48]

### Animacion
- GSAP es dependencia de runtime declarada en package.json [repo:package.json:14]
- La documentacion del repo reconoce que bundlear GSAP sube el bundle a ~150 KB [repo:CLAUDE.md:89]
- El unico uso de GSAP son dos `gsap.from` de entrada (fade + translate) del form [repo:src/ui/motion.ts:12]
- Y el reveal del thank-you con un pop del icono [repo:src/ui/motion.ts:19]
- El shake de error ya es una animacion CSS con `@keyframes` [repo:src/styles/forms.css:400]
- La hoja ya respeta `prefers-reduced-motion` para animaciones CSS [repo:src/styles/forms.css:258]

### Selector de pais y prefijo
- Todo campo `select` se renderiza como combobox custom porque `searchable` esta fijado a `true` [repo:src/ui/organisms/form.ts:38]
- El valor viaja en un `input type="hidden"`, no en un control nativo [repo:src/ui/atoms/select.ts:62]
- El trigger es un `button` con `aria-haspopup="listbox"` y `aria-expanded`, sin `aria-controls` [repo:src/ui/atoms/select.ts:73]
- El input de busqueda no tiene `role="combobox"` ni `aria-activedescendant` y desactiva autocomplete [repo:src/ui/atoms/select.ts:82]
- El listbox no tiene id ni nombre accesible [repo:src/ui/atoms/select.ts:86]
- La unica interaccion del trigger es `click`; no hay manejo de flechas, Home/End ni Enter [repo:src/ui/atoms/select.ts:158]
- Cada instancia de combobox agrega listeners de `click` y `keydown` a `document` que nunca se quitan [repo:src/ui/atoms/select.ts:170]
- Los campos de pais y prefijo son `select` con opciones de `countries` y `diallingCodes` [repo:src/forms/lead.ts:19]
- Ningun input declara `autocomplete` (nombre, email, telefono) [repo:src/ui/atoms/input.ts:25]
- El preselect por geo-IP depende de las clases `.atfx-combobox` / `.atfx-select-wrapper` y de un metodo `presetValue` pegado al wrapper [repo:src/core/geo.ts:51]

### Envio y contrato
- El envio usa `fetch` con `FormData` y `X-Requested-With: XMLHttpRequest`, que es lo que hace que Elementor dispare la accion de Salesforce [repo:src/core/submit-elementor.ts:28]
- admin-ajax solo acepta `Origin: https://www.atfxlatam.com` [repo:CLAUDE.md:122]
- La atribucion depende de que `referrer` sea la URL de la landing (`location.href`) [repo:CLAUDE.md:109]
- Los nombres que llegan a Salesforce salen de `FieldDef.name` envuelto en `form_fields[...]` [repo:src/ui/atoms/input.ts:28]
- Los campos y llaves enviados a Salesforce no se modifican aunque se pidan cambios; solo el texto [KAREN:memory/feedback_atfx_forms_campos_fijos.md]

### Estructura, build y tests
- esbuild compila un solo entry `src/index.ts` a `dist/forms.js` [repo:esbuild.config.mjs:12]
- El target de compilacion es ES2019 [repo:tsconfig.json:3]
- El arbol de `src/` esta organizado por capas (core, ui/atoms, ui/molecules, ui/organisms, schemas, forms, i18n, data) [repo:CLAUDE.md:58]
- El unico test usa el runner nativo `node:test` y vive fuera de `src/` [repo:test/lead-meta.test.ts:3]
- El CI de release usa Node 20 [repo:.github/workflows/release.yml:30]
- El CI solo corre typecheck y build, sin tests [repo:.github/workflows/release.yml:36]

### Reglas de Karen que aplican
- Si una feature nativa de la plataforma lo cubre, se usa (`input type="date"` antes que una libreria, CSS antes que JS) [KAREN:config/rules/common/coding-style.md]
- Organizar por feature/dominio, no por tipo; muchos archivos pequenos, 200-400 lineas tipico [KAREN:config/rules/common/coding-style.md]
- Inmutabilidad: crear objetos nuevos, nunca mutar existentes [KAREN:config/rules/common/coding-style.md]
- Instalar, quitar o subir dependencias esta bloqueado sin su aprobacion [KAREN:~/.claude/CLAUDE.md]

## 3. Fuentes primarias

### Custom elements y montaje tardio
- `connectedCallback` se llama cada vez que el elemento se agrega al documento, y la especificacion recomienda poner ahi el setup en lugar del constructor [doc:https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements@2026-09-01]
- `disconnectedCallback` se llama cada vez que el elemento se quita del documento [doc:https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements@2026-09-01]
- Safari no planea soportar customized built-in elements (`is="..."`); solo los autonomos son portables [doc:https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements@2026-09-01]
- Un elemento creado antes de registrar su definicion se convierte en custom element cuando la definicion se registra despues (upgrade) [doc:https://html.spec.whatwg.org/multipage/custom-elements.html@living-standard]
- `connectedCallback` puede llamarse mas de una vez, asi que la inicializacion de una sola vez necesita una guarda [doc:https://html.spec.whatwg.org/multipage/custom-elements.html@living-standard]
- `customElements.define` lanza `NotSupportedError` si el nombre ya esta registrado (dos bundles o el loader inyectado dos veces) [doc:https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define@baseline-2020-01]
- MutationObserver observa cambios del arbol con `childList` y `subtree` y es Baseline amplio desde julio 2015 [doc:https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver@2025-06-10]
- Elementor Pro emite `elementor/popup/show` al abrir un popup, documentado con listener de jQuery [doc:https://developers.elementor.com/elementor-pro-2-7-popup-events/@2021-12-29]

### Shadow DOM, formularios y accesibilidad
- Los selectores de la pagina no aplican dentro del shadow DOM [doc:https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM@2026-09-08]
- Las propiedades heredables (y `lang`/`dir`) si pasan al shadow tree desde el host [doc:https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM@2026-09-08]
- `mode: "closed"` no es un mecanismo de seguridad: extensiones del navegador pueden evadirlo [doc:https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM@2026-09-08]
- ElementInternals (`setFormValue`, `setValidity`, `labels`, `form`) requiere `static formAssociated = true` y es Baseline amplio desde marzo 2023 [doc:https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals@2026-09-28]
- web.dev (2019) advertia que Chrome no hacia autofill de form-associated custom elements ni mostraba su mensaje de validacion [doc:https://web.dev/articles/more-capable-form-controls@2019-08-08]
- Chromium habilito en M99 que el autofill recorra el shadow DOM al recolectar controles, y WebKit y Gecko figuraban sin senal [doc:https://groups.google.com/a/chromium.org/g/blink-dev/c/RY9leYMu5hI/m/hXkUj8J6AgAJ@2022-02-14]
- Los atributos IDREF (`for`, `aria-labelledby`) no cruzan la frontera de un shadow root; Reference Target lo resolveria y en 2026 esta solo detras de flags en Chromium, WebKit y Firefox [doc:https://blogs.igalia.com/alice/reference-target-having-your-encapsulation-and-eating-it-too/@2026-01-30]
- `submit` y la mayoria de eventos no-UI tienen `composed: false` y no se propagan fuera del shadow DOM; solo los eventos UI del agente (click, touch, etc.) son composed [doc:https://developer.mozilla.org/en-US/docs/Web/API/Event/composed@2024-05-07]

### Cascada
- Los estilos normales sin capa ganan a los estilos normales dentro de cualquier `@layer` [doc:https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer@baseline-2022-03]
- `@scope` limita el alcance de los selectores propios pero no aisla de los estilos externos; la herencia sigue cruzando [doc:https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@scope@2026-04-20]
- `@scope` es Baseline 2026 recien disponible (marzo 2026) y puede no funcionar en dispositivos viejos [doc:https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@scope@2026-04-20]

### Animacion
- `Element.animate()` crea y reproduce una animacion y devuelve un `Animation` con promesa `finished`; Baseline amplio desde marzo 2020 [doc:https://developer.mozilla.org/en-US/docs/Web/API/Element/animate@2025-12-17]
- `prefers-reduced-motion` es Baseline amplio desde enero 2020 y el patron recomendado es la media query en CSS [doc:https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion@2026-06-10]

### Selector accesible
- Un combobox es un input con un popup asociado y exige Down Arrow, Enter y Escape, `role="combobox"`, `aria-controls`, `aria-expanded` y `aria-activedescendant` [doc:https://www.w3.org/WAI/ARIA/apg/patterns/combobox/@apg-2026]
- El ejemplo APG de combobox editable con autocompletado de lista agrega Alt+Down, Home/End y declara que su codigo no es para produccion [doc:https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/@apg-2026]
- El ejemplo APG select-only combobox replica type-ahead, Home/End, Enter/Space, Escape y Alt+Up de un `select` nativo, y tampoco es codigo de produccion [doc:https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/@apg-2026]
- APG advierte que el ARIA incorrecto tiene efectos potencialmente devastadores y que hay que probar interoperabilidad con tecnologias asistivas antes de usar su codigo en produccion [doc:https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/@apg-2026]
- `datalist` no restringe el valor a las opciones listadas: el control acepta cualquier valor valido [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/datalist@2026-09-05]
- Con `datalist`, algunas combinaciones (NVDA + Firefox) no anuncian el popup y sus opciones no escalan con el zoom [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/datalist@2026-09-05]
- `appearance: base-select` permite estilizar un `select` nativo, no es Baseline y en navegadores sin soporte degrada a un `select` clasico funcional [doc:https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select@2026-08-13]
- `autocomplete` aplica a `input`, `textarea`, `select` y `form`, con tokens `given-name`, `family-name`, `email`, `tel-national`, `tel-country-code`, `country` y `country-name` [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete@2026-08-27]

### Build
- Varios entry points generan bundles separados, lo que reduce el codigo innecesario que descarga el navegador [doc:https://esbuild.github.io/api/@0.23]
- El code splitting de esbuild sigue en progreso y solo funciona con formato `esm` [doc:https://esbuild.github.io/api/@0.23]

### Librerias candidatas
- Lit pesa alrededor de 5 KB minificado y comprimido y sus estilos se aislan por defecto con shadow DOM [doc:https://lit.dev/docs/@3]

## 4. Implementaciones de referencia

- Typeform Embed SDK (repo oficial de Typeform, push 2026-09-30): escanea `[data-tf-*]` al cargar, marca cada nodo con `data-tf-loaded` para no re-montar y lo salta si ya esta [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/packages/embed/src/initializers/initialize.ts#L28-L44@ffcede3]
- Typeform no usa MutationObserver: expone `load()` y `reload()` publicos para contenido que llega despues y corre `load` en `DOMContentLoaded` o inmediato segun `readyState` [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/packages/embed/src/browser.ts#L30-L44@ffcede3]
- Cal.com embed-core (48.8k estrellas, mantenido por Cal.com): registra custom elements autonomos `cal-modal-box`, `cal-floating-button` y `cal-inline` [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-core/src/embed.ts#L44-L46@54343aa]
- Cal.com usa shadow DOM abierto solo para el chrome del embed (loader, errores) inyectando su CSS como `style` dentro del shadow root; la app de reservas va en un iframe [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-core/src/Inline/inline.ts#L35-L37@54343aa]
- Cal.com pone listeners globales en `connectedCallback` y los quita en `disconnectedCallback` [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-core/src/EmbedElement.ts#L219-L233@54343aa]
- Cal.com resuelve los triggers `[data-cal-link]` por delegacion de click en `document`, lo que funciona igual para nodos agregados tarde [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-core/src/embed.ts#L1623-L1640@54343aa]
- Formbricks surveys (13k estrellas, widget in-app embebible en sitios ajenos): renderiza con Preact en light DOM dentro de un contenedor del host [ref:https://github.com/formbricks/formbricks/blob/f1fc4adbc38bf49615fc13db30698c056a381a60/packages/surveys/src/index.ts#L53-L63@f1fc4ad]
- Formbricks inyecta una sola hoja `formbricks__css` en `head` y no la duplica si ya existe [ref:https://github.com/formbricks/formbricks/blob/f1fc4adbc38bf49615fc13db30698c056a381a60/packages/surveys/src/lib/styles.ts#L37-L48@f1fc4ad]
- Formbricks aisla sus estilos en light DOM con un reset propio prefijado por el id del contenedor (`#fbjs *`), no con shadow DOM [ref:https://github.com/formbricks/formbricks/blob/f1fc4adbc38bf49615fc13db30698c056a381a60/packages/surveys/src/styles/preflight.css#L1-L14@f1fc4ad]
- Web Awesome (sucesor de Shoelace, este archivado; mismo equipo): sus controles son form-associated custom elements con `static formAssociated = true` [ref:https://github.com/shoelace-style/webawesome/blob/c606a14429738a0d3b89d6cde339a989e78ab1e8/packages/webawesome/src/internal/webawesome-form-associated-element.ts#L63@c606a14]
- Web Awesome implementa `formStateRestoreCallback` con razon `autocomplete` para recibir autofill, codigo extra que un control nativo no necesita [ref:https://github.com/shoelace-style/webawesome/blob/c606a14429738a0d3b89d6cde339a989e78ab1e8/packages/webawesome/src/internal/webawesome-form-associated-element.ts#L337@c606a14]
- El `wa-select` de Web Awesome es un combobox ARIA (`role="combobox"`, `aria-controls`) con manejo de flechas, Home y End [ref:https://github.com/shoelace-style/webawesome/blob/c606a14429738a0d3b89d6cde339a989e78ab1e8/packages/webawesome/src/components/select/select.ts#L1071-L1077@c606a14]
- Preact se presenta como alternativa a React de ~4 kB [ref:https://github.com/preactjs/preact/blob/3fcc391adc243d479ab10b4cf70fa609708c9348/README.md#L8@3fcc391]
- HubSpot documenta que los forms embebidos se personalizan definiendo variables CSS que sobreescriben el estilo por defecto [doc:https://developers.hubspot.com/docs/cms/start-building/features/forms/forms@2026-10-01]
- Tally renderiza el form inline dentro de un iframe, con un runtime `widgets/embed.js` [doc:https://developers.tally.so/widgets/introduction@2026-10-01]
- Intercom usa un stub que encola llamadas (`window.Intercom = function(){ i.c(arguments) }`) hasta que carga el script async, y pide `Intercom('update')` en cambios de vista [doc:https://developers.intercom.com/installing-intercom/web/installation@2026-10-01]

## 5. Opciones

### Decision 1: modelo de render

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Vanilla TS + DOM imperativo en light DOM, `mount(root)` idempotente | 0 KB de runtime; sin dependencia nueva; testeable con jsdom; es lo que ya conoce quien lo mantiene | El ciclo de vida (montaje tardio, limpieza) hay que escribirlo a mano | baja | Recomendada |
| B. Custom element autonomo `atfx-lead-form` (light DOM, sin shadow) | Upgrade automatico de nodos tardios y `disconnectedCallback` para limpieza, nativo | Cambia el contrato de embed en cada landing; `connectedCallback` re-entra; `define` doble lanza error | media | Alternativa aceptable si Karen acepta migrar embeds |
| C. Preact compilado | JSX y estado declarativo; Formbricks lo usa | Dependencia nueva (~4 kB) que requiere aprobacion; no resuelve montaje tardio | media | No para 1 dia |
| D. Lit | ~5 KB; lifecycle y estilos aislados | Dependencia nueva; shadow DOM por defecto trae los costos de la decision 2 | media | No |

### Decision 2: aislamiento de estilos

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Light DOM + clases prefijadas `atfx-` + reset local bajo `.atfx-form` + tokens en `.atfx-form` | Autofill, labels, eventos y analitica del host funcionan igual que un form nativo; patron de Formbricks y HubSpot | El CSS del host puede filtrarse; requiere reset con especificidad suficiente | baja | Recomendada |
| B. Shadow DOM con todo el form dentro | Aislamiento real de selectores | Autofill en shadow solo documentado en Chromium; `submit` no es composed; el codigo que lee tokens de `documentElement` se rompe | media | No |
| C. `@layer` para el CSS del widget | Ordena la cascada propia | Todo CSS sin capa del host gana a las capas: empeora el aislamiento | baja | No |
| D. `@scope (.atfx-form)` | Selectores mas cortos | No aisla de estilos externos; Baseline recien en 2026 | baja | Opcional, no como aislamiento |

### Decision 3: animacion

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. CSS (`@keyframes`/transitions) + `prefers-reduced-motion` en la hoja | 0 KB; consistente con el shake y spinner que ya son CSS; el fork ya lo hizo | Stagger por indice via variable CSS | baja | Recomendada |
| B. WAAPI (`element.animate`) | Promesa `finished` si JS necesita encadenar | Hay que respetar reduced-motion en JS | baja | Solo si hace falta la promesa |
| C. GSAP | API conocida | ~70 KB para dos fade-in; dependencia | baja | Quitar (requiere aprobacion de Karen) |

### Decision 4: selector de pais y prefijo

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. `select` nativo con `autocomplete` | Teclado, type-ahead, picker nativo en movil y lector de pantalla gratis; participa en el form y en autofill | Sin filtro por texto; estilo limitado salvo `appearance: base-select` progresivo | baja | Recomendada |
| B. Combobox APG editable con lista | Busqueda por texto en ~200 paises | Mucho ARIA que probar con AT; mas codigo y tests; el ejemplo APG no es de produccion | alta | Solo si la busqueda es requisito |
| C. `datalist` | Nativo | No restringe el valor (basura al picklist de SF); NVDA+Firefox no anuncian | baja | No |

### Decision 5: estructura

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Un repo, `src/forms/lead/` y `src/forms/interest/` por feature + `src/core/` y `src/ui/` compartidos, un entry de esbuild por form, sin splitting | Cada landing descarga solo su form; alinea con la regla de Karen | Core duplicado dentro de cada bundle | baja | Recomendada |
| B. Un bundle con todos los forms | Un solo archivo | Cada landing paga el codigo de todos | baja | No |
| C. Multi-entry con `splitting` | Core compartido cacheable | Splitting en progreso y solo ESM; mas requests en el critical path | media | No por ahora |
| D. Por capas (actual) | Ya existe | Contra la regla de organizacion por feature | baja | No |

## 6. Evidencia en contra

- Contra light DOM (decision 2A): el CSS global del host (kit de Elementor, tema) puede ganar a las reglas del widget, que es justo lo que Shadow DOM evita, porque los selectores de la pagina no entran al shadow tree [doc:https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM@2026-09-08]
- Se acepta: Shadow DOM cambiaria ese riesgo por uno peor en un form de captacion, porque el autofill en shadow solo esta documentado para Chromium y WebKit figuraba sin senal, y Safari iOS es trafico movil de LATAM [doc:https://groups.google.com/a/chromium.org/g/blink-dev/c/RY9leYMu5hI/m/hXkUj8J6AgAJ@2022-02-14]
- Se mitiga con el patron de Formbricks: reset propio prefijado por el contenedor y tokens propios, verificado contra una landing real antes de publicar [ref:https://github.com/formbricks/formbricks/blob/f1fc4adbc38bf49615fc13db30698c056a381a60/packages/surveys/src/styles/preflight.css#L1-L14@f1fc4ad]
- Contra vanilla (decision 1A): un custom element da el montaje tardio gratis por upgrade, y escribirlo a mano con MutationObserver es reinventar el ciclo de vida [doc:https://html.spec.whatwg.org/multipage/custom-elements.html@living-standard]
- Se acepta porque el contrato vigente es `div[data-atfx-form-mount]` en landings ya publicadas, y Typeform, el SDK de embed mas cercano, mantiene el mount por atributos con guarda y `load()` publico en lugar de custom elements [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/packages/embed/src/initializers/initialize.ts#L28-L44@ffcede3]
- La guarda de idempotencia es la misma que exigiria un custom element, porque `connectedCallback` tambien puede correr mas de una vez [doc:https://html.spec.whatwg.org/multipage/custom-elements.html@living-standard]
- Contra `select` nativo (decision 4A): con ~200 paises, filtrar por texto es mas rapido que desplazarse, y el combobox actual se hizo buscable a proposito [repo:src/ui/organisms/form.ts:38]
- Se resuelve a medias: el `select` nativo ya trae type-ahead por caracteres, que es el mismo comportamiento que APG replica en su select-only combobox [doc:https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/@apg-2026]
- Si Karen exige busqueda por subcadena, la opcion 4B entra con los criterios del patron APG y prueba con lector de pantalla; queda como pregunta abierta en la seccion 9 [doc:https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/@apg-2026]
- Contra quitar GSAP: quitar una dependencia es un cambio de dependencias que Karen tiene bloqueado sin aprobacion [KAREN:~/.claude/CLAUDE.md]

## 7. Ejemplares y anti-ejemplos

- Bien: montaje idempotente por atributo, se salta el nodo ya marcado y se marca tras montar (`if (forceReload || element.dataset.tfLoaded !== 'true') ... element.dataset.tfLoaded = 'true'`) [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/packages/embed/src/initializers/initialize.ts#L28-L44@ffcede3]
- Bien: listeners globales que se registran al conectar y se quitan al desconectar (`window.removeEventListener("resize", ...)` en `disconnectedCallback`) [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-core/src/EmbedElement.ts#L219-L233@54343aa]
- Bien: una sola hoja de estilos con id fijo, inyectada una vez aunque haya varias instancias [ref:https://github.com/formbricks/formbricks/blob/f1fc4adbc38bf49615fc13db30698c056a381a60/packages/surveys/src/lib/styles.ts#L37-L48@f1fc4ad]
- Bien: reset prefijado por contenedor en light DOM (`#fbjs *, #fbjs ::before, #fbjs ::after { box-sizing: border-box; ... }`) [ref:https://github.com/formbricks/formbricks/blob/f1fc4adbc38bf49615fc13db30698c056a381a60/packages/surveys/src/styles/preflight.css#L1-L14@f1fc4ad]
- Bien: tema por variables CSS que el host puede sobreescribir, como documenta HubSpot [doc:https://developers.hubspot.com/docs/cms/start-building/features/forms/forms@2026-10-01]
- Bien: animacion en CSS con alternativa bajo `@media (prefers-reduced-motion: reduce)` [doc:https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion@2026-06-10]
- Anti-ejemplo: un listener en `document` por instancia de combobox, sin limpieza; con N instancias son 2N listeners vivos para siempre [repo:src/ui/atoms/select.ts:170]
- Anti-ejemplo: ids derivados solo del nombre del campo, que se duplican con dos forms en la pagina y rompen `label for` [repo:src/ui/organisms/form.ts:14]
- Anti-ejemplo: el valor del selector en un `input type="hidden"` fuera del alcance de teclado, autofill y validacion nativa [repo:src/ui/atoms/select.ts:62]
- Anti-ejemplo: tokens sin prefijo en `:root`, que contaminan el documento del host [repo:src/styles/forms.css:5]
- Anti-ejemplo: GSAP bundleado para dos `from` de opacidad y translate [repo:src/ui/motion.ts:12]

## 8. Trampas

### Por contexto de ejecucion
- Produccion, Rocket Loader: el bundle debe seguir cargando con `data-cfasync="false"` o Cloudflare lo reordena; la recomendacion no cambia el loader [repo:loader.js:15]
- Produccion, popups de Elementor: un `boot()` de una sola pasada no ve mounts que aparecen despues; el `mount(root)` idempotente debe correr tambien cuando el nodo aparece [repo:src/index.ts:83]
- Produccion, popups de Elementor: escuchar `elementor/popup/show` ata el widget a una API propia de Elementor documentada sobre jQuery, no a la plataforma [doc:https://developers.elementor.com/elementor-pro-2-7-popup-events/@2021-12-29]
- Esa API ya cambio de comportamiento: en el issue 11306 el listener con `document.addEventListener` dejo de recibir el evento y solo el de jQuery seguia funcionando [doc:https://github.com/elementor/elementor/issues/11306@2020-05-05]
- Produccion, envio: el form debe quedarse en el documento del host; un iframe en otro origen rompe CORS de admin-ajax y la atribucion por `location.href` [repo:CLAUDE.md:122]
- Produccion, analitica: si se usara Shadow DOM, el evento `submit` no saldria del shadow root y herramientas del host que escuchan `submit` en `document` no lo verian [doc:https://developer.mozilla.org/en-US/docs/Web/API/Event/composed@2024-05-07]
- Preview local: preview.html monta varias instancias en la misma pagina, asi que ahi aparecen primero los ids duplicados y los listeners acumulados [repo:CLAUDE.md:178]
- Tests: el runner actual es `node:test` sin DOM; probar mount, combobox o select necesita un entorno DOM (el fork usa jsdom) [repo:test/lead-meta.test.ts:3]
- CI: hoy no corre tests; cualquier criterio de la spec que dependa de tests necesita agregar el paso al workflow [repo:.github/workflows/release.yml:36]

### Del modelo de estilos
- Envolver el CSS del widget en `@layer` lo hace perder contra todo CSS sin capa del tema [doc:https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer@baseline-2022-03]
- `@scope` no protege contra estilos externos, solo limita los propios [doc:https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@scope@2026-04-20]
- Mover tokens de `:root` a `.atfx-form` rompe el codigo que hoy los lee de `document.documentElement` [repo:src/ui/atoms/select.ts:111]
- Mismo problema en el shake del motor de errores [repo:src/core/form-engine.ts:48]

### Del montaje
- `customElements.define` con un nombre ya registrado lanza `NotSupportedError`; si se elige custom element, hay que comprobar `customElements.get` antes [doc:https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define@baseline-2020-01]
- Solo custom elements autonomos: Safari no soporta customized built-ins (`is=`) [doc:https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements@2026-09-01]
- MutationObserver con `subtree` sobre `body` dispara por cada cambio del DOM del host; el callback debe filtrar solo nodos agregados que coinciden con el selector [doc:https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver@2025-06-10]

### Del selector y el contrato
- El geo-IP preselecciona via `presetValue` en los wrappers del combobox; al pasar a `select` nativo hay que reescribirlo sobre `select.value` sin pisar una eleccion manual [repo:src/core/geo.ts:51]
- Cambiar el control no puede cambiar `name` ni `value` de las opciones que llegan a Salesforce [KAREN:memory/feedback_atfx_forms_campos_fijos.md]
- `datalist` acepta cualquier texto y mandaria valores fuera de la lista al picklist [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/datalist@2026-09-05]
- Un combobox con ARIA mal aplicado es peor que ninguno; APG exige probar con tecnologias asistivas [doc:https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/@apg-2026]

## 9. Incertidumbre

- ASSUMPTION: los popups de Elementor insertan (o re-renderizan) el HTML del widget despues de `DOMContentLoaded`, como afirma el anexo Q-08 de la auditoria; no se verifico en esta corrida. prueba: en una landing con popup, contar `[data-atfx-form-mount]` en `DOMContentLoaded` y otra vez tras abrir el popup, y ver si el nodo es nuevo
- ASSUMPTION: el CSS del kit de Elementor en www.atfxlatam.com estiliza `input`, `select` y `button` con selectores que ganan o empatan con `.atfx-form .atfx-input`. prueba: en DevTools sobre la landing real, revisar estilos computados de cada control del widget y las reglas del host que aplican
- ASSUMPTION: el autofill de Safari iOS y Firefox no recorre shadow DOM (solo relevante si se reabre la opcion 2B). prueba: form minimo con inputs en shadow root, autofill de contacto en iPhone y en Firefox
- ASSUMPTION: el autofill con `autocomplete="country"` sobre un `select` cuyos valores son ISO3 y `tel-country-code` sobre prefijos con formato propio rellena la opcion correcta. prueba: autofill de Chrome y Safari sobre el `select` real con las opciones de `src/data/options.ts`
- ASSUMPTION: jsdom no implementa `Element.animate`, asi que codigo WAAPI rompe tests si no se protege. prueba: `typeof document.createElement("div").animate` en un test de vitest con jsdom
- ASSUMPTION: el widget HTML de Elementor conserva una etiqueta custom (`atfx-lead-form`) intacta para todo rol editor (solo relevante para la opcion 1B). prueba: pegar la etiqueta en una pagina borrador con un usuario no administrador y revisar el HTML servido
- ASSUMPTION: la parte del trafico de las landings en navegadores sin `@scope` es significativa (solo relevante si se usa 2D). prueba: GA4 de www.atfxlatam.com por version de navegador
- ASSUMPTION: los formularios nuevos de HubSpot se renderizan en iframe o inline segun el modo de embed; la pagina oficial consultada no lo dijo. prueba: inspeccionar un embed `hs-form-frame` publico
- No se pudo medir el reparto de peso del bundle (GSAP 70 KB, Zod 60 KB) en esta corrida: viene de la auditoria, sin metafile de esbuild.
- Fuente con instruccion: la pagina de Tally pidio cargar otro archivo de indice (`llms.txt`) para seguir leyendo; no se siguio y Tally queda con una sola afirmacion.
- [NEEDS CLARIFICATION: el selector de pais debe permitir busqueda por subcadena (combobox APG, opcion 4B) o basta el `select` nativo con type-ahead (opcion 4A)?]
- [NEEDS CLARIFICATION: apruebas quitar GSAP del package.json en la recreacion? Es un cambio de dependencias.]
- [NEEDS CLARIFICATION: el contrato de embed se queda en `div data-atfx-form-mount` (recomendado) o aceptas migrar landings a un custom element?]
- [NEEDS CLARIFICATION: la casilla de aceptacion viene marcada por defecto (`defaultChecked: true` en `src/forms/lead.ts:23`); se conserva en la recreacion o se revisa con legal?]

## 10. Checklist de estandar

Recomendacion: vanilla TS en light DOM (1A), clases prefijadas con reset local y tokens bajo `.atfx-form` (2A), animacion en CSS con reduced-motion en la hoja (3A), `select` nativo con `autocomplete` para pais, prefijo y experiencia (4A, salvo que Karen pida busqueda), un repo con carpetas por feature y un entry de esbuild por form sin splitting (5A). Ninguna dependencia nueva; quitar GSAP con aprobacion.

- [ ] Montaje: `mount(root)` es idempotente (guarda `data-atfx-mounted`); llamarlo dos veces sobre el mismo nodo deja un solo form
- [ ] Montaje tardio: un `div[data-atfx-form-mount]` insertado despues del arranque se monta sin recargar (MutationObserver filtrado o `atfxForms.load()` publico); hay test con jsdom
- [ ] Multi-instancia: dos forms en la misma pagina no comparten ningun `id`; cada `label for` apunta a un control de su propia instancia
- [ ] Limpieza: ningun listener en `document` o `window` por instancia; los globales son uno solo, delegado
- [ ] Contrato: el payload (`form_fields[...]`, `post_id`, `form_id`, `queried_id`, `referrer`, valores de opciones) es identico byte a byte al actual para es/en/pt; test de snapshot del `FormData`
- [ ] Envio: el form vive en el documento del host (sin iframe, sin shadow root) y conserva `X-Requested-With: XMLHttpRequest`
- [ ] Estilos: todas las clases llevan prefijo `atfx-`; ningun token se declara en `:root`; los tokens viven en `.atfx-form` con prefijo `--atfx-`
- [ ] Estilos: nada del CSS del widget va dentro de `@layer`
- [ ] Estilos: verificado en una landing real de www.atfxlatam.com con capturas light/dark antes de publicar
- [ ] Animacion: cero dependencias de animacion en el bundle; las animaciones son CSS y se anulan bajo `prefers-reduced-motion: reduce`
- [ ] Selector: pais, prefijo y experiencia son `select` nativos operables solo con teclado (Tab, flechas, type-ahead) y con lector de pantalla
- [ ] Selector (si se elige 4B): input con `role="combobox"`, `aria-controls`, `aria-expanded`, `aria-activedescendant`, `aria-autocomplete="list"`; Down/Up, Home/End, Enter, Escape y Alt+Down; probado con VoiceOver y NVDA
- [ ] Autofill: nombre, apellido, email, telefono, pais y prefijo declaran `autocomplete` (`given-name`, `family-name`, `email`, `tel-national`, `country`, `tel-country-code`)
- [ ] Geo-IP: el preselect actua sobre el control nativo y no pisa una eleccion manual; test
- [ ] Estructura: `src/forms/lead/` y `src/forms/interest/` por feature, `src/core/` compartido, un entry de esbuild por form, sin `splitting`; ningun archivo pasa de 400 lineas
- [ ] Peso: el bundle de `lead` se mide con metafile de esbuild en CI y el criterio fija un techo en KB
- [ ] CI: el workflow de release corre los tests antes del build

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | Using custom elements | MDN | 2026-09-01 | 2026-10-01 | high |
| 2 | HTML Standard, Custom elements | WHATWG | living standard | 2026-10-01 | high |
| 3 | CustomElementRegistry.define | MDN | Baseline 2020-01 | 2026-10-01 | high |
| 4 | MutationObserver | MDN | 2025-06-10 | 2026-10-01 | high |
| 5 | Using shadow DOM | MDN | 2026-09-08 | 2026-10-01 | high |
| 6 | ElementInternals | MDN | 2026-09-28 | 2026-10-01 | high |
| 7 | More capable form controls | web.dev (Arthur Evans) | 2019-08-08 | 2026-10-01 | medium (antiguo) |
| 8 | Intent to Ship: Autofill in ShadowDOM | blink-dev | 2022-02-14 | 2026-10-01 | high |
| 9 | Reference Target: having your encapsulation and eating it too | Igalia (Alice Boxhall) | 2026-01-30 | 2026-10-01 | medium (secundaria, autora del explainer) |
| 10 | Event.composed | MDN | 2024-05-07 | 2026-10-01 | high |
| 11 | @layer | MDN | Baseline 2022-03 | 2026-10-01 | high |
| 12 | @scope | MDN | 2026-04-20 | 2026-10-01 | high |
| 13 | Element.animate | MDN | 2025-12-17 | 2026-10-01 | high |
| 14 | prefers-reduced-motion | MDN | 2026-06-10 | 2026-10-01 | high |
| 15 | Combobox Pattern | W3C WAI APG | 2026 | 2026-10-01 | high |
| 16 | Editable Combobox With List Autocomplete | W3C WAI APG | 2026 | 2026-10-01 | high |
| 17 | Select-Only Combobox | W3C WAI APG | 2026 | 2026-10-01 | high |
| 18 | Read Me First | W3C WAI APG | 2026 | 2026-10-01 | high |
| 19 | datalist | MDN | 2026-09-05 | 2026-10-01 | high |
| 20 | Customizable select elements | MDN | 2026-08-13 | 2026-10-01 | high |
| 21 | autocomplete attribute | MDN | 2026-08-27 | 2026-10-01 | high |
| 22 | esbuild API | esbuild | docs actuales (proyecto en 0.23) | 2026-10-01 | medium (docs no versionadas) |
| 23 | Lit docs | Lit | 3.x | 2026-10-01 | medium |
| 24 | Elementor Pro 2.7 Popup Events | Elementor | 2021-12-29 | 2026-10-01 | medium (antiguo) |
| 25 | elementor/elementor issue 11306 | Elementor (GitHub) | 2020-05-05 | 2026-10-01 | medium |
| 26 | typeform/embed | Typeform | ffcede3 | 2026-10-01 | high |
| 27 | calcom/cal.com embed-core | Cal.com | 54343aa | 2026-10-01 | high |
| 28 | formbricks/formbricks surveys | Formbricks | f1fc4ad | 2026-10-01 | high |
| 29 | shoelace-style/webawesome | Font Awesome / Shoelace | c606a14 | 2026-10-01 | high |
| 30 | preactjs/preact README | Preact | 3fcc391 | 2026-10-01 | medium |
| 31 | HubSpot forms | HubSpot | sin fecha | 2026-10-01 | medium |
| 32 | Tally widgets introduction | Tally | sin fecha | 2026-10-01 | low (contenido parcial) |
| 33 | Intercom web installation | Intercom | sin fecha | 2026-10-01 | medium |
