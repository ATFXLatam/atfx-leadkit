# Reference Brief: atributos de montaje s03 (parseo, URL de Zoom, URL de cierre, fechas y zona)

Slug: s03-atributos | Nivel: quick | Fecha: 2026-10-01 | Estado: APROBADO
Versiones: typescript=5.9.3, vitest=5.0.3, jsdom=30.1.1
Verificador: research-verifier 2026-10-01 ESCALATE

## 1. Pregunta y decisiones abiertas

Sesion s03 de atfx-leadkit: `parseMountAttrs` (src/core/attrs.ts) es el unico punto de entrada de
los `data-*` que escribe el editor de la landing; `safeZoomLink` y `safeClosedUrl` (src/core/url.ts)
validan URLs; `parseIsoWithZone` (src/core/time.ts) valida fechas de apertura y cierre. Es una
frontera de confianza: lo que sale de aqui llega al popup de Zoom, a un CTA, a Salesforce y a la
logica de cierre de campana.

Reuso: `embed-form-submit-privacy` (D4 Zoom) y `forms-v2-campaign-expiry` (D1 formato de fecha) ya
fijaron el "que" y fueron aprobados como decisiones D-12, D-14 (pendiente) y D-25. Sus citas MDN y
de la base tz no dependen de versiones y se reusan. Sus `Versiones:` son viejas (zod 3.23.8,
typescript 5.5.4) y sus `[repo:]` apuntan al paquete viejo, asi que en esta corrida se reinvestigo
todo lo que depende del runtime real: que `URL` e `Intl` corren bajo vitest 5 + jsdom 30, que APIs
existen en Safari iOS 15 (RNF-02) y que acepta cada motor.

Decisiones que la spec y la revision deben cerrar:
1. URL de Zoom y de cierre: parser WHATWG (`new URL` en try/catch) + allowlist de host, frente a regex o lista negra de esquemas.
2. Credenciales y puerto en la URL: rechazar `user:pass@` (la spec s03 no lo pide; la sesion si).
3. Fechas ISO: que tan estricta es la regex (rangos, dias del mes, `24:00`, offset maximo) antes de `Date.parse`.
4. Zona IANA: como validar con `Intl` sin que el resultado cambie entre Node 22 (tests) y Safari iOS 15.
5. Normalizacion: atributo ausente, vacio o solo espacios = `null` (de eso depende el builder de s02).
6. Detalles: separador del subtag de idioma, `XX` en `data-country`, recorte de `webinarTopic`, rangos de `data-webinar-date`.

## 2. Estado actual

