```
 █████╗ ████████╗███████╗██╗  ██╗
██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝
███████║   ██║   █████╗   ╚███╔╝
██╔══██║   ██║   ██╔══╝   ██╔██╗
██║  ██║   ██║   ██║     ██╔╝ ██╗
╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝
██╗     ███████╗ █████╗ ██████╗ ██╗  ██╗██╗████████╗
██║     ██╔════╝██╔══██╗██╔══██╗██║ ██╔╝██║╚══██╔══╝
██║     █████╗  ███████║██║  ██║█████╔╝ ██║   ██║
██║     ██╔══╝  ██╔══██║██║  ██║██╔═██╗ ██║   ██║
███████╗███████╗██║  ██║██████╔╝██║  ██╗██║   ██║
╚══════╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝   ╚═╝
```

# atfx-leadkit

Formularios de captación de leads para las landings de ATFX LATAM. Reemplaza los
paquetes `at_forms` y `atfx-forms-newAug26`, que quedan deprecados.

Cada formulario se compila a **un solo archivo JavaScript autocontenido** (el CSS va
embebido) que se monta sobre un `<div>` marcador dentro de una landing de WordPress +
Elementor, construye el formulario en **light DOM**, valida la entrada y la envía al
mismo `admin-ajax.php` que ya usan las landings actuales, sin cambiar el contrato con
Salesforce.

> **Estado:** sesiones s0–s9 en `main` (formulario funcional de punta a punta). Pendientes
> s10 (caducidad de campaña), s11 (thank-you), s12 (textos legales), s13 (E2E), s14
> (distribución npm + CI de release). Ver [`docs/specs/00-programa.md`](docs/specs/00-programa.md).

---

## Índice

