# Reference Brief: render de UI s07 (light DOM accesible, CSS aislado del host, ids por instancia, honeypot)

Slug: s07-ui | Nivel: quick | Fecha: 2026-10-02 | Estado: APROBADO
Versiones: typescript=5.9.3, vitest=5.0.3, jsdom=30.1.1, esbuild=0.28.2
Verificador: research-verifier 2026-10-02 ESCALATE

## 1. Pregunta y decisiones abiertas

Sesion s07 de atfx-leadkit: `renderForm`, `readValues`, `showFieldErrors` y `setBusy` en
`src/ui/fields.ts` y `src/ui/render.ts`, mas `src/styles/leadkit.css`. El form vive en light DOM,
cumple WCAG 2.2 AA, resiste el CSS de Elementor/Hello sin Shadow DOM, no repite ids con varias
instancias, no usa `innerHTML` con datos y lleva honeypot.

Reuso (sin reinvestigar, no dependen de versiones):
- `embed-form-runtime`: light DOM en vez de Shadow DOM (autofill en shadow solo documentado en
  Chromium), reset prefijado por contenedor (Formbricks), `@layer` pierde contra CSS sin capa,
  `@scope` no aisla de estilos externos, `select` nativo con type-ahead, `prefers-reduced-motion`.
- `forms-v2-compliance`: C1 (una casilla obligatoria desmarcada, opcion C) y C3 (WCAG 2.2 1.3.5,
  1.4.3, 1.4.11, 2.4.11, 3.3.1, 3.3.2, 4.1.2); C4 honeypot (spatie/laravel-honeypot, nombre no
  autocompletable).
- `embed-form-submit-privacy`: honeypot como filtro barato en cliente; la defensa real es servidor.

Aprobado por Karen y fuera de discusion aqui: D-05 y D-10. Reinvestigado en esta corrida: lo que
depende del target (Safari iOS 15, `es2019`), de esbuild 0.28.2, vitest 5.0.3, jsdom 30.1.1 y
typescript 5.9.3, y el CSS real de Elementor/Hello contra el que compite el widget.

Decisiones que quedan para la spec y la revision:
1. Como gana el CSS del widget al de Elementor: especificidad calculada, `!important` o nada.
2. Que features CSS se pueden usar con iOS 15.0-15.3 en el target (`:focus-visible`, `@layer`,
   `appearance`, `accent-color`, `inert`).
3. Como llega `leadkit.css` al bundle y a los tests (hoy la config emite una hoja hermana, la
   arquitectura dice texto inyectado).
4. De donde salen en s07 el texto de consentimiento conforme a D-05 y la URL de privacidad por
   idioma, que la spec asigna a s12.
5. Que verifica jsdom y que solo puede verificar el E2E de s13.

## 2. Estado actual