- La spec s03 fija `safeZoomLink`: https + host zoom.us o *.zoom.us, URL absoluta, devuelve `url.toString()` o null [repo:docs/specs/sessions/s03-atributos.md:22]
- `safeClosedUrl` acepta solo https y mismo host de la pagina o host en `allowedHosts` [repo:docs/specs/sessions/s03-atributos.md:29]
- `parseIsoWithZone` valida por regex estricta y luego parsea, solo con offset explicito Z o +-HH:MM [repo:docs/specs/sessions/s03-atributos.md:32]
- `parseMountAttrs` recibe el `dataset` como `Readonly<Record>` de string o undefined, mas `pageUrl` y `closedUrlAllowlist` [repo:docs/specs/sessions/s03-atributos.md:35]
- La forma del formulario sale de `data-atfx-leadkit` y un valor desconocido lanza `UnknownFormError` [repo:docs/specs/sessions/s03-atributos.md:42]
- Idioma: primer subtag en minusculas; fuera de es/en/pt cae a `es` [repo:docs/specs/sessions/s03-atributos.md:44]
- `webinarTz` debe ser zona IANA valida para `Intl.DateTimeFormat`, si no null [repo:docs/specs/sessions/s03-atributos.md:46]
- `bdmOwner` usa la regex 005 + 12 alfanumericos + 3 opcionales, si no null [repo:docs/specs/sessions/s03-atributos.md:47]
- Fecha presente que no parsea da `scheduleInvalid: true` y un `warn` [repo:docs/specs/sessions/s03-atributos.md:48]
- `country` se acepta con `^[A-Z]{2}$` [repo:docs/specs/sessions/s03-atributos.md:51]
- Ningun `warn` puede incluir completo un valor de mas de 60 caracteres [repo:docs/specs/sessions/s03-atributos.md:52]
- La lista de reglas de s03 no menciona `theme`, `webinarTopic` ni `leadSource`, que si estan en la tabla RF-05 [repo:docs/specs/01-requisitos.md:36]
- Los tests pedidos para Zoom no incluyen URLs con credenciales (`https://x@atfx.zoom.us/`) ni puerto [repo:docs/specs/sessions/s03-atributos.md:56]
- RF-05 declara `data-zoom-link` como URL absoluta https con host zoom.us o subdominio [repo:docs/specs/01-requisitos.md:35]
- RF-05 declara `data-closed-url` https con host igual al de la pagina o en allowlist explicita [repo:docs/specs/01-requisitos.md:42]
- RF-05 declara `data-country` como ISO2 puesto por el servidor (D-11) [repo:docs/specs/01-requisitos.md:43]
- RF-20: fecha invalida o sin offset deja el formulario cerrado con `console.warn` (fallar cerrado) [repo:docs/specs/01-requisitos.md:87]
- RNF-02 exige Safari iOS 15+ y target es2019 [repo:docs/specs/01-requisitos.md:107]
- RNF-08 exige 100 % de cobertura en la validacion de atributos [repo:docs/specs/01-requisitos.md:116]
- CA-04 cubre `javascript:alert(1)`, host ajeno y `http://zoom.us` [repo:docs/specs/01-requisitos.md:129]
- El contrato manda `OwnerId__c` solo si el atributo es valido, si no la llave se omite [repo:docs/specs/03-contrato-salesforce.md:55]
- El builder de s02 asume que s3 normaliza atributos vacios a null y solo compara contra null [repo:src/contract/payload.ts:69]
- El builder agrega `OwnerId__c` con solo comprobar `bdmOwner !== null` [repo:src/contract/payload.ts:64]
- El builder manda `zoomLink` a `Webinar_venue_zoom_link__c` sin revalidarlo [repo:src/contract/payload.ts:68]
- `MountAttrs` ya existe con `webinarTz`, `closedUrl` y `country` como string o null [repo:src/contract/types.ts:12]
- La arquitectura nombra a `core/attrs.ts` unico punto de entrada para datos no confiables de atributos [repo:docs/specs/04-arquitectura.md:13]
- D-04 (div con `data-atfx-leadkit` + atributos `data-*`, sin custom element) esta aprobada [KAREN:docs/specs/02-decisiones.md D-04 2026-10-01]
- D-12 (popup de Zoom solo a `https://*.zoom.us`, opener null) esta aprobada [KAREN:docs/specs/02-decisiones.md D-12 2026-10-01]
- D-25 (`data-webinar-tz` opcional, solo presentacion, `Webinar_date_time__c` no cambia) esta aprobada [KAREN:docs/specs/02-decisiones.md D-25 2026-10-01]
- D-11 (geo por `data-country` desde el servidor) sigue PENDIENTE [repo:docs/specs/02-decisiones.md:19]
- `tsconfig` compila con target ES2019 [repo:tsconfig.json:6]
- `tsconfig` carga lib ES2020 + DOM, sin `es2022.intl` [repo:tsconfig.json:9]
- Los tests corren en el entorno jsdom de vitest [repo:vitest.config.ts:5]
- El entorno jsdom de vitest 5.0.3 reemplaza el `URL` global por una subclase del `URL` de Node, no el de jsdom [repo:node_modules/vitest/dist/chunks/index.k8L_ZRzq.js:1381]
- Esa clase base se importa de `node:url` [repo:node_modules/vitest/dist/chunks/index.k8L_ZRzq.js:5]
- La DOM lib de typescript 5.9.3 declara `URL.canParse` aunque el target sea es2019 [repo:node_modules/typescript/lib/lib.dom.d.ts:32730]
- `Intl.supportedValuesOf` solo esta tipado en `lib.es2022.intl`, que el tsconfig no carga [repo:node_modules/typescript/lib/lib.es2022.intl.d.ts:144]
Contextos: bundle esbuild es2019 en landings WordPress/Elementor (Chrome, Safari, Firefox, Edge ultimas 2; Safari iOS 15+), vitest 5.0.3 con entorno jsdom 30.1.1 sobre Node v22.23.2 (URL e Intl de Node, no de jsdom), `tsc --noEmit` con lib ES2020 + DOM, Playwright E2E de s13 (futuro), CI de verificacion

