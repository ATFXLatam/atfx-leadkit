# Spec — atfx-leadkit

Estado: BORRADOR (pendiente de aprobación de Karen y de las decisiones de `02-decisiones.md`).

## 1. Objetivo

Un paquete nuevo de formularios de captación de leads para las landings de ATFX LATAM que entregue
cada lead a Salesforce **una sola vez**, con el contrato actual intacto, consentimiento válido,
caducidad por campaña y un thank-you que empuje el siguiente paso, sin los fallos del paquete
anterior (`~/Desktop/security-audit-atfx-forms-2026-10-01.md`).

Métricas de éxito:
- 0 leads duplicados atribuibles al cliente (hoy: reintentos y hooks pueden duplicar).
- 0 leads aceptados por un formulario con campaña cerrada.
- Bundle ≤ 20 KB brotli por formulario (hoy 49 KB).
- Cobertura ≥ 80 % y un test golden por cada variante del payload.

## 2. Requisitos funcionales

### Montaje y configuración
- **RF-01** Un formulario se declara con `<div data-atfx-leadkit="<form>">` y atributos `data-*`
  (D-04). Formularios: `lead` e `interest`.
- **RF-02** El montaje es idempotente: el mismo nodo no se monta dos veces aunque el script cargue
  dos veces.
- **RF-03** Contenedores que aparecen después de la carga (popups de Elementor) se montan
  automáticamente, y existe una API pública `window.atfxLeadkit.mount(root?)`.
- **RF-04** Varias instancias en la misma página no comparten `id` (cada id lleva sufijo por
  instancia) y las etiquetas apuntan a su propio campo.
- **RF-05** Atributos soportados y su validación, en un único punto de entrada:

| Atributo | Valores | Si es inválido |
|---|---|---|
| `data-lang` | `es`, `en`, `pt` y variantes regionales (`pt-BR` → `pt`) | `es` |
| `data-theme` | `light`, `dark` | `light` |
| `data-zoom-link` | URL absoluta `https:` con host `zoom.us` o subdominio | se ignora: modo lead simple |
| `data-webinar-topic` | texto ≤ 120 | se recorta a 120 |
| `data-webinar-date` | `YYYY-MM-DD HH:mm:ss` | se omite |
| `data-lead-source` | picklist del contrato | default del contrato |
| `data-bdm-owner` | `005` + 12 o 15 alfanuméricos | se omite |
| `data-starts` / `data-expires` | ISO 8601 con zona horaria explícita (`2026-10-06T18:00:00-05:00`) | ver RF-20 |
| `data-country` | ISO2 puesto por el servidor (D-11) | se ignora |

### Validación
- **RF-06** Cada campo valida contra el schema del formulario (`03-contrato-salesforce.md`), con
  mensajes en el idioma resuelto.
- **RF-07** País y prefijo solo aceptan valores de sus listas.
- **RF-08** La validación en vivo sigue el patrón: al salir del campo valida; mientras escribe,
  solo revalida si ya se tocó.
- **RF-09** Un campo trampa (honeypot) invisible para personas; si viene lleno, el envío se
  descarta en el cliente mostrando éxito, y **nunca** viaja en el payload.

### Envío
- **RF-10** El payload se construye desde datos validados, nunca serializando el DOM, y es
  idéntico al contrato.
- **RF-11** Un envío en curso bloquea cualquier otro del mismo formulario.
- **RF-12** Sin reintentos automáticos (D-07). Timeout de 15 s, error de red o respuesta que no
  cumple el schema = "resultado desconocido": mensaje que dice que puede haberse registrado y
  botón de reintento manual.
- **RF-13** `success: false` muestra los errores por campo que mande el servidor, y si no hay,
  el mensaje genérico. El texto del servidor se inserta siempre como texto.
- **RF-14** Las integraciones de analítica (GA4 `generate_lead`, GTM `dataLayer`, Meta `Lead`)
  corren después de mostrar el éxito, cada una aislada: si una lanza error, el éxito no cambia.

### Webinar y Zoom
- **RF-15** Con link de Zoom válido el formulario está en modo webinar (campos ocultos del
  contrato).
- **RF-16** El popup se abre dentro del gesto de submit, se le anula `opener`, navega al link solo
  tras `success: true` y se cierra si el envío falla. El thank-you tiene un CTA con el link como
  respaldo (D-12).