- La raiz pedida es `<form class="atfx-leadkit" data-theme novalidate>` sin `action` ni `id` fijo [repo:docs/specs/sessions/s07-ui.md:32]
- Todo id es `atfx-<campo>-<instanceId>` y cada `label for` apunta al suyo (CA-03) [repo:docs/specs/sessions/s07-ui.md:33]
- Pais y prefijo son `select` nativo con `autocomplete="country"` y `"tel-country-code"` [repo:docs/specs/sessions/s07-ui.md:34]
- El error por campo es un `p` con id propio, mas `aria-describedby` y `aria-invalid` [repo:docs/specs/sessions/s07-ui.md:38]
- El enlace de privacidad va fuera del `label` y su estructura se define en s12 [repo:docs/specs/sessions/s07-ui.md:40]
- El honeypot va fuera de la vista sin `display:none`, con `tabindex="-1"`, `autocomplete="off"` y `aria-hidden` [repo:docs/specs/sessions/s07-ui.md:42]
- `innerHTML` solo para SVG constantes; todo texto del servidor o del editor con `textContent` [repo:docs/specs/sessions/s07-ui.md:44]
- El CSS pide tokens en `.atfx-leadkit`, reset local de `appearance`, reduced motion y foco con contraste 3:1 [repo:docs/specs/sessions/s07-ui.md:45]
- La spec s07 lista el CSS en `src/styles/leadkit.css` [repo:docs/specs/sessions/s07-ui.md:13]
- La arquitectura lo ubica en `src/ui/leadkit.css`, "importada como texto" [repo:docs/specs/04-arquitectura.md:56]
- La arquitectura asigna la inyeccion a `styles.ts` (`injectStylesOnce`), que no esta en la lista de archivos de s07 [repo:docs/specs/04-arquitectura.md:57]
- s01 especifico el loader `.css => text` y un `<style data-atfx-style>` inyectado una vez [repo:docs/specs/sessions/s01-tooling.md:27]
- La config real resuelve `./lead.css` con un plugin que devuelve CSS con `loader: "css"`, que produce hoja hermana [repo:esbuild.config.mjs:54]
- El entry `lead` hoy solo hace un import de efecto lateral de `./lead.css` [repo:src/entries/lead.ts:1]
- El target del bundle es `es2019` [repo:esbuild.config.mjs:33]
- RNF-02 exige Safari iOS 15+ [repo:docs/specs/01-requisitos.md:107]
- RNF-04 exige prefijo `atfx-`, tokens fuera de `:root` y ningun estilo global [repo:docs/specs/01-requisitos.md:111]
- `PHONE_PATTERN` esta escrito para compilar con el flag `v` y s07 lo copia al atributo `pattern` [repo:src/forms/shared-fields.ts:6]
- El schema quita espacios del telefono antes de probar el regex; el atributo `pattern` no lo hace [repo:src/forms/shared-fields.ts:44]
- Los valores de pais son ISO3 (`COL`) con ISO2 aparte [repo:src/data/countries.ts:51]
- Los valores de prefijo son digitos sin `+` (`57`, `1-242`) y la etiqueta lleva bandera emoji [repo:src/data/dialling.ts:152]
- El texto de aceptacion vigente en `es` habla de "productos y servicios", es decir marketing, no solo el contacto solicitado [repo:src/i18n/es.ts:18]
- El error de aceptacion vigente dice "terminos", vocabulario que la etiqueta no usa (CA-26) [repo:src/i18n/es.ts:40]
- `consentLabel`, `consentError` y `consentPrivacyUrl` por idioma nacen en `src/i18n/legal.ts` de s12, no en s07 [repo:docs/specs/sessions/s12-cumplimiento.md:26]
- D-05 (una casilla obligatoria desmarcada, texto limitado al contacto, privacidad por idioma) esta aprobada [KAREN:docs/specs/02-decisiones.md D-05 2026-10-01]
- D-10 (`select` nativo con `country` y `tel-country-code`, sin combobox) esta aprobada [KAREN:docs/specs/02-decisiones.md D-10 2026-10-01]
- Los tests corren en vitest con entorno jsdom [repo:vitest.config.ts:5]
Contextos: navegador en landings WordPress + Elementor/Hello (CSS del host activo, iOS 15+ y ultimas 2 versiones de escritorio); bundle esbuild 0.28.2 IIFE `es2019`; vitest 5.0.3 + jsdom 30.1.1 (sin cascada CSS real, el import de `.css` es cadena vacia); `tsc --noEmit`; Playwright E2E de s13 con `e2e/host.html` (futuro)

## 3. Fuentes primarias

