# s07 — handoff

## Archivos
- modificado: esbuild.config.mjs (loader `text` para `.css`; se retira el plugin `placeholder-css` y la clave `css` del manifest)
- modificado: src/entries/lead.ts, src/entries/interest.ts (importan `../styles/leadkit.css` como texto y llaman `injectStylesOnce`)
- modificado: src/i18n/es.ts, en.ts, pt.ts (solo `acceptance` y `validation.acceptance`, con marcador PENDIENTE_LEGAL; se retiran "productos y servicios" y "terminos")
- creado: src/styles/css.d.ts, src/styles/leadkit.css, src/styles/styles.ts
- creado: src/ui/fields.ts, src/ui/render.ts, src/ui/render.test.ts

Un implementador anterior dejo la mayoria hecha (se corto por limite de uso). Se valido contra el spec y el brief; en esta pasada se agrego: alcance del honeypot bajo `.atfx-leadkit` en el CSS, flecha CSS en los `select` (con `appearance: none` se perdia), y 17 tests nuevos/endurecidos (el test de CSS anterior solo buscaba subcadenas).

## RED
Los tests de CSS endurecidos (especificidad calculada por selector, raiz de cada selector, `!important` solo en honeypot, pares appearance, checkbox 24px, reduced motion) se escribieron antes de tocar el CSS:

```
FAIL  src/ui/render.test.ts > leadkit.css > every selector starts at the widget root
AssertionError: .atfx-leadkit__honeypot-container: expected '.atfx-leadkit__honeypot-container' to match /^(\.atfx-leadkit|\[data-atfx-leadkit\])(?![\w-])/
Tests  1 failed | 24 passed (25)
```

El resto de los tests nuevos pasaron de inmediato porque el trabajo previo ya cumplia (no hay RED para ellos; no se fabrico uno). El test de injection de `showFieldErrors` sobre los 8 campos tambien paso sin cambios de codigo: `render.ts` ya usaba solo `textContent`.

## GREEN
```
> tsc --noEmit            (sin errores)
Test Files  8 passed (8)
Tests  144 passed (144)
> node esbuild.config.mjs (ok)
```
Build: `dist/` contiene solo `manifest.json`, `assets/lead-PEVJHLZD.js` (5.3k) y `assets/interest-OFFMXLBP.js` (5.3k); ningun `.css`. El CSS esta dentro de cada JS (`atfx-leadkit-enter` aparece en el bundle). Manifest: `{lead:{js}, interest:{js}}`.

## Cobertura (archivos de la sesion)
| Archivo | Stmts | Branch | Funcs | Lines | Sin cubrir |
|---|---|---|---|---|---|
| src/styles/styles.ts | 90.9 | 83.33 | 100 | 90.9 | 5 (rama `document` indefinido, SSR) |
| src/ui/fields.ts | 100 | 80 | 100 | 100 | 46-50 |
| src/ui/render.ts | 97.27 | 69.23 | 100 | 97.27 | 76, 247, 252, 259 |
Global: 98.06 / 93.07 / 100 / 98.03. `src/entries/**` esta excluido por la config de vitest. render.ts queda en 69 % de ramas, bajo 80 % por archivo (el umbral global se cumple); son ramas defensivas (control/error ausente).

## Criterios cubiertos
- CA-03 (ids unicos, label for en su form): `creates two forms without duplicate ids and labels stay in scope`
- Autocomplete y pattern: `sets autocomplete attributes and phone pattern`; `PHONE_PATTERN compiles with the u flag...`
- Preseleccion sin red: `preselects country and dialling code from attrs.country`; `leaves the dialling placeholder selected when the country has no prefix`
- CA-14 parte UI: `renders server errors as text and sets aria attributes`; `paints every field message as text and never creates an element`; `src/ui never assigns innerHTML...`
- D-05 / CA-26: `renders one unchecked required consent checkbox in every language`; `every language marks the consent texts PENDIENTE_LEGAL and drops the marketing and terms wording`
- CA-27 (privacidad por idioma fuera del label): `renders privacy link outside consent label by language`; `renders the provisional privacy link marked PENDIENTE_LEGAL`
- Honeypot: `returns submitted values including honeypot` (aria-hidden, tabindex -1, autocomplete off); `uses !important only for the honeypot` (clip, sin display:none)
- setBusy: `setBusy toggles submit disabled and aria-busy`
- CSS (lee el archivo con node:fs): `has no :root, @layer...`, `every selector starts at the widget root`, `control rules beat the Elementor kit selector (0,3,1)`, `focus rules beat the kit focus selector (0,4,1)...`, `pairs -webkit-appearance with appearance...`, `checkbox target is at least 24x24 CSS px`, `defines tokens on the root and dark theme, and drops the entry animation for reduced motion`
- Estilos una vez: `injectStylesOnce injects a single style tag per document`, `injectStylesOnce ignores blank css`
- Condicion de seguridad del coordinador (s08): fijada con `paints every field message as text and never creates an element`. s07 no pinta estados (`showState`); eso queda para s08/s9.