### Consentimiento y cumplimiento
- **RF-17** La casilla de aceptación arranca según D-05 y es obligatoria.
- **RF-18** Textos legales y avisos regulatorios por idioma según D-06 y D-17 (sesión s12).
- **RF-19** El paquete no hace peticiones a terceros (geo-IP u otros) sin consentimiento (D-11).

### Caducidad de campaña
- **RF-20** Antes de `data-starts` el formulario muestra "registro aún no abierto"; después de
  `data-expires` muestra "campaña finalizada" y no permite enviar. Un atributo de fecha inválido
  o sin zona horaria deja el formulario **cerrado** y emite `console.warn` (fallar cerrado).
- **RF-21** Si el formulario está abierto al cargar y la fecha de cierre pasa con la página
  abierta, el siguiente intento de envío se bloquea.
- **RF-22** La capa de servidor que rechaza leads fuera de fecha se define en s15 según D-14.

### Thank-you
- **RF-23** Tras éxito se muestra el thank-you según D-16, con variantes webinar y producto
  (sesión s11).
- **RF-24** El éxito se anuncia a lectores de pantalla y el foco se mueve al título del
  thank-you.

## 3. Requisitos no funcionales

- **RNF-01 Peso:** ≤ 20 KB brotli por formulario (JS + CSS), medido en CI (D-19).
- **RNF-02 Compatibilidad:** últimas 2 versiones de Chrome, Safari, Firefox, Edge; Safari iOS 15+.
  Target de build `es2019`.
- **RNF-03 Accesibilidad:** WCAG 2.2 AA en el formulario: etiquetas asociadas, errores con
  `aria-describedby` y `aria-invalid`, foco visible, contraste ≥ 4.5:1, operable solo con teclado.
- **RNF-04 Aislamiento:** todas las clases y variables CSS con prefijo `atfx-`; tokens en
  `.atfx-leadkit`, nunca en `:root`; ningún estilo global.
- **RNF-05 Layout:** el contenedor reserva altura antes de montar (CLS de montaje ≤ 0.05).
- **RNF-06 i18n:** es, en, pt completos con paridad de llaves verificada por test.
- **RNF-07 Sin PII en consola** ni en errores.
- **RNF-08 Calidad:** cobertura ≥ 80 % global, 100 % en el constructor del payload y en la
  validación de atributos.
- **RNF-09 Inmutabilidad y tamaños:** según `AGENTS.md`.

## 4. Criterios de aceptación

Formato dado / cuando / entonces. Cada sesión copia los suyos y los vuelve tests.

| ID | Requisito | Criterio |
|---|---|---|
| CA-01 | RF-02 | Dado un contenedor montado, cuando el script corre otra vez, entonces sigue habiendo un solo `<form>` dentro. |
| CA-02 | RF-03 | Dado un contenedor insertado 500 ms después de la carga, entonces queda montado sin llamar a nada más. |
| CA-03 | RF-04 | Dados dos formularios en una página, entonces no hay ids repetidos en el documento y cada `label[for]` apunta a un input de su propio formulario. |
| CA-04 | RF-05 | Dado `data-zoom-link="javascript:alert(1)"` (o `https://evil.example`, o `http://zoom.us`), entonces el formulario está en modo lead simple, no hay campos de webinar en el payload y nunca se asigna esa URL a nada. |
| CA-05 | RF-05 | Dado `data-lang="pt-BR"`, entonces la UI está en portugués y el payload lleva `PTG`/`pt`. |
| CA-06 | RF-05 | Dado `data-bdm-owner="006ABC"`, entonces el payload no contiene `OwnerId__c`. |
| CA-07 | RF-07 | Dado un país que no está en la lista (manipulando el DOM), entonces la validación falla y no hay envío. |
| CA-08 | RF-09 | Dado el honeypot lleno, entonces no hay `fetch` y se muestra el thank-you. |
| CA-09 | RF-10 | Para cada variante (es/en/pt × webinar/simple × con/sin owner × lead/interest) el payload es igual al golden. |
| CA-10 | RF-10 | Dado un `<input name="form_fields[x]">` agregado al form por un script externo, entonces no aparece en el payload. |
| CA-11 | RF-11 | Dados dos submits seguidos, entonces hay un solo `fetch`. |
| CA-12 | RF-12 | Dado un `fetch` que no responde en 15 s, entonces hay exactamente un `fetch`, se muestra "resultado desconocido" y el reintento manual hace un segundo `fetch` solo al pulsarlo. |
| CA-13 | RF-12 | Dada una respuesta HTML (502) o `0`, entonces se muestra "resultado desconocido", no "error de conexión", y no hay reintento automático. |
| CA-14 | RF-13 | Dado `success:false` con `message` que contiene `<img src=x onerror=...>`, entonces se muestra como texto literal. |
| CA-15 | RF-14 | Dado `window.gtag` que lanza error, entonces se muestra el thank-you y `dataLayer` y `fbq` igual se llaman. |
| CA-16 | RF-16 | Dado modo webinar y `success:false`, entonces el popup se cierra. Dado éxito, el popup navega al link y su `opener` es `null`. |
| CA-17 | RF-17 | Dada la casilla sin marcar, entonces no hay envío y el error se anuncia. |
| CA-18 | RF-19 | Durante toda la suite, ningún `fetch` sale a un host distinto de `admin-ajax` mockeado. |
| CA-19 | RF-20 | Dado `data-expires` en el pasado, entonces no hay `<form>` enviable y se muestra el mensaje de campaña finalizada en el idioma. |
| CA-20 | RF-20 | Dado `data-expires="2026-10-06 18:00"` (sin zona), entonces el formulario queda cerrado y hay un warn. |
| CA-21 | RF-21 | Dado un formulario abierto, cuando el reloj (fake timers) pasa la fecha de cierre y se envía, entonces no hay `fetch`. |
| CA-22 | RF-24 | Dado un éxito, entonces existe un elemento `role="status"` con el título y el foco está en el título. |
| CA-23 | RNF-01 | `npm run size` falla si algún bundle supera el presupuesto. |
| CA-24 | RNF-06 | Un test falla si un diccionario tiene llaves distintas a otro. |