- Selectors 4: especificidad = (A ids, B clases/atributos/pseudo-clases, C tipos) [ref:https://github.com/w3c/csswg-drafts/blob/d06dc03e286cadddd43e524a7d2edad62d6a225a/selectors-4/Overview.bs#L4426-L4428@d06dc03]
- Selectors 4: `:is()` y `:not()` toman la especificidad de su argumento mas especifico; `:where()` vale cero [ref:https://github.com/w3c/csswg-drafts/blob/d06dc03e286cadddd43e524a7d2edad62d6a225a/selectors-4/Overview.bs#L4441-L4453@d06dc03]
- Selectors 4: repetir el mismo selector simple esta permitido y sube la especificidad [ref:https://github.com/w3c/csswg-drafts/blob/d06dc03e286cadddd43e524a7d2edad62d6a225a/selectors-4/Overview.bs#L4515-L4516@d06dc03]
- MDN: si un selector de una lista es invalido o no soportado, se ignora todo el bloque; `:is()`/`:where()` son listas tolerantes [doc:https://developer.mozilla.org/en-US/docs/Web/CSS/Selector_list@2025-12-16]
- BCD: `:focus-visible` llega en Safari 15.4 (iOS espejo) [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/css/selectors/focus-visible.json@f2dd714]
- BCD: `@layer` llega en Safari 15.4 [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/css/at-rules/layer.json@f2dd714]
- BCD: `:where()` llega en Safari 14 [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/css/selectors/where.json@f2dd714]
- BCD: `appearance` sin prefijo llega en Safari 15.4; antes solo `-webkit-appearance` [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/css/properties/appearance.json@f2dd714]
- BCD: `accent-color` es parcial desde Safari 15.4 y completo recien en 26.2 [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/css/properties/accent-color.json@f2dd714]
- BCD: `HTMLElement.inert` llega en Safari 15.5 [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/api/HTMLElement.json@f2dd714]
- BCD: `prefers-reduced-motion` existe desde Safari 10.1 [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/css/at-rules/media.json@f2dd714]
- BCD: el flag `v` de RegExp (`unicodeSets`) llega en Safari 17 [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/javascript/builtins/RegExp.json@f2dd714]
- HTML: el token `country` es un codigo ISO 3166-1 alfa-2 (ej. `US`) [doc:https://html.spec.whatwg.org/multipage/form-control-infrastructure.html@living-standard]
- HTML: `tel-country-code` son digitos ASCII con `+` delante (ej. `+1`) y `tel-national` admite digitos y espacios [doc:https://html.spec.whatwg.org/multipage/form-control-infrastructure.html@living-standard]
- HTML: para un `select`, el valor de autofill es la opcion con selectedness, sin definir como el navegador elige cual marcar [doc:https://html.spec.whatwg.org/multipage/form-control-infrastructure.html@living-standard]
- WCAG 2.2 (Recomendacion 2024-12-12): 2.4.7 Focus Visible (AA) y 1.3.1 Info and Relationships (A) [doc:https://www.w3.org/TR/WCAG22/@2.2]
- WCAG 2.2 2.5.8 (AA): objetivo de puntero de al menos 24x24 CSS px, salvo espaciado, en linea o tamano del agente de usuario no modificado por el autor [doc:https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html@2.2]
- esbuild 0.28.0 agrega `import x from "./f" with { type: "text" }`, igual que el loader `text` [ref:https://github.com/evanw/esbuild/blob/609683d892977362a0f99026cb74b96263d728a9/CHANGELOG.md#L202-L208@609683d]
- esbuild: el loader `text` carga el archivo como cadena y la exporta por defecto [doc:https://esbuild.github.io/content-types/@0.28]
- esbuild: el CSS importado desde JS se junta en una hoja hermana del JS de cada entry [doc:https://esbuild.github.io/content-types/@0.28]
- esbuild: para evitar CSS demasiado moderno hay que declarar en `target` los navegadores [doc:https://esbuild.github.io/content-types/@0.28]
- Vitest 5.0.3: sin `css.include`, los archivos CSS se reemplazan por cadenas vacias [doc:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/docs/config/css.md#L10@5.0.3]
- jsdom 30.1.1 compila el atributo `pattern` con el flag `v` y lo ancla con `^(?:...)$` [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/lib/jsdom/living/nodes/HTMLInputElement-impl.js#L1018-L1023@0a117f4]
- TypeScript: un modulo ambiente con comodin (`declare module "*.html" { const content: string; export default content }`) tipa imports de loaders propios [doc:https://www.typescriptlang.org/docs/handbook/modules/reference.html@5.9]
- TypeScript 5.6: un import de efecto lateral no resuelto se ignora en silencio salvo con `noUncheckedSideEffectImports` [doc:https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html@5.6]
- Reusado de forms-v2-compliance C3: WCAG 2.2 1.3.5 (AA) se cumple con `autocomplete` [doc:https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html@2.2]
- Reusado de forms-v2-compliance C3: 1.4.11 (AA) pide 3:1 al indicador de foco y al borde de inputs y checkbox [doc:https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html@2.2]
- Reusado de embed-form-runtime: estilos sin capa ganan a cualquier `@layer` [doc:https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer@baseline-2022-03]

## 4. Implementaciones de referencia

- Elementor (plugin, fuente del CSS que vive en las landings): el Kit aplica estilo de campos con `{{WRAPPER}} input:not([type="button"]):not([type="submit"])` [ref:https://github.com/elementor/elementor/blob/c71debcf851a509ac9e482cb0d41502756171c95/core/kits/documents/tabs/theme-style-form-fields.php#L41-L45@c71debc]
- Elementor: el `{{WRAPPER}}` del Kit es `.elementor-kit-<id>`, asi que esa regla pesa (0,3,1) [ref:https://github.com/elementor/elementor/blob/c71debcf851a509ac9e482cb0d41502756171c95/core/kits/documents/kit.php#L77-L79@c71debc]
- Elementor: el Kit tambien estiliza todo `label` bajo `.elementor-kit-<id>` (0,1,1) [ref:https://github.com/elementor/elementor/blob/c71debcf851a509ac9e482cb0d41502756171c95/core/kits/documents/tabs/theme-style-form-fields.php#L37-L39@c71debc]
- Hello Elementor (tema oficial de Elementor): reset global de `input[type="text|email|tel"]`, `select` y `textarea` con width, border, padding y transition (0,1,1) [ref:https://github.com/elementor/hello-theme/blob/601cbee15a3b7bf6fa4a5ba8310286cfbffb8109/dev/scss/reset/_forms.scss#L30-L50@601cbee]
- Hello Elementor: `label` global con `display:inline-block` y `line-height:1` [ref:https://github.com/elementor/hello-theme/blob/601cbee15a3b7bf6fa4a5ba8310286cfbffb8109/dev/scss/reset/_forms.scss#L7-L12@601cbee]
- Hello Elementor: foco global con `:focus-visible` y `:focus:not(:focus-visible)` sobre `input`, `select`, `button` [ref:https://github.com/elementor/hello-theme/blob/601cbee15a3b7bf6fa4a5ba8310286cfbffb8109/dev/scss/reset/_focus.scss#L7-L23@601cbee]
- GOV.UK Frontend (sistema de diseno del gobierno britanico, push 2026-10-01): el error recibe id `<id>-error` y se suma al `aria-describedby` del input [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/components/input/template.njk#L100-L102@283cc58]
- GOV.UK Frontend: el input expone `autocomplete` e `inputmode` como parametros del componente [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/components/input/template.njk#L52-L65@283cc58]
- GOV.UK Frontend: checkbox de 40 px con area tactil de 44 px; la variante chica es 24 px [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/components/checkboxes/_mixin.scss#L5-L8@283cc58]
- GOV.UK Frontend: su helper visually-hidden usa `position:absolute`, 1x1 px, `clip-path` y `!important` para que nada lo pise [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/helpers/_visually-hidden.scss#L19-L32@283cc58]
- axe-core (Deque, motor de los linters a11y): `aria-hidden-focus` falla solo si el subarbol oculto tiene elementos tabulables [ref:https://github.com/dequelabs/axe-core/blob/6efcb6e8408dcee3d44ee813d66f557de145f373/lib/rules/aria-hidden-focus.json@6efcb6e]
- axe-core: la comprobacion pasa cuando `tabbableElements` esta vacio, que es el caso de un input con `tabindex="-1"` [ref:https://github.com/dequelabs/axe-core/blob/6efcb6e8408dcee3d44ee813d66f557de145f373/lib/checks/keyboard/focusable-not-tabbable-evaluate.js#L12-L16@6efcb6e]
- Reusado de forms-v2-compliance: spatie/laravel-honeypot pone el campo en un contenedor `aria-hidden`, `tabindex="-1"` y autocompletado apagado [ref:https://github.com/spatie/laravel-honeypot/blob/407d5ba3c0b789b10a3af3afdab250bb01f16326/resources/views/honeypotFormFields.blade.php#L5@407d5ba]
- Reusado de embed-form-runtime: Formbricks aisla en light DOM con un reset prefijado por un id de contenedor (`#fbjs *`) [ref:https://github.com/formbricks/formbricks/blob/f1fc4adbc38bf49615fc13db30698c056a381a60/packages/surveys/src/styles/preflight.css#L1-L14@f1fc4ad]
- Tailwind v3 documenta su estrategia `important: "#app"`: subir especificidad con un selector raiz en vez de `!important`, para no pisar estilos en linea [doc:https://v3.tailwindcss.com/docs/configuration@3]

## 5. Opciones

Decision 1, como gana el CSS del widget a Elementor/Hello:

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Especificidad calculada: raiz repetida `.atfx-leadkit.atfx-leadkit.atfx-leadkit` + clase del control, (0,4,0) > (0,3,1) [ref:https://github.com/w3c/csswg-drafts/blob/d06dc03e286cadddd43e524a7d2edad62d6a225a/selectors-4/Overview.bs#L4515-L4516@d06dc03] | Sin `!important`; el host aun puede tematizar via `--atfx-*`; patron de Tailwind/Formbricks (raiz fuerte) sin id fijo | Selectores feos; si el host usa `!important` o un id, pierde igual | baja | Si |
| B. `!important` en las propiedades del reset [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/helpers/_visually-hidden.scss#L19-L32@283cc58] | Gana a todo CSS de autor normal sin importar especificidad ni orden | Tailwind lo desaconseja por pisar estilos en linea; el host no puede ajustar nada sin otro `!important` | baja | Solo para el honeypot (que nada debe mostrar), como GOV.UK |
| C. Clases simples `.atfx-leadkit .atfx-x` (0,2,0) y confiar en el orden [ref:https://github.com/elementor/elementor/blob/c71debcf851a509ac9e482cb0d41502756171c95/core/kits/documents/tabs/theme-style-form-fields.php#L41-L45@c71debc] | Lo mas legible | Pierde contra el Kit de Elementor (0,3,1) en todo input | baja | No |
| D. `@layer` o `:where()` para el reset [doc:https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer@baseline-2022-03] | Facil de sobreescribir | Pierde contra el host por definicion, y `@layer` no existe en iOS 15.0-15.3 | baja | No |

Decision 3, como llega el CSS al bundle (no es archivo de s07, pero s07 lo necesita para probar):

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| T1. `with { type: "text" }` o loader `text` + `injectStylesOnce` [ref:https://github.com/evanw/esbuild/blob/609683d892977362a0f99026cb74b96263d728a9/CHANGELOG.md#L202-L208@609683d] | Coincide con s01 y la arquitectura (un JS autocontenido) | El CSS entra sin minificar ni ajustar a navegadores; requiere un `.d.ts` y `styles.ts` que s07 no lista | media | Si, en la sesion que cablea entries (s9) |
| T2. Loader `css` con hoja hermana (config actual) [doc:https://esbuild.github.io/content-types/@0.28] | Minifica; ya funciona | Dos archivos por form, contradice RNF-01/s14 "CSS dentro del JS" | baja | No, salvo que Karen cambie la arquitectura |

## 6. Evidencia en contra

- Contra A: la especificidad no gana a `!important` del host ni a selectores con id; si la landing de ATFX tiene CSS propio con `!important` sobre inputs, A no basta [ref:https://github.com/w3c/csswg-drafts/blob/d06dc03e286cadddd43e524a7d2edad62d6a225a/selectors-4/Overview.bs#L4426-L4428@d06dc03]
- Se acepta y se mide: el E2E de s13 ya pide un host con CSS agresivo; debe copiar literal los selectores del Kit y de Hello, y lo que no se pueda ganar se documenta como limite [repo:docs/specs/sessions/s13-e2e.md:12]
- Contra `select` nativo con autofill (D-10): el autofill entrega `CO` y `+57`, y las opciones valen `COL` y `57`; la spec HTML no dice como el navegador empareja opciones [doc:https://html.spec.whatwg.org/multipage/form-control-infrastructure.html@living-standard]
- Se acepta: D-10 esta aprobada y los valores son contrato con Salesforce; el riesgo se reduce a probar autofill en Chrome y Safari (ver seccion 9) [KAREN:docs/specs/02-decisiones.md D-10 2026-10-01]
- Contra `aria-hidden` sobre un input: la regla axe `aria-hidden-focus` lo marca si es tabulable [ref:https://github.com/dequelabs/axe-core/blob/6efcb6e8408dcee3d44ee813d66f557de145f373/lib/rules/aria-hidden-focus.json@6efcb6e]
- Se resuelve: con `tabindex="-1"` no es tabulable y la comprobacion pasa [ref:https://github.com/dequelabs/axe-core/blob/6efcb6e8408dcee3d44ee813d66f557de145f373/lib/checks/keyboard/focusable-not-tabbable-evaluate.js#L12-L16@6efcb6e]

## 7. Ejemplares y anti-ejemplos

- Bien: error con id propio sumado a `aria-describedby` del input (`errorId = id + '-error'`) [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/components/input/template.njk#L100-L102@283cc58]
- Bien: separar `:focus-visible` y `:focus:not(:focus-visible)` en reglas distintas, como hace Hello (su primera regla es `:focus-visible`, no `:focus`). La regla `:focus` con outline como red para iOS 15.0-15.3 es recomendacion propia de este brief: el navegador viejo descarta solo las reglas con `:focus-visible` [ref:https://github.com/elementor/hello-theme/blob/601cbee15a3b7bf6fa4a5ba8310286cfbffb8109/dev/scss/reset/_focus.scss#L7-L23@601cbee]
- Mal: `.atfx-leadkit input:focus, .atfx-leadkit input:focus-visible { ... }` en una sola lista; en Safari < 15.4 se pierde la regla entera [doc:https://developer.mozilla.org/en-US/docs/Web/CSS/Selector_list@2025-12-16]
- Bien: honeypot en un contenedor `aria-hidden` con el input `tabindex="-1"` y nombre que el autofill no reconoce [ref:https://github.com/spatie/laravel-honeypot/blob/407d5ba3c0b789b10a3af3afdab250bb01f16326/resources/views/honeypotFormFields.blade.php#L5@407d5ba]
- Bien: ocultar con `position:absolute`, 1x1, `clip-path` y `!important` (no `display:none`), como el helper de GOV.UK [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/helpers/_visually-hidden.scss#L19-L32@283cc58]
- Mal: `appearance: none` solo, sin `-webkit-appearance: none`; iOS 15.0-15.3 lo ignora [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/css/properties/appearance.json@f2dd714]

## 8. Trampas

- Kit de Elementor (0,3,1) gana a `.atfx-leadkit .atfx-x` (0,2,0) en todo input del form [ref:https://github.com/elementor/elementor/blob/c71debcf851a509ac9e482cb0d41502756171c95/core/kits/documents/tabs/theme-style-form-fields.php#L41-L45@c71debc]
- Hello pone `width:100%`, padding y `transition: all .3s` a inputs y selects; el reset debe fijar esas propiedades, no solo color y borde [ref:https://github.com/elementor/hello-theme/blob/601cbee15a3b7bf6fa4a5ba8310286cfbffb8109/dev/scss/reset/_forms.scss#L30-L50@601cbee]
- `@layer` en el CSS del widget pierde contra el host y no existe en iOS 15.0-15.3 [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/css/at-rules/layer.json@f2dd714]
- `inert` no existe en iOS 15.0-15.4; no usarlo para deshabilitar el form durante el envio [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/api/HTMLElement.json@f2dd714]
- `accent-color` es parcial en Safari hasta 26.2; el color de marca del checkbox no puede depender de el [ref:https://github.com/mdn/browser-compat-data/blob/f2dd714f4923299ce2c56b7379252f78eed74417/css/properties/accent-color.json@f2dd714]
- Si el reset cambia el tamano del checkbox se pierde la excepcion de "agente de usuario" de 2.5.8 y el objetivo debe medir 24x24 o tener espacio libre [doc:https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html@2.2]
- El atributo `pattern` no quita espacios y el schema si; un telefono autocompletado como `tel-national` con espacios queda `:invalid` aunque el schema lo acepte [repo:src/forms/shared-fields.ts:44]
- Por eso no se estiliza `:invalid` ni se usa `checkValidity()`; el estado de error lo pone solo `aria-invalid` desde el schema [doc:https://html.spec.whatwg.org/multipage/form-control-infrastructure.html@living-standard]
- jsdom compila `pattern` con `v` y Safari < 17 no tiene `v`; un test verde de `patternMismatch` en jsdom no prueba iOS 15 [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/lib/jsdom/living/nodes/HTMLInputElement-impl.js#L1018-L1023@0a117f4]
- En vitest el import de un `.css` vale cadena vacia; un test que lea el CSS debe leer el archivo con `node:fs` [doc:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/docs/config/css.md#L10@5.0.3]
- `import css from "./x.css"` necesita una declaracion `declare module "*.css"` con default `string`; ese `.d.ts` no esta en la lista de archivos de s07 [doc:https://www.typescriptlang.org/docs/handbook/modules/reference.html@5.9]
- `src/styles/leadkit.css` no lo importa nadie hoy: el entry importa `./lead.css` y el plugin da un placeholder, asi que el CSS de s07 no llega al bundle sin otra sesion [repo:esbuild.config.mjs:45]
- Con loader `text`, esbuild no minifica ni ajusta el CSS al target; prefijos y fallbacks de iOS 15 se escriben a mano [doc:https://esbuild.github.io/content-types/@0.28]
- La spec y la arquitectura no coinciden en la ruta del CSS (`src/styles/` contra `src/ui/`) [repo:docs/specs/04-arquitectura.md:56]
- Tests en jsdom con los textos de `es.ts` de hoy validarian un consentimiento de marketing contrario a D-05 [repo:src/i18n/es.ts:18]
- Contexto navegador: aislamiento, contraste, foco y 24x24 solo se prueban con cascada real, es decir en Playwright de s13, no en jsdom [repo:docs/specs/sessions/s13-e2e.md:12]
- Contexto `tsc`: sin `noUncheckedSideEffectImports`, un import de efecto lateral de un `.css` mal escrito pasa el typecheck en silencio [doc:https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html@5.6]

## 9. Incertidumbre

- ASSUMPTION: Chrome y Safari iOS emparejan el autofill `country` (`CO`) con la opcion por su texto ("Colombia") aunque el value sea `COL`. prueba: harness local con perfil de autofill en Chrome y en Safari iOS 15/16; registrar que opcion queda marcada
- ASSUMPTION: el autofill `tel-country-code` (`+57`) no empareja con values `57`/`1-242` ni con etiquetas que empiezan con bandera emoji, y el prefijo queda sin marcar. prueba: misma corrida; si falla, la preseleccion por `attrs.country` es la unica ayuda real
- ASSUMPTION: `PHONE_PATTERN` compila igual con el flag `u` que usan Safari 15-16 para `pattern`. prueba: en un test, `new RegExp(PHONE_PATTERN, "u")` no lanza y acepta y rechaza los mismos casos que con `v`
- ASSUMPTION: las landings de ATFX no agregan CSS propio con `!important` o ids sobre inputs del form. prueba: Karen exporta el CSS custom del sitio y del Kit desde el admin de Elementor y se busca `!important` en reglas de `input`, `select`, `label`, `button`
- ASSUMPTION: en iOS 15 un input con `font-size` menor a 16 px hace zoom al enfocar. prueba: harness en un iPhone con iOS 15/16 y fuente de 15 px contra 16 px
- [NEEDS CLARIFICATION: el consentimiento de s07 usa el texto actual de `i18n` (que menciona productos y servicios y "terminos", contra D-05 y CA-26) o s07 recibe ya un `LegalCopy` provisional (`consentLabel`, `consentError`, `consentPrivacyUrl`) que s12 completa? Sin URL por idioma, el test de enlace de privacidad de s07 no tiene dato]
- [NEEDS CLARIFICATION: que sesion crea `styles.ts`, el `.d.ts` de `*.css` y cambia el entry y `esbuild.config.mjs` a loader `text`, y cual es la ruta del CSS (`src/styles/` o `src/ui/`)]

## 10. Checklist de estandar

- [ ] Dos `renderForm` con `instanceId` distintos: `document.querySelectorAll("[id]")` sin duplicados, y cada `label[for]`, `aria-describedby` apuntan a un nodo del mismo form
- [ ] `autocomplete`: `given-name`, `family-name`, `email`, `tel-national`, `country` y `tel-country-code` en los controles pedidos; el honeypot con nombre no autocompletable
- [ ] `attrs.country = "CO"` deja `COL` y `57` seleccionados sin red; un ISO2 sin prefijo deja el placeholder
- [ ] `showFieldErrors` con `<img src=x onerror=alert(1)>` deja texto literal, `aria-invalid="true"` y el id del error en `aria-describedby`; ningun `innerHTML` recibe datos (grep en `src/ui`)
- [ ] Checkbox de consentimiento unico, desmarcado al render en es/en/pt; enlace de privacidad fuera del `label`
- [ ] Honeypot: contenedor `aria-hidden="true"`, input `tabindex="-1"`, oculto por posicion y clip (no `display:none`); `readValues` lo devuelve como `honeypot`
- [ ] `setBusy(true)` deshabilita el boton y pone `aria-busy="true"`; `setBusy(false)` lo revierte
- [ ] CSS: cero `:root`, cero `@layer`, todo selector empieza con `.atfx-leadkit` o `[data-atfx-leadkit]` (test que lee el archivo con `node:fs`)
- [ ] CSS: reglas de controles con especificidad mayor que (0,3,1), y las de foco mayor que (0,4,1) (selector de foco del Kit: `input:focus:not([type=button]):not([type=submit])`); `:focus` y `:focus:not(:focus-visible)` en reglas separadas; `-webkit-appearance` junto a `appearance`
- [ ] CSS: checkbox con objetivo de 24x24 CSS px o mas; foco con contraste 3:1; `@media (prefers-reduced-motion: reduce)` anula la animacion de entrada
- [ ] E2E s13: el form renderiza igual con los selectores literales del Kit de Elementor y del reset de Hello cargados en el host

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | Selectors Level 4, Overview.bs (especificidad) | W3C CSSWG | @d06dc03 | 2026-10-02 | high |
| 2 | Selector list | MDN | 2025-12-16 | 2026-10-02 | high |
| 3 | browser-compat-data (focus-visible, layer, where, appearance, accent-color, inert, media, RegExp) | MDN | @f2dd714 | 2026-10-02 | high |
| 4 | HTML Standard, autofill | WHATWG | living standard | 2026-10-02 | high |
| 5 | WCAG 2.2 y Understanding 2.5.8 | W3C | 2024-12-12 | 2026-10-02 | high |
| 6 | esbuild CHANGELOG 0.28.0 y Content Types | esbuild | 0.28.2 @609683d | 2026-10-02 | high |
| 7 | Vitest config css | Vitest | 5.0.3 @33cadea | 2026-10-02 | high |
| 8 | jsdom HTMLInputElement-impl | jsdom | 30.1.1 @0a117f4 | 2026-10-02 | high |
| 9 | TypeScript modules reference y release notes 5.6 | Microsoft | 5.9 / 5.6 | 2026-10-02 | high |
| 10 | Elementor Kit form fields y kit.php | Elementor | @c71debc | 2026-10-02 | high |
| 11 | Hello Elementor reset forms y focus | Elementor | @601cbee | 2026-10-02 | high |
| 12 | GOV.UK Frontend input, checkboxes, visually-hidden | alphagov | @283cc58 | 2026-10-02 | high |
| 13 | axe-core aria-hidden-focus | Deque | @6efcb6e | 2026-10-02 | high |
| 14 | Tailwind CSS v3 configuration, important | Tailwind Labs | v3 | 2026-10-02 | medium |
| 15 | Reusados: embed-form-runtime, forms-v2-compliance, embed-form-submit-privacy | este repo | 2026-10-01 | 2026-10-02 | medium |

## Reuso (2026-10-02, rama `fix/s07-input-overflow`)

Este brief sostiene el fix del desbordamiento de controles reportado por Karen en el preview:
los controles del formulario (secciones de UI y CSS de este brief) se salian del borde interno.
Causa principal: el root `.atfx-leadkit` estaba en la regla `box-sizing: inherit`, asi que perdia
su propio `border-box` y heredaba el `content-box` del host; con `width: 100%` mas padding y borde,
cada control medi­a 26px (y 50px en selects) de mas. El fix saca el root de esa regla. Como refuerzo
agrega `min-width: 0` a los grid items y `minmax(0, 1fr)` a la fila de consentimiento, sin cambiar
colores, especificidad de foco ni las reglas de iOS 15 ya cubiertas aqui. No introduce APIs ni
dependencias nuevas.