## Desviaciones y preguntas
- `src/styles/css.d.ts` tambien declara `node:fs` (solo `readFileSync`) porque no hay `@types/node` y no se puede instalar ni tocar tsconfig/package.json; sin eso `tsc` falla en el test que lee el CSS. Pregunta: agregar `@types/node` (decision de Karen) y retirar el shim.
- `CONSENT_PRIVACY_URLS` y `CONSENT_PRIVACY_TEXT` viven en `src/ui/fields.ts`, no en i18n, porque `Dict` (src/i18n/types.ts) no esta en la lista de s07. Las URLs `atfx.com/<lang>/privacy-policy` son provisionales y sin verificar; s12 las reemplaza (D-36 pendiente). El texto lleva PENDIENTE_LEGAL; la URL no puede llevarlo, solo el comentario.
- `render.ts` exporta `FormDefinition = { key }` (el spec usa `FormDefinition` de s5 sin tipo concreto); s9 puede sustituirlo.
- jsdom no verifica cascada real, contraste, foco ni 24x24 reales ni autofill de `country`/`tel-country-code` contra values ISO3/digitos: queda para E2E s13 (supuestos del brief seccion 9).
- La especificidad se verifica con un calculador propio en el test (sin dependencia); no cubre selectores con `:is()`/`:where()`, que el CSS no usa.
- Sin hooks ni gates bloqueantes. No se toco docs/ de otros ni git.

## Ronda 2

Archivos: src/ui/render.r2.test.ts (nuevo), src/build.test.ts (nuevo), src/ui/render.ts, src/ui/fields.ts, src/ui/render.test.ts, src/styles/leadkit.css, src/styles/css.d.ts, esbuild.config.mjs (exporta `options` y `buildManifest`; el build y el `rmSync("dist")` solo corren como CLI, comportamiento de `npm run build` sin cambios).

### RED (antes de tocar codigo)
```
x css keeps [hidden] errors hidden even if the host sets display on paragraphs
x no selector list mixes :focus-visible with a bare :focus
  (la lista `:focus:not(:focus-visible)` mezclaba ambos)
x today the es/en/pt link uses a provisional url   (TypeError: PROVISIONAL_PRIVACY_URLS no existia)
x the source comment flags the urls for s12
x css.d.ts carries the HACK comment
x border is at least 3:1 ...   (expected 2.5388 >= 3; light #9ca3af sobre blanco)
FAIL src/build.test.ts  (Invariant TextEncoder en jsdom -> se fija @vitest-environment node)
Tests 8 failed | 28 passed (36)
```
Pasaron de inmediato (el codigo ya cumplia, no se fabrico RED): puntos 1 (hidden/textContent), 2, 3, 4 (salvo CSS ya correcto), 7, 8, 9 y los denylist del punto 5. El punto 6 no tenia RED real aparte del entorno: pasa tras exportar `options`/`buildManifest`.

### GREEN
```
tsc --noEmit  (sin errores)
Test Files 10 passed (10) | Tests 182 passed (182)
Coverage: 98.7 stmts / 94.75 branch / 100 funcs / 98.68 lines
npm run build ok: dist/manifest.json, assets/lead-DDET6F46.js, assets/interest-HYPGYMCU.js (4.7k c/u), ningun .css
```
Ambos bundles contienen `data-atfx-leadkit-style`; manifest `{lead:{js}, interest:{js}}`.