## 5. Datos

Sin base de datos ni migraciones. Datos estáticos (s4): listas de países (ISO3 + nombre por idioma) y
prefijos, portadas de `atfx-forms/src/data/options.ts`. Los nombres de país hoy solo existen en
español: s4 agrega en/pt usando `Intl.DisplayNames` en build o a mano (decisión técnica de s4,
documentada en su handoff).

## 6. Dependencias externas y fallos

| Dependencia | Si falla |
|---|---|
| admin-ajax de WordPress (Elementor Pro form #593) | "resultado desconocido" o error del servidor; nunca reintento automático |
| Middleware → Salesforce | invisible para el cliente; `success:true` = encolado |
| gtag / dataLayer / fbq | se ignora aislado; no afecta al usuario |
| CDN / host del bundle (D-13) | el formulario no aparece; el contenedor muestra su altura reservada |

## 7. Seguridad

- `superficie_expuesta: sí` (frontera de confianza con atributos del editor, DOM del host y un
  endpoint público).
- Familias ofensivas que aplican, para `/pentest` en `/release` bajo `.pentest-scope.json` (solo
  harness local; fuera de scope atfxlatam.com, Salesforce y terceros):
  - `offensive-xss`: atributos `data-*`, mensajes del servidor, popup `about:blank` (CA-04, CA-14).
  - `offensive-open-redirect`: `data-zoom-link` (CA-04).
  - `offensive-parameter-pollution`: inyección de `form_fields[...]` desde el DOM (CA-10).
  - `offensive-business-logic`: caducidad con reloj manipulado o POST directo (CA-19..21 y la capa
    de servidor de s15); `OwnerId__c` arbitrario (escalado a servidor, D-20).
  - `offensive-race-condition`: doble submit (CA-11).
  - `offensive-supply-chain`: cadena de distribución del bundle (s14, D-13, D-18).
- Secretos nuevos: ninguno en el cliente. Si s15 elige token firmado, la clave vive solo en el
  servidor (WordPress), nunca en este repo.

## 8. Plan de pruebas

| Nivel | Herramienta | Cubre |
|---|---|---|
| Unidad | vitest + jsdom | atributos, schema, constructor del payload (golden), cliente de envío (fake timers, `fetch` mockeado), caducidad, i18n |
| Integración | vitest + jsdom | montaje completo: render, validación en vivo, submit, thank-you, popup, multi-instancia, montaje tardío |
| E2E | Playwright | bundle construido en una página host local que imita Elementor (CSS agresivo del host incluido), `admin-ajax.php` mockeado con `page.route`, teclado, peso |
| Fuera | — | Salesforce y WordPress reales (nunca desde tests); la verificación en producción la hace Karen con email de prueba en incógnito |