## 3. Fuentes primarias

- WHATWG URL: el parser quita C0 y espacios al inicio y al final, y borra todo tab o salto de linea del interior antes de parsear [ref:https://github.com/whatwg/url/blob/8e14777cfa145b08a9fb735fe580ec0c366564c3/url.bs#L2311-L2317@8e14777]
- WHATWG URL: en esquemas especiales (https) la barra invertida cuenta como separador de ruta [ref:https://github.com/whatwg/url/blob/8e14777cfa145b08a9fb735fe580ec0c366564c3/url.bs#L2495@8e14777]
- WHATWG URL: el host se percent-decodifica y se pasa por el parser de dominio, que lo devuelve en minusculas ASCII [ref:https://github.com/whatwg/url/blob/8e14777cfa145b08a9fb735fe580ec0c366564c3/url.bs#L1124@8e14777]
- WHATWG URL: una URL "includes credentials" si su username o password no es vacio [doc:https://url.spec.whatwg.org/#include-credentials@living-standard-8e14777]
- ECMA-262: el formato Date Time String admite Z o +-HH:mm como offset [ref:https://github.com/tc39/ecma262/blob/2477796715947008b0eb7b170ed3d13ad3d78c9c/spec.html#L34844@2477796]
- ECMA-262: DD va de 01 a 31 (sin relacion con el mes) y HH de 00 a 24 [ref:https://github.com/tc39/ecma262/blob/2477796715947008b0eb7b170ed3d13ad3d78c9c/spec.html#L34780@2477796]
- ECMA-262: un string con elementos fuera de rango o no conformes no es una instancia valida del formato [doc:https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format@ES2027-draft-2477796]
- ECMA-262: si el string no cumple el formato, Date.parse puede caer a heuristicas propias de cada motor; si no lo reconoce devuelve NaN [ref:https://github.com/tc39/ecma262/blob/2477796715947008b0eb7b170ed3d13ad3d78c9c/spec.html#L35099@2477796]
- ECMA-262: sin offset, la forma fecha-hora se interpreta como hora local [ref:https://github.com/tc39/ecma262/blob/2477796715947008b0eb7b170ed3d13ad3d78c9c/spec.html#L35100@2477796]
- MDN: `timeZone` acepta nombres IANA y tambien identificadores de offset como "+01:00", y un valor invalido lanza RangeError [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat@2026-10-01]
- MDN BCD: offsets en `options.timeZone` llegan en Chrome 120, Safari 17.4 y Node 22.0.0, no en Safari iOS 15 [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/javascript/builtins/Intl/DateTimeFormat.json#L696-L724@852a2f6]
- MDN BCD: nombres IANA en `options.timeZone` existen desde Safari 10 [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/javascript/builtins/Intl/DateTimeFormat.json#L644-L678@852a2f6]
- MDN BCD: `Intl.supportedValuesOf` llega en Safari 15.4, asi que falta en iOS 15.0-15.3 [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/javascript/builtins/Intl.json#L102-L133@852a2f6]
- MDN BCD: `URL.canParse` llega en Safari 17, fuera de RNF-02 [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/api/URL.json#L137-L174@852a2f6]
- MDN BCD: el constructor `URL` conforme existe desde Safari 14.1 [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/api/URL.json#L80-L116@852a2f6]
- MDN BCD: Date.parse con ISO 8601 existe desde Safari 5.1 [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/javascript/builtins/Date.json#L1347-L1360@852a2f6]
- MDN dataset: `data-x-y` se lee como `dataset.xY`; un atributo sin valor da cadena vacia y uno inexistente da undefined [doc:https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset@2026-10-01]
- RFC 5646 2.1: los subtags se separan con guion y las etiquetas son insensibles a mayusculas [doc:https://www.rfc-editor.org/rfc/rfc5646.html#section-2.1@RFC5646]
- Cloudflare: `CF-IPCountry` usa ISO 3166-1 alfa-2 y ademas los codigos especiales XX (sin dato) y T1 (Tor) [doc:https://developers.cloudflare.com/fundamentals/reference/http-headers/@2026-10-01]
- OWASP: preferir allowlist sobre denylist ("deny-lists are bypass-prone") y comparar el host parseado contra la allowlist [doc:https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html@2026-10-01]
- Reusado de forms-v2-campaign-expiry: NaN en una comparacion da false, asi que una fecha invalida sin chequeo deja el form abierto [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse@2026-10-01]

## 4. Implementaciones de referencia

- Kibana (Elastic, monorepo de gran escala y activo): parsea con `new URL` y exige `protocol === 'https:'` y hostname igual a zoom.us o terminado en `.zoom.us` [ref:https://github.com/elastic/kibana/blob/b161ea0dca5d827447d4bc16c4ed6631fa47f09f/src/platform/packages/shared/kbn-connector-specs/src/specs/zoom/zoom.ts#L365-L367@b161ea0]
- Luxon (equipo de Moment, libreria de fechas de referencia): valida una zona con `new Intl.DateTimeFormat` en try/catch y devuelve `resolvedOptions().timeZone` normalizado [ref:https://github.com/moment/luxon/blob/f427515a38f6a671f8de663e6bcc040ed81f114e/src/zones/IANAZone.js#L119-L128@f427515]
- sfdx-core (Salesforce, nucleo de la CLI oficial): un Id valido es de 15 o 18 alfanumericos, sin checksum del sufijo [ref:https://github.com/forcedotcom/sfdx-core/blob/55337ad27e4edbce8efc8620d01b366b3765ad65/src/util/sfdc.ts#L54-L55@55337ad]
- salesforcedx-vscode (Salesforce): identifica Ids de usuario por el prefijo `005` [ref:https://github.com/forcedotcom/salesforcedx-vscode/blob/8de8cbee7219ec91dd658816ef701a4bc3145972/packages/salesforcedx-vscode-apex-log/src/logs/logAutoCollect.ts#L69@8de8cbe]

## 5. Opciones

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| U-A `new URL(raw)` en try/catch + `protocol === "https:"` + username y password vacios + hostname exacto o sufijo `.zoom.us` + devolver `href` | Una sola interpretacion (la del parser que tambien usa el navegador al navegar); cubre mayusculas, tabs, barra invertida y percent-encoding sin regex | Acepta cualquier subdominio de zoom.us | baja | Si (Zoom) |
| U-B regex sobre el string crudo | Sin parser | El navegador parsea distinto que la regex (tabs, barra invertida, `%2E`, mayusculas) | media | No |
| U-C lista negra de esquemas (estilo sanitize-url) | Tolera hosts desconocidos | Bypassable por diseno; no limita el host | baja | No |
| C-A `safeClosedUrl`: `new URL(raw)` sin base (relativa falla) + https + sin credenciales + hostname exacto igual al de `new URL(pageUrl)` o en allowlist exacta en minusculas | Mismo patron que U-A; sin comodines | El editor no puede usar subdominios hermanos sin tocar la allowlist | baja | Si |
| T-A regex con rangos (mes 01-12, dia 01-31, hora 00-23, minuto/segundo 00-59, offset hasta 23:59) + comprobar dias del mes + Date.parse + guard de NaN | El resultado no depende de las heuristicas de cada motor | Unas lineas mas | baja | Si |
| T-B regex de forma (solo digitos) + Date.parse | Minimo | Un dia imposible (30 de febrero) depende del motor | baja | No |
| Z-A try/catch de `Intl.DateTimeFormat` + rechazar antes todo valor que empiece por `+`, `-` o digito + guardar `resolvedOptions().timeZone` | Mismo resultado en Node 22 y Safari iOS 15; patron de Luxon | Rechaza offsets que un motor nuevo aceptaria (son presentacion, D-25 pide IANA) | baja | Si |
| Z-B solo try/catch de Intl | Patron de Luxon tal cual | `+01:00` valido en tests (Node 22) e invalido en iOS 15: un test verde no prueba el navegador | baja | No |
| Z-C `Intl.supportedValuesOf("timeZone").includes(v)` | Lista explicita | Falta en iOS 15.0-15.3, no tipado con lib ES2020, y la lista omite alias validos | media | No |
| N-A helper unico: undefined, vacio o solo espacios = null; si no, valor recortado | Una regla para todos los campos; es lo que asume el builder | Un valor con espacios intencionales se recorta | baja | Si |

## 6. Evidencia en contra

- Contra U-A: el sufijo `.zoom.us` acepta cualquier subdominio, incluido uno que Zoom no use; se acepta porque D-12 lo aprobo asi y el dominio es de Zoom [KAREN:docs/specs/02-decisiones.md D-12 2026-10-01]
- Contra U-A: Kibana no rechaza credenciales; aqui si hace falta porque `https://x@atfx.zoom.us/` pasa el chequeo de host y la URL viaja a Salesforce y al popup [doc:https://url.spec.whatwg.org/#include-credentials@living-standard-8e14777]
- Contra Z-A: rechazar valores que empiezan por `+`, `-` o digito descarta offsets que Chrome 120+ y Node 22 aceptan; se acepta porque Safari iOS 15 los rechaza y D-25 pide una zona IANA [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/javascript/builtins/Intl/DateTimeFormat.json#L696-L724@852a2f6]
- Contra T-A: con la regex completa Date.parse es casi redundante (se podria calcular con Date.UTC); se mantiene porque la spec lo pide y el guard de NaN sigue siendo el ultimo cierre [repo:docs/specs/sessions/s03-atributos.md:32]
- Contra N-A: recortar espacios cambia el valor que el editor escribio; se acepta porque un espacio inicial en una URL o fecha ya lo quita el parser o la invalida la regex [ref:https://github.com/whatwg/url/blob/8e14777cfa145b08a9fb735fe580ec0c366564c3/url.bs#L2311-L2317@8e14777]

## 7. Ejemplares y anti-ejemplos

- Bien hecho: `const { protocol, hostname } = new URL(x)` y luego `protocol !== 'https:' || (hostname !== 'zoom.us' && !hostname.endsWith('.zoom.us'))` [ref:https://github.com/elastic/kibana/blob/b161ea0dca5d827447d4bc16c4ed6631fa47f09f/src/platform/packages/shared/kbn-connector-specs/src/specs/zoom/zoom.ts#L367@b161ea0]
- Bien hecho: `new Intl.DateTimeFormat("en-US", { timeZone: zone }).resolvedOptions().timeZone` en try/catch, devolviendo null si lanza [ref:https://github.com/moment/luxon/blob/f427515a38f6a671f8de663e6bcc040ed81f114e/src/zones/IANAZone.js#L123-L127@f427515]
- Anti-ejemplo: `z.string().url()` de zod 3.25.76 solo comprueba que `new URL` no lance, asi que acepta `javascript:alert(1)` [ref:https://github.com/colinhacks/zod/blob/7baee4e17f86f4017e09e12b0acdee36a5b1c087/packages/zod/src/v3/types.ts#L876-L879@7baee4e]
- Anti-ejemplo: lista negra por regex de `javascript|data|vbscript`; no limita el host [ref:https://github.com/braintree/sanitize-url/blob/475e339b95d37c68ae79d4ae67903c0dabd18aa1/src/constants.ts#L1@475e339]
- Anti-ejemplo: `hostname.includes("zoom.us")` o `startsWith("https://zoom.us")` sobre el string crudo; OWASP pide comparar el host parseado contra la allowlist [doc:https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html@2026-10-01]

## 8. Trampas

- `URL.canParse` esta tipado en la DOM lib y compila con target es2019, pero no existe en Safari menor que 17: usar try/catch [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/api/URL.json#L137-L174@852a2f6]
- Los tests de s03 ejercitan el `URL` de Node, no el de jsdom ni el de WebKit; un test verde no prueba Safari, solo el E2E de s13 en WebKit lo haria [repo:node_modules/vitest/dist/chunks/index.k8L_ZRzq.js:1381]
- `Intl.DateTimeFormat` con `timeZone: "+01:00"` no lanza en Node 22 y si en Safari iOS 15: sin el rechazo previo de offsets, el mismo atributo da resultados distintos en test y en produccion [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/javascript/builtins/Intl/DateTimeFormat.json#L696-L724@852a2f6]
- Comparar `zoom.us` sin normalizar falla con mayusculas: el parser ya baja el host a minusculas, asi que la comparacion va contra `hostname`, nunca contra el string crudo [ref:https://github.com/whatwg/url/blob/8e14777cfa145b08a9fb735fe580ec0c366564c3/url.bs#L953@8e14777]
- `java\tscript:` o `\njavascript:` se convierten en `javascript:` al parsear; por eso el esquema se mira despues de `new URL`, nunca antes [ref:https://github.com/whatwg/url/blob/8e14777cfa145b08a9fb735fe580ec0c366564c3/url.bs#L2311-L2317@8e14777]
- La regex de DD admite 31 en cualquier mes y HH admite 24; si la regex de s03 no acota hora 00-23 ni dias por mes, el resultado de `2026-02-30` queda en manos del motor [ref:https://github.com/tc39/ecma262/blob/2477796715947008b0eb7b170ed3d13ad3d78c9c/spec.html#L34780@2477796]
- `data-country="XX"` pasa `^[A-Z]{2}$` y no es un pais; T1 ya lo rechaza la regex por el digito [doc:https://developers.cloudflare.com/fundamentals/reference/http-headers/@2026-10-01]
- `dataset` convierte `data-zoom-link` en `zoomLink`; leer `dataset["zoom-link"]` devuelve undefined en silencio y el atributo se pierde [doc:https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset@2026-10-01]
- Un atributo presente sin valor llega como cadena vacia, no undefined: sin normalizar a null, el builder mandaria `OwnerId__c` o `Webinar_topic__c` vacios [repo:src/contract/payload.ts:69]
- `pt_BR` (formato de locale de WordPress) no se parte por guion; si solo se separa por `-`, cae a `es` [doc:https://www.rfc-editor.org/rfc/rfc5646.html#section-2.1@RFC5646]
- `data-webinar-date` no tiene offset; D-25 solo agrega la zona para mostrar, asi que s03 no debe convertirlo en instante ni pasarlo a Date.parse [repo:docs/specs/02-decisiones.md:33]
- Contexto navegador: la recomendacion usa solo `URL` (Safari 14.1+), `Intl.DateTimeFormat` con IANA (Safari 10+) y Date.parse ISO (Safari 5.1+), todo dentro de RNF-02 [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/api/URL.json#L80-L116@852a2f6]
- Contexto `tsc`: con lib ES2020 no hay tipo para `Intl.supportedValuesOf`, y para `URL.canParse` si lo hay aunque no exista en el navegador [repo:tsconfig.json:9]

## 9. Incertidumbre

- ASSUMPTION: V8 (Node 22) devuelve un numero para `Date.parse("2026-02-30T00:00:00Z")` y algun otro motor devuelve NaN; no se ejecuto en esta corrida (el researcher no corre codigo). prueba: un test de vitest con esa entrada y la misma linea en Safari (consola o Playwright WebKit); con T-A la regex la rechaza antes y la duda deja de importar
- ASSUMPTION: el `URL` de Node 22 (Ada) y el de WebKit en iOS 15 dan el mismo hostname para los casos de la spec (mayusculas, punto final, `%2E`, barra invertida). prueba: correr la tabla de casos de `safeZoomLink` en Playwright WebKit en s13
- ASSUMPTION: `https://zoom.us./` conserva el punto final en `hostname` y por eso falla igualdad y sufijo (rechazo, que es lo deseado). prueba: un caso en la tabla de tests de `safeZoomLink` que espere null
- [NEEDS CLARIFICATION: la sesion pide "atributos data-atfx-leadkit-*", pero RF-05 y D-04 usan nombres cortos (`data-lang`, `data-zoom-link`) junto a `data-atfx-leadkit="lead"`. Se mantienen los de RF-05?]
- [NEEDS CLARIFICATION: `data-country="XX"` (Cloudflare sin dato) se trata como null? D-11 sigue pendiente]
- [NEEDS CLARIFICATION: `pt_BR` con guion bajo debe resolverse a `pt` o caer a `es`?]
- [NEEDS CLARIFICATION: `data-webinar-date` con forma correcta pero valores imposibles (mes 13, hora 99) se omite o pasa tal cual a `Webinar_date_time__c`? La regex de s03 solo mira digitos]
- [NEEDS CLARIFICATION: `safeZoomLink` y `safeClosedUrl` rechazan puerto explicito (`https://atfx.zoom.us:8443/`)? Ni la spec ni D-12 lo dicen]

## 10. Checklist de estandar

- [ ] `safeZoomLink` y `safeClosedUrl` usan `new URL` en try/catch, nunca `URL.canParse` ni regex sobre el string crudo
- [ ] Ambas rechazan URLs con username o password no vacios (test con `https://x@atfx.zoom.us/` y `https://u:p@atfx.zoom.us/`)
- [ ] `safeZoomLink` acepta solo `protocol === "https:"` y hostname `zoom.us` o terminado en `.zoom.us`; tests con `ZOOM.US`, `zoom.us.`, `java` + tab + `script:`, barra invertida tras `https:` y `https://zoom.us%2Eevil.com`
- [ ] `safeClosedUrl` compara hostname exacto contra el de `pageUrl` o la allowlist, y rechaza relativas sin usar `pageUrl` como base
- [ ] `parseIsoWithZone` acota rangos (mes, dia por mes, hora 00-23, offset) en la regex o justo despues, y devuelve null ante NaN; test con `2026-02-30T00:00:00Z` y `2026-10-06T24:00:00Z`
- [ ] `webinarTz` rechaza offsets (`+01:00`, `-05`) antes de `Intl` y guarda el nombre canonico de `resolvedOptions().timeZone`
- [ ] Un unico helper convierte undefined, vacio y solo espacios en null, y todos los campos opcionales pasan por el
- [ ] Ningun warn incluye un valor de mas de 60 caracteres completo (test con un valor de 61)
- [ ] Cobertura 100 % de attrs.ts, url.ts y time.ts (RNF-08)

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | URL Standard (url.bs) | WHATWG | commit 8e14777 | 2026-10-01 | high |
| 2 | ECMAScript Language Specification, Date Time String Format y Date.parse | TC39 / Ecma | draft ES2027, commit 2477796 | 2026-10-01 | high |
| 3 | Intl.DateTimeFormat() constructor | MDN | 2026-10-01 | 2026-10-01 | high |
| 4 | browser-compat-data (URL, Intl, DateTimeFormat, Date) | MDN | commit 852a2f6 | 2026-10-01 | high |
| 5 | HTMLElement.dataset | MDN | 2026-10-01 | 2026-10-01 | high |
| 6 | RFC 5646 Tags for Identifying Languages | IETF | RFC 5646 | 2026-10-01 | high |
| 7 | Cloudflare HTTP request headers | Cloudflare | 2026-10-01 | 2026-10-01 | high |
| 8 | SSRF Prevention Cheat Sheet | OWASP | 2026-10-01 | 2026-10-01 | medium |
| 9 | Kibana Zoom connector spec | Elastic | commit b161ea0 | 2026-10-01 | medium |
| 10 | Luxon IANAZone | Moment / Luxon | commit f427515 | 2026-10-01 | high |
| 11 | sfdx-core util/sfdc.ts | Salesforce | commit 55337ad | 2026-10-01 | high |
| 12 | salesforcedx-vscode logAutoCollect.ts | Salesforce | commit 8de8cbe | 2026-10-01 | medium |
| 13 | zod v3 types.ts | Colin McDonnell | v3.25.76 (7baee4e) | 2026-10-01 | high |
| 14 | sanitize-url constants.ts | Braintree | commit 475e339 | 2026-10-01 | medium |
| 15 | vitest jsdom environment (instalado) | Vitest | 5.0.3 | 2026-10-01 | high |
| 16 | Date.parse (reusado de forms-v2-campaign-expiry) | MDN | 2026-10-01 | 2026-10-01 | high |