### Mapa test -> punto (src/ui/render.r2.test.ts salvo indicado)
1. `point 1: errors become visible` (+ regla CSS `.atfx-leadkit__error[hidden]{display:none}` agregada por si el host pisa `display`)
2. `point 2: labels in both directions`
3. `point 3: root form contract`
4. `point 4: honeypot` (name `atfx_hp_<instanceId>`, distinto por instancia)
5. `point 5: iOS 15 css safety`. Se retiraron las reglas `:focus:not(:focus-visible)` y `:focus-visible`: la lista mezclaba `:focus` y `:focus-visible` y era redundante con la regla `:focus`. Efecto: el aro de foco tambien aparece con raton. Test viejo de foco en render.test.ts ajustado.
6. src/build.test.ts
7. `point 7: input types`
8. `point 8: PENDIENTE_LEGAL on the privacy link`
9. `point 9`; la rama muerta de `clearErrorState` se elimino y la rama sin elemento de error se cubre con un form armado a mano
10. `point 10: node:fs shim marker` (comentario HACK en css.d.ts)
11. `point 11: provisional privacy urls` (`PROVISIONAL_PRIVACY_URLS` exportada; el link hoy usa una; s12 lo invierte)
12. `point 12`: borde light #6b7280, dark #64748b, >= 3:1 contra `--atfx-bg` y `--atfx-input-bg`

### Pendiente: cambio recibido a mitad de ronda (puntos 10 y 11)
Llego un mensaje que reemplaza los puntos 10 y 11 (instalar @types/node y retirar el shim; usar la URL real del PDF de privacidad y no exportar PROVISIONAL_PRIVACY_URLS). El clasificador de permisos bloqueo la edicion y no esta firmado en mi tarea original, asi que NO se aplico: esta ronda implementa los puntos 10 y 11 tal como estaban en la tarea. Si Karen lo confirma: quitar el shim de css.d.ts, poner la URL del PDF (solo en ingles) en CONSENT_PRIVACY_URLS, y cambiar los tests de los puntos 10 y 11.

## Ronda 3

Reemplaza los puntos 10 y 11 de la ronda 2 (decision de Karen, 2026-10-02).

- Punto 10: `@types/node` ya esta instalado; se elimino el shim `declare module "node:fs"` y su comentario HACK de `src/styles/css.d.ts` (queda solo `*.css`). typecheck pasa con los tipos reales.
- Punto 11: `PROVISIONAL_PRIVACY_URLS` se reemplazo por `CONSENT_PRIVACY_URLS` en `src/ui/fields.ts`, con la URL real del PDF de privacidad para es, en y pt. NOTA: el PDF esta solo en ingles (fuente Karen 2026-10-02). Se quito el PENDIENTE_LEGAL de las URLs; el TEXTO del consentimiento (`CONSENT_PRIVACY_TEXT` e i18n) SIGUE con PENDIENTE_LEGAL.
- Archivo fuera de la lista permitida, tocado por necesidad: `src/ui/render.ts` (solo el rename del import y su uso). Tambien se actualizo `src/ui/render.test.ts` (PRIVACY_BY_LANG fijaba las URLs provisionales).

### RED
`vitest run src/ui/render.r2.test.ts`: 4 failed | 32 passed (href es/en/pt distinto del PDF; css.d.ts aun contenia node:fs).

### GREEN
```
tsc --noEmit  (sin errores)
Test Files 10 passed (10) | Tests 181 passed (181)
Coverage: 98.7 stmts / 94.75 branch / 100 funcs / 98.68 lines
npm run build ok
```
Ningun archivo de src referencia ya `PROVISIONAL_PRIVACY_URLS`. Test nuevo `round 3: real privacy url`: href exacto, target `_blank`, rel `noopener noreferrer` en es/en/pt.

## Ronda 4

- Punto 1: el chequeo `focusRuleViolations` (render.r2.test.ts) revisa el CUERPO de cada regla con `:focus`: outline >= 2px, estilo visible, color `var(--atfx-focus)`, offset no negativo. Casos sinteticos (none, 0, 1px, color distinto, offset negativo, sin outline) deben fallar.
- Punto 2: `--atfx-focus` >= 3:1 contra `--atfx-bg` y `--atfx-input-bg` en light y dark. Ya cumplia; no se cambio el token.
- Punto 3: regla de foco propia para `input.atfx-leadkit__checkbox:focus` (4 clases de raiz, supera (0,4,1)), agregada a la lista de foco en leadkit.css. render.test.ts exige ahora >= 4 selectores de foco.
- Punto 4: `mixedFocusLists` se prueba con CSS sintetico: detecta `:focus, :focus-visible` en una lista y no marca un hermano `:not(:focus-visible)`.

### RED
`vitest run src/ui/render.r2.test.ts`: 3 failed | 44 passed (checkbox sin regla de foco x2; un caso de mi propio sintetico mal formulado, corregido).

### GREEN
```
tsc --noEmit  (sin errores)
Test Files 10 passed (10) | Tests 192 passed (192)
Coverage: 98.7 stmts / 94.75 branch / 100 funcs / 98.68 lines
npm run build ok
```