- [Por qué existe](#por-qué-existe)
- [Arquitectura](#arquitectura)
- [Flujo de una instancia](#flujo-de-una-instancia)
- [El puerto `FormUi`](#el-puerto-formui)
- [Contrato con Salesforce](#contrato-con-salesforce)
- [Seguridad y privacidad](#seguridad-y-privacidad)
- [Internacionalización](#internacionalización)
- [Atributos del contenedor](#atributos-del-contenedor)
- [Build y scripts](#build-y-scripts)
- [Pruebas](#pruebas)
- [QA local y en WordPress](#qa-local-y-en-wordpress)
- [Flujo de desarrollo](#flujo-de-desarrollo)
- [Estructura del repositorio](#estructura-del-repositorio)

---

## Por qué existe

Una auditoría de `at_forms` (2026-10-01, riesgo 35/100) encontró: release sin gate ni SRI,
link de Zoom sin validar, consentimiento premarcado, reintentos y hooks que duplicaban
leads, y cero tests. Se decidió **recrear** el paquete en vez de parcharlo. Las landings
viejas siguen con el paquete viejo; este no migra nada hacia atrás.

El contrato de datos con Salesforce es intocable: las llaves y valores que llegan al CRM
no se modifican. Todo el diseño gira alrededor de preservarlo.

## Arquitectura

Vanilla **TypeScript** (sin framework), empaquetado con **esbuild** en formato IIFE, un
bundle por formulario. Sin runtime de componentes: la UI es composición de funciones puras
que devuelven nodos del DOM. Objetivo de compilación `ES2019`, `strict`. Única dependencia
de runtime: **zod** (validación de esquemas).

```
src/
├── entries/            punto de entrada por formulario; solo llaman a observe()
│   ├── lead.ts
│   └── interest.ts
├── core/               lógica sin DOM de presentación
│   ├── mount.ts        descubre contenedores, monta una vez, API window.atfxLeadkit
│   ├── controller.ts   orquesta un envío (lock, honeypot, validación, popup, submit)
│   ├── submit.ts       fetch único a admin-ajax, sin reintentos
│   ├── response.ts     schema zod de la respuesta de Elementor
│   ├── analytics.ts    hooks gtag/dataLayer/fbq, aislados, solo tras éxito
│   ├── attrs.ts        parseo y saneo de los data-* del contenedor
│   ├── url.ts          validación de URLs (Zoom, cierre)
│   └── time.ts         fechas, zonas horarias, agenda
├── ui/                 construcción y manipulación del DOM del formulario
│   ├── render.ts       renderForm() + readValues/showFieldErrors/setBusy
│   ├── fields.ts       primitivas de campo, ids por instancia, opciones de selects
│   ├── states.ts       pantallas de resultado (gracias / rechazo / desconocido)
│   └── form-ui.ts       adaptador del puerto FormUi sobre render.ts y states.ts
├── forms/              configuración por formulario
│   ├── shared-fields.ts patrones compartidos (nombre, email, teléfono)
│   ├── lead/           config.ts (FormDefinition) + schema.ts (zod)
│   └── interest/       config.ts + schema.ts
├── contract/           la verdad del payload
│   ├── payload.ts      buildPayload() + ENDPOINT + toFormData()
│   ├── picklist.ts     valores de lead_source
│   └── types.ts
├── data/               países (ISO3) y prefijos telefónicos
├── i18n/               diccionarios es / en / pt + resolución de idioma
└── styles/             leadkit.css + inyección única (styles.ts)
```

### Separación de capas

- **`core/`** no conoce `render.ts` ni `states.ts`. El controlador depende de la interfaz
  `FormUi`, no de la UI concreta.
- **`ui/`** construye y manipula DOM; no sabe nada de `fetch` ni de analítica.
- **`contract/`** es la única fuente del payload. El formulario se arma **desde datos**, no
  serializando el DOM, así que un input que otro script inyecte dentro del `<form>` no se
  envía.

## Flujo de una instancia

```
mount.ts  → parseMountAttrs(dataset) → scheduleState(attrs, now)
          → si no está "open": pinta el estado cerrado y termina
          → renderForm() → createFormUi() → bindController()

submit    → preventDefault → lock de un envío en vuelo
          → ¿honeypot lleno? → thank-you falso, sin red
          → schema.safeParse → si inválido: errores por campo + foco
          → scheduleState otra vez (se recalcula en cada envío)
          → abrir popup de Zoom (modo webinar) síncrono, opener = null
          → buildPayload → submitLead (un solo fetch)
          → ok:      thank-you, navega el popup, analítica
          → rejected: errores por campo, cierra el popup
          → unknown:  "resultado desconocido" con reintento manual, cierra el popup
          → finally:  libera el lock
```

### Montaje (s9)

- Selector `[data-atfx-leadkit="<key>"]`. Contenedores de otro formulario se ignoran.
- Idempotente: `data-atfx-mounted` + un `WeakSet` compartido en `window.atfxLeadkit` que
  **re-monta clones** (un contenedor clonado sin listener haría un GET nativo con datos
  personales en la URL).
- Tardío: un `MutationObserver` sobre `document.body` capta contenedores insertados después
  (popups de Elementor).
- Multi-instancia: `instanceId` determinista (contador + key); todos los `id` del DOM lo
  llevan, así que dos formularios en una página no colisionan.
- `window.atfxLeadkit` se valida: si otro script lo definió con una forma inesperada, el
  bundle **falla cerrado** (no monta nada) en vez de romper.

## El puerto `FormUi`

El controlador no importa la UI. Depende de esta interfaz, y `form-ui.ts` la implementa
cerrando sobre el `form`, el contenedor de estado, el `instanceId` y el diccionario:

```ts
interface FormUi {
  readValues(): Record<string, unknown>;
  setBusy(busy: boolean): void;
  showFieldErrors(errors: Record<FieldKey, string>): void;
  focusFirstInvalid(field: FieldKey): void;
  showState(state: UiState): void;
}
```

Las pantallas de resultado se pintan en un contenedor con `role="status"` aparte del
`<form>`, nunca encima: así el botón de reintento del estado "desconocido" sigue pudiendo
disparar un envío (un `<form>` desconectado del DOM no puede navegar).

## Contrato con Salesforce

| Aspecto | Valor |
|---|---|
| Método | `POST` |
| URL | `/wp-admin/admin-ajax.php` (mismo origen de la landing) |
| Cuerpo | `FormData` multipart |
| Header | `X-Requested-With: XMLHttpRequest` (sin él, SF se salta en silencio) |
| Reintentos | ninguno (un reintento duplicaba leads) |

`success: true` significa **encolado** en WordPress, no que el lead exista en Salesforce.
Los rechazos llegan con HTTP 200 y se deciden por `success`, no por `response.ok`. La
respuesta se valida con zod; lo que no cumple el schema es "resultado desconocido".

La especificación completa, campo por campo, está en
[`docs/specs/03-contrato-salesforce.md`](docs/specs/03-contrato-salesforce.md). **No se
modifica sin una decisión explícita.**

## Seguridad y privacidad

- **XSS:** todo texto se escribe con `textContent`; nunca `innerHTML`, `eval` ni
  `document.write`. Los mensajes de error del servidor se muestran como texto.
- **Popup de webinar:** se abre con `about:blank`, se le pone `opener = null` de inmediato, y
  solo navega a un link de Zoom ya validado (`https://*.zoom.us`, sin credenciales ni
  puerto), nunca al `redirect_url` de la respuesta.
- **Honeypot:** campo oculto fuera del orden de tabulación; si llega lleno, se muestra un
  thank-you falso sin enviar nada.
- **Sin PII en analítica:** los hooks reciben solo `{ form, aanumber }`; un hook que lanza
  no rompe el resto ni filtra datos.
- **Sin terceros ni geo-IP** por defecto (D-11). El país se puede preseleccionar vía
  `data-country` si el servidor lo inyecta.

## Internacionalización

Tres idiomas: **es / en / pt**, resueltos desde `data-lang` (o `es` por defecto). El valor
que llega a Salesforce es el mismo en los tres idiomas; solo cambia la etiqueta visible. Los
diccionarios viven en `src/i18n/{es,en,pt}.ts` con un tipo compartido en `types.ts`.

## Atributos del contenedor

El `<div>` marcador acepta estos `data-*` (todos opcionales salvo la key):

| Atributo | Para qué |
|---|---|
| `data-atfx-leadkit` | **requerido**: `lead` o `interest` |
| `data-lang` | `es` \| `en` \| `pt` |
| `data-theme` | `light` \| `dark` |
| `data-country` | ISO2 para preseleccionar país y prefijo |
| `data-lead-source` | valor del picklist de SF |
| `data-bdm-owner` | Id de usuario SF (`005...`) |
| `data-zoom-link` | link de Zoom (modo webinar) |
| `data-webinar-topic` / `data-webinar-date` / `data-webinar-tz` | datos del webinar |
| `data-debug` | imprime la versión en consola |

## Build y scripts

```bash
npm run typecheck     # tsc --noEmit
npm run test          # vitest run
npm run test:cov      # vitest run --coverage
npm run build         # esbuild → dist/assets/<form>-<hash>.js  (CSS embebido, sin .css)
npm run dev           # build con sourcemaps
```

`npm run build` produce **un JS por formulario** más un `manifest.json`. No hay `.css`
hermano: cada bundle inyecta su CSS una sola vez al montar.

## Pruebas

- **Unitarias / integración:** vitest + jsdom. 14 archivos, 308 pruebas (`npm run test`).
  Cada sesión siguió TDD (RED → GREEN) y se revisó por tres agentes (código, seguridad, QA)
  antes de integrarse.
- **Estilos:** los tests de CSS leen `leadkit.css` con `node:fs` y comprueban especificidad,
  reglas seguras para iOS 15, contraste y overflow — lo que jsdom no puede medir por capas.
- **Smoke de navegador:** `scripts/qa-smoke.mjs` corre en Chromium y WebKit (motor de iOS
  Safari) contra un mock local; verifica el montaje, el popup tardío, un envío por formulario
  y el payload **valor por valor** contra el contrato.

## QA local y en WordPress

```bash
node scripts/qa-kit.mjs           # construye dist/qa/: snippets de Elementor + preview.html
node scripts/qa-kit.mjs --serve   # además sirve la preview en http://127.0.0.1:4173
node scripts/qa-smoke.mjs         # corre el smoke en Chromium y WebKit
```

- `dist/qa/preview.html`: los tres formularios con admin-ajax **simulado** (nada sale de la
  máquina).
- `dist/qa/<form>-elementor.html`: el `<div>` marcador + el bundle inline, listo para pegar
  en un **widget HTML de Elementor**. En WordPress el envío va al admin-ajax real, así que
  genera un lead de verdad: usar datos de prueba, en una página no pública de
  `www.atfxlatam.com` (admin-ajax solo acepta ese origen).

## Flujo de desarrollo

El programa se entrega por **sesiones** (`docs/specs/sessions/sNN-*.md`), cada una una unidad
de trabajo con sus criterios de aceptación. Orden por sesión:

1. **Research** → `docs/research/<slug>.md`, verificado y aprobado antes de escribir código.
2. **TDD** → RED → GREEN → IMPROVE.
3. **Review** → code-reviewer + security-reviewer + qa-reviewer, cada uno con su VERDICT.
4. **Ship** → commit (tras el gate de revisión), PR y merge a `main`.

`main` está protegida: PR obligatorio, historial lineal, squash, check `verify` estricto
(typecheck + test + build en GitHub Actions, Node 22) y actions fijadas por SHA. Decisiones
de producto en [`docs/specs/02-decisiones.md`](docs/specs/02-decisiones.md).

## Estructura del repositorio

```
docs/
├── specs/        programa, requisitos, decisiones, contrato, arquitectura, sesiones
├── research/     briefs con fuentes que sostienen cada decisión
└── review/       handoffs del implementador + veredictos del reviewer
scripts/          kit de QA (qa-kit.mjs, qa-smoke.mjs)
src/              código (ver Arquitectura)
.github/          CI (verify)
```
