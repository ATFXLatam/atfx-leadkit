# Reference Brief: validacion, envio sin duplicados, consentimiento y popup del form de leads embebible

Slug: embed-form-submit-privacy | Nivel: deep | Fecha: 2026-10-01 | Estado: ESCALADO
Versiones: zod=3.23.8, gsap=3.15.0, esbuild=0.23.0, typescript=5.5.4
Verificador: research-verifier 2026-10-01 ESCALATE

## 1. Pregunta y decisiones abiertas

Recreacion del form de leads embebible (widget JS montado en landings WordPress/Elementor de ATFX
LATAM, trafico incl. Brasil y Mexico) que envia FormData + X-Requested-With a admin-ajax de
Elementor Pro, de ahi a un middleware asincrono y a Salesforce. Insumos: la pregunta del lead, el
codigo del repo, el fork hermano atfx-forms-newAug26 (privado, commit 1db126a) y el informe
~/Desktop/security-audit-atfx-forms-2026-10-01.md (CN-002, CN-003, CN-006, CN-007, CN-016, Q-01, Q-02).
No hay discovery. No existia brief previo que cubra esto (docs/research/INDEX.md no existia).

Bloque D1 - Validacion de cliente. Zod v3 (instalado) vs Zod v4 / zod/mini vs Valibot vs Constraint
Validation API + validador propio. Alcance: mensajes es/en/pt, limites de longitud, enums cerrados
para pais y prefijo, validacion de la RESPUESTA del servidor y de los atributos data-* del host.

Bloque D2 - Envio confiable sin duplicados. Reintentar o no un POST no idempotente; claves de
idempotencia (draft IETF, Stripe) y que hacer si el backend no las soporta; timeout como
"resultado desconocido"; doble submit; aislar los hooks de analitica (GA4, GTM, Meta Pixel).

Bloque D3 - Consentimiento y privacidad. Checkbox premarcado vs accion afirmativa (GDPR, LGPD,
LFPDPPP); geo-IP a terceros antes del consentimiento vs pais de primera parte (Cloudflare); que
datos de consentimiento registrar. La eleccion de base legal es de Karen/Legal, no tecnica.

Bloque D4 - Ventana de Zoom. window.open en el gesto + opener=null + allowlist de host vs enlace
solo en el thank-you.

## 2. Estado actual

Contextos: navegador en landings de www.atfxlatam.com (widget HTML de Elementor, incluidos popups de Elementor), preview.html con el dev server de esbuild, runner `node --test` sobre test/ (Node 22.18 o mayor, sin script npm), CI release.yml (Node 20, typecheck + build, sin tests), sesion de WordPress admin abierta (silencia la accion SF), backend admin-ajax + middleware + Salesforce (no es codigo de este repo)

- D1: la validacion usa Zod importado de "zod" con un schema por idioma via `createLeadSchema(t)` [repo:src/schemas/lead.ts:1]
- D1: el manifiesto pide zod ^3.23.8 [repo:package.json:15]
- D1: el lockfile resuelve zod 3.25.76, version que ya trae los subpaths zod/v4 y zod/v4/mini [repo:package-lock.json:489]
- D1: nombre y apellido solo tienen minimo (2), sin maximo de longitud [repo:src/schemas/lead.ts:13]
- D1: el email usa `z.string().trim().email()` sin limite de longitud [repo:src/schemas/lead.ts:15]
- D1: el telefono acepta `+` y rechaza espacios con la regex `^[0-9()#&+*\-=.]{6,}$` [repo:src/schemas/lead.ts:17]
- D1: el pais solo exige `min(2)`, no un enum cerrado sobre la lista de opciones [repo:src/schemas/lead.ts:18]
- D1: el prefijo solo exige `min(1)` [repo:src/schemas/lead.ts:16]
- D1: el `pattern` HTML del telefono es `[0-9()#&+*-=.]+`, donde `*-=` es un rango y no coincide con la regex de Zod [repo:src/forms/lead.ts:20]
- D1: el form desactiva la validacion nativa con `novalidate` y valida todo con Zod [repo:src/core/form-engine.ts:10]
- D1: la respuesta del servidor se castea con `as ElementorResponse` sin validar su forma [repo:src/core/submit-elementor.ts:33]
- D1: `data-lead-source` ya se valida contra el picklist y cae a un default fuera de el [repo:src/core/lead-meta.ts:21]
- D1: `data-bdm-owner` ya se valida con un patron de User Id de Salesforce [repo:src/index.ts:55]
- D1: `data-zoom-link` se lee del DOM y entra sin validar a un hidden de SF y al Comment [repo:src/index.ts:58]
- D1: `data-lang` solo reconoce "en" y "pt" exactos; "pt-BR" cae a "es" [repo:src/i18n/index.ts:168]
- D2: el envio reintenta hasta 2 veces (3 POST en total) ante cualquier excepcion [repo:src/core/submit-elementor.ts:5]
- D2: `fetch` y `res.json()` comparten el mismo try, asi que una respuesta no-JSON tambien dispara reintento [repo:src/core/submit-elementor.ts:33]
- D2: el reintento espera 400 ms y 800 ms entre intentos [repo:src/core/submit-elementor.ts:37]
- D2: el POST lleva `X-Requested-With: XMLHttpRequest`, requisito del handler de Elementor para disparar la accion SF [repo:CLAUDE.md:144]
- D2: `success:true` de admin-ajax significa encolado, no creado en Salesforce [repo:CLAUDE.md:105]
- D2: los hooks de analitica se invocan dentro de `map` antes de `Promise.allSettled`, y el resultado se espera antes del thank-you [repo:src/core/form-engine.ts:127]
- D2: cualquier excepcion posterior al envio cae en el catch que muestra "error de conexion" y cierra el popup [repo:src/core/form-engine.ts:136]
- D2: el hook GA4 manda `generate_lead` con `currency` pero sin `value` [repo:src/integrations/index.ts:16]
- D2: hay tres hooks registrados: GA4, GTM y Meta Pixel [repo:src/forms/lead.ts:53]
- D2: no hay bloqueo de doble submit propio en el motor; la unica defensa documentada es no pegar el form en el widget Form de Elementor [repo:CLAUDE.md:46]
- D3: el checkbox de aceptacion nace marcado (`defaultChecked: true`) [repo:src/forms/lead.ts:23]
- D3: el atomo marca el checkbox cuando recibe `defaultChecked` [repo:src/ui/atoms/acceptance.ts:17]
- D3: marcado, el payload lleva `on` en `field_8f8f3d5` [repo:src/core/dom.ts:43]
- D3: el texto del checkbox dice "Al enviar este formulario, acepto que ATFX use mi informacion de contacto" [repo:src/i18n/index.ts:49]
- D3: Elementor/WP exige el checkbox: vacio rechaza antes de SF [repo:CLAUDE.md:124]
- D3: al montar el form se llama a ipwho.is y, en fallback, a get.geojs.io, para todo visitante [repo:src/core/geo.ts:12]
- D3: la llamada geo se dispara en el boot, sin condicion de consentimiento [repo:src/index.ts:79]
- D4: el popup se abre como `about:blank` dentro del handler de submit, antes del primer await [repo:src/core/form-engine.ts:104]
- D4: tras exito se navega el popup a `zoomLink` sin anular `opener` [repo:src/core/form-engine.ts:125]
- D4: el thank-you muestra un CTA de respaldo con `target=_blank` y `rel=noopener` [repo:src/ui/organisms/thank-you.ts:34]
- Restriccion: los campos y schemas del form no se modifican; solo el texto puede cambiar [KAREN:memory/feedback_atfx_forms_campos_fijos.md]
- Restriccion: instalar, quitar o subir dependencias esta bloqueado sin aprobacion [KAREN:~/.claude/CLAUDE.md]
- Restriccion: antes de escribir codigo, usar una dependencia ya instalada si resuelve [KAREN:spec-driven-standards/config/rules/common/coding-style.md]
- Restriccion: no confiar en datos externos, incluidas respuestas de API, y no tragar errores en silencio [KAREN:spec-driven-standards/config/rules/common/coding-style.md]
- Restriccion: validar toda entrada y que los mensajes de error no filtren datos sensibles [KAREN:spec-driven-standards/config/rules/common/security.md]

## 3. Fuentes primarias

- D1: Zod 4 se publico primero en el subpath "zod/v4" junto a zod@3.x y desde julio de 2025 es la raiz de zod@4.0.0 [doc:https://zod.dev/v4/versioning@4]
- D1: tamano del core: Zod 3 12.47 kb, Zod 4 5.36 kb, Zod 4 mini 1.88 kb (gzip, segun la propia doc) [doc:https://zod.dev/v4@4]
- D1: Zod 4 reemplaza `message` por el parametro unificado `error` y agrega una API `locales` via `z.config()` [doc:https://zod.dev/v4@4]
- D1: Zod Mini es la variante funcional tree-shakeable; no carga el locale ingles y sin mensaje propio el issue dice "Invalid input" [doc:https://zod.dev/packages/mini@4]
- D1: la doc de Zod Mini dice que 5-10 kb solo importa en front-ends para usuarios con redes moviles lentas [doc:https://zod.dev/packages/mini@4]
- D1: Valibot afirma 1.37 kB para un login form frente a 17.7 kB de Zod y unos 6.88 kB de Zod Mini con esbuild (benchmark del propio Valibot) [doc:https://valibot.dev/guides/comparison/@1.5.0]
- D1: Valibot traduce mensajes con el paquete aparte @valibot/i18n y `setGlobalConfig({ lang })` [doc:https://valibot.dev/guides/internationalization/@1.5.0]
- D1: con `novalidate` no hay validacion interactiva; `setCustomValidity` y `ValidityState` permiten mensajes propios [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Constraint_validation@2026-10-01]
- D1: la validacion de cliente es facil de saltar y nunca sustituye la del servidor [doc:https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation@2026-10-01]
- D1: OWASP pide allowlist, longitudes minima y maxima, enums para conjuntos fijos (dropdowns) y para email local-part de 63 o menos y total de 254 o menos [doc:https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html@2026-10-01]
- D2: RFC 9110 9.2.2: un cliente SHOULD NOT reintentar automaticamente un metodo no idempotente salvo que sepa que es idempotente o pueda detectar que el original nunca se aplico [doc:https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2@RFC9110]
- D2: fetch rechaza con TypeError ante error de red y con AbortError al abortar, y NO rechaza ante 404 o 504 [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch@2026-10-01]
- D2: el draft Idempotency-Key recomienda un UUID, responder con el resultado previo al reintento, 422 si cambia el payload y 409 si el original sigue en curso [doc:https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.html@draft-07]
- D2: el draft Idempotency-Key esta en draft-07 (2025-10-15) y figura como Internet-Draft expirado, no como RFC [doc:https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/@draft-07]
- D2: Stripe guarda status y cuerpo del primer request por clave, sugiere UUID v4, compara parametros y pide no usar emails ni PII como clave [doc:https://docs.stripe.com/api/idempotent_requests@2026-10-01]
- D2: `Promise.allSettled` recibe un iterable de promesas; la doc no cubre excepciones sincronas al construirlo [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled@2026-10-01]
- D2: GA4 `generate_lead` define `currency` y `value`, y `currency` es necesaria si se manda `value` [doc:https://developers.google.com/analytics/devguides/collection/ga4/reference/events@2026-10-01]
- D2: GTM pide inicializar `window.dataLayer = window.dataLayer || []` y empujar con `push`, nunca reasignar [doc:https://developers.google.com/tag-platform/tag-manager/datalayer@2026-10-01]
- D2: Meta Pixel define el evento estandar Lead y un `eventID` para deduplicar con la Conversions API [doc:https://developers.facebook.com/docs/meta-pixel/reference@2026-10-01]
- D3: GDPR considerando 32: "Silence, pre-ticked boxes or inactivity should not therefore constitute consent" [doc:https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679@2016-679]
- D3: GDPR art. 4(11) exige indicacion inequivoca por declaracion o accion afirmativa clara; art. 7(1) pone la prueba en el responsable [doc:https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679@2016-679]
- D3: GDPR art. 3(2) aplica a responsables fuera de la UE solo si ofrecen bienes o servicios a personas en la Union o monitorean su conducta alli [doc:https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679@2016-679]
- D3: EDPB 05/2020 parr. 79: las casillas premarcadas son invalidas bajo el GDPR [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]
- D3: EDPB 05/2020 parr. 81: el consentimiento no puede darse con el mismo acto que aceptar terminos y condiciones [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]
- D3: EDPB 05/2020 parr. 90: el consentimiento debe obtenerse antes de iniciar el tratamiento que lo requiere [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]
- D3: EDPB 05/2020 parr. 108: registrar como y cuando se obtuvo y la informacion mostrada; no basta referir la configuracion del sitio [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]
- D3: ANPD (guia de cookies, v1.0 oct/2022): bajo la LGPD el consentimiento es libre, informado e inequivoco y no se infiere de forma tacita ni por omision [doc:https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@download/file@1.0]
- D3: ANPD: no se recomiendan opciones de autorizacion preseleccionadas y el controlador carga con la prueba del consentimiento [doc:https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@download/file@1.0]
- D3: ANPD: el interes legitimo (LGPD art. 7 IX) es una base alternativa al consentimiento para datos no sensibles, con evaluacion previa [doc:https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@download/file@1.0]
- D3: LFPDPPP 2025 art. 7: por regla general vale el consentimiento tacito (aviso puesto a disposicion sin oposicion), salvo que una norma exija expreso [doc:https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf@DOF-2025-11-14]
- D3: LFPDPPP 2025 art. 7: los datos financieros o patrimoniales requieren consentimiento expreso [doc:https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf@DOF-2025-11-14]
- D3: LFPDPPP 2025 art. 2 XX: transferencia es toda comunicacion de datos a persona distinta del titular, responsable o encargado [doc:https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf@DOF-2025-11-14]
- D3: Cloudflare IP geolocation esta en todos los planes y entrega el pais en el header `CF-IPCountry` hacia el origen [doc:https://developers.cloudflare.com/network/ip-geolocation/@2026-08-27]
- D3: el Managed Transform "Add visitor location headers" agrega cf-ipcountry, cf-ipcity y otros headers al request hacia el origen [doc:https://developers.cloudflare.com/rules/transform/managed-transforms/reference/@2026-10-01]
- D3: HubSpot (forms legacy) no permite preseleccionar los checkboxes de consentimiento y ofrece tres modos: comunicacion, procesamiento explicito o interes legitimo [doc:https://knowledge.hubspot.com/forms/add-notice-and-consent-information-to-your-legacy-hubspot-form@2026-10-01]
- D3: la API de envio de HubSpot registra `consentToProcess` y el `text` exacto mostrado al visitante, mas `pageUri` [doc:https://developers.hubspot.com/docs/api-reference/legacy/marketing/forms/v3-legacy/submit-data-unauthenticated@v3-legacy]
- D4: los popups deben abrirse en respuesta directa a un gesto del usuario [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/open@2026-10-01]
- D4: con la feature `noopener`, `window.open` devuelve null y la ventana no accede al opener [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/open@2026-10-01]
- D4: los enlaces con target _blank no reciben opener salvo `rel=opener`, y el opener expuesto permite navegar la pagina original (phishing) [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/opener@2026-10-01]
- D4: OWASP recomienda `noopener,noreferrer` en window.open y `newWindow.opener = null` contra tabnabbing [doc:https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html@2026-10-01]
- D4: OWASP pide allowlist de URLs de confianza (hosts o regex) para redirecciones con entrada externa [doc:https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html@2026-10-01]

## 4. Implementaciones de referencia

- ky (sindresorhus, 17k estrellas, push 2026-09-16): el fetch wrapper excluye POST de los metodos que reintenta por defecto [ref:https://github.com/sindresorhus/ky/blob/0d59458a0a58e1c3d7c6db0ab17ed5c7cd671e47/source/utils/normalize.ts#L16@0d59458]
- ky documenta `retryOnTimeout: false` por defecto: un timeout antes de la respuesta no se reintenta [ref:https://github.com/sindresorhus/ky/blob/0d59458a0a58e1c3d7c6db0ab17ed5c7cd671e47/readme.md#L258-L297@0d59458]
- stripe-node (SDK oficial de Stripe): pone Idempotency-Key a todo POST v1 porque un error de conexion puede aparecer despues de que el API proceso el request [ref:https://github.com/stripe/stripe-node/blob/fe645f63d645011aca38dff9e245c1cf7b9ae60e/src/RequestSender.ts#L397-L425@fe645f6]
- Formbricks (plataforma OSS de formularios, 13k estrellas, activa): un lock por encuesta impide dos envios en vuelo a la vez [ref:https://github.com/formbricks/formbricks/blob/f1fc4adbc38bf49615fc13db30698c056a381a60/packages/surveys/src/lib/response-queue.ts#L292-L295@f1fc4ad]
- Formbricks no reintenta 4xx terminales y solo reintenta 401, 404, 408, 425 y 429 [ref:https://github.com/formbricks/formbricks/blob/f1fc4adbc38bf49615fc13db30698c056a381a60/packages/surveys/src/lib/response-queue.ts#L208-L220@f1fc4ad]
- Formbricks reintenta con seguridad porque, tras el primer create, los reenvios van a `updateResponse` con un `responseId` del servidor [ref:https://github.com/formbricks/formbricks/blob/f1fc4adbc38bf49615fc13db30698c056a381a60/packages/surveys/src/lib/response-queue.ts#L642-L668@f1fc4ad]
- zod 3.25.76 exporta `./v4`, `./v4/mini` y `./v4/locales` desde el mismo paquete [ref:https://github.com/colinhacks/zod/blob/7baee4e17f86f4017e09e12b0acdee36a5b1c087/packages/zod/package.json@7baee4e]
- zod 3.25.76 incluye locales es, pt y en para Zod 4 [ref:https://github.com/colinhacks/zod/tree/7baee4e17f86f4017e09e12b0acdee36a5b1c087/packages/zod/src/v4/locales@7baee4e]
- Valibot (open-circle, 9k estrellas, v1.5.0 de 2026-09-09) trae traducciones es y pt en @valibot/i18n [ref:https://github.com/open-circle/valibot/tree/d4da61a0ac696f8421f97328f329a560b67143a9/packages/i18n/src@d4da61a]

## 5. Opciones

D1 - Validacion

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Seguir en Zod v3 y endurecer schemas | Cero cambio de dependencia; mensajes por idioma ya salen del diccionario propio | Core mas pesado (12.47 kb gzip segun Zod) | baja | Si, como base |
| B. `zod/v4/mini` desde el zod 3.25.76 ya instalado | ~1.88 kb de core; sin dependencia nueva; mismo autor | Reescribir schemas a API funcional; `message` pasa a `error`; sin locale por defecto; al subir a zod@4 cambia el import | media | Solo si la medicion de D1 en la seccion 9 muestra que Zod pesa |
| C. Valibot | El mas chico segun su propio benchmark; i18n es/pt | Dependencia nueva (bloqueada sin aprobacion); reescritura total | media | No ahora |
| D. Constraint Validation API + validador propio | Cero dependencia; mensajes nativos del navegador | Reimplementa lo que Zod ya resuelve; mensajes nativos no siguen `data-lang`; 8 campos y respuesta a mantener a mano | media | No |

D2 - Envio

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Reintento automatico actual (3 POST) | Recupera fallos transitorios | Duplica leads: el backend no deduplica y un fallo de red no dice si el POST llego | baja | No |
| B. Cero reintento automatico del POST + estado "resultado desconocido" + lock en vuelo + reintento manual informado | Alinea con RFC 9110, ky y la ausencia de idempotencia en admin-ajax | Algun lead se pierde si la persona no reintenta | baja | Si |
| C. Idempotency-Key | Patron Stripe/IETF | admin-ajax y el middleware no lo leen; mandar la clave como campo nuevo viola "campos intocables" | alta | No aplica hasta que el backend lo soporte |

D3 - Consentimiento y geo

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Checkbox desmarcado (accion afirmativa) | Valido en GDPR/LGPD/LFPDPPP; el dato en CRM deja de sobrestimar consentimiento | Puede bajar la conversion | baja | Si, sujeto a Legal |
| B. Aviso sin checkbox (interes legitimo / tacito LFPDPPP) | Menos friccion | Exige que Legal elija base distinta del consentimiento; Elementor hoy exige el checkbox | media | Decision de Karen/Legal |
| C. Premarcado actual | Ninguno legal | Invalido para GDPR y no recomendado por ANPD | baja | No |
| Geo 1. Terceros (ipwho.is, geojs) siempre | Funciona sin backend | IP a terceros sin consentimiento ni contrato | baja | No |
| Geo 2. Primera parte: cookie `_atcg` (como el fork newAug26) y terceros solo con consentimiento | Nada sale del dominio en el caso comun | Depende de una cookie interna del plugin | baja | Si |
| Geo 3. CF-IPCountry expuesto por el origen | Fuente documentada por Cloudflare | Requiere cambio server-side en WordPress | media | Mejor opcion a futuro |

D4 - Zoom

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Popup en el gesto + allowlist https y *.zoom.us + `opener = null` antes de navegar + CTA de respaldo | Mantiene la UX actual; cierra CN-002 y CN-007 | Pestana en blanco breve; si SF falla se abre y se cierra | baja | Si |
| B. Solo enlace en el thank-you | Sin popup ni about:blank same-origin | Un clic mas para entrar al webinar | baja | Aceptable si Karen prefiere simplicidad |

## 6. Evidencia en contra

- Contra D2-B: en LATAM movil un POST sin reintento automatico puede perder leads; se acepta porque RFC 9110 desaconseja reintentar sin saber si el original se aplico [doc:https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2@RFC9110]
- Contra D2-B, mitigacion: un error de red de fetch es TypeError y no distingue "no salio" de "salio y se corto", asi que se ofrece reintento manual con el aviso de posible duplicado en vez de automatico [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch@2026-10-01]
- Contra D2-B: Stripe y Formbricks si reintentan; se resuelve porque ambos tienen identidad server-side (clave o responseId) que este backend no ofrece [ref:https://github.com/stripe/stripe-node/blob/fe645f63d645011aca38dff9e245c1cf7b9ae60e/src/RequestSender.ts#L397-L425@fe645f6]
- Contra D1-A: la propia doc de Zod admite que el tamano importa para redes moviles lentas, que es parte del publico; queda abierto hasta medir y la salida barata es zod/v4/mini sin dependencia nueva [doc:https://zod.dev/packages/mini@4]
- Contra D3-A: la LFPDPPP valida el consentimiento tacito por regla general, asi que para Mexico un checkbox podria no ser obligatorio; se acepta como decision de Legal, pero un premarcado no es ni aviso claro ni accion afirmativa [doc:https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf@DOF-2025-11-14]
- Contra D3-A: el GDPR quiza ni aplique a trafico LATAM por su art. 3(2); se acepta porque la LGPD (Brasil, version pt) llega a la misma conclusion via la ANPD [doc:https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@download/file@1.0]
- Contra Geo 2: `_atcg` es una cookie interna del plugin, no un contrato; se acepta porque el fallo degrada a selects vacios, el flujo ya previsto [repo:src/core/geo.ts:3]
- Contra D4-A: OWASP sugiere `noopener` en las features, pero MDN dice que entonces window.open devuelve null y no se podria cerrar el popup si SF falla; por eso se anula `opener` despues [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/open@2026-10-01]

## 7. Ejemplares y anti-ejemplos

- Asi se ve bien hecho (D2): retry solo para metodos idempotentes, POST fuera de la lista por defecto [ref:https://github.com/sindresorhus/ky/blob/0d59458a0a58e1c3d7c6db0ab17ed5c7cd671e47/source/utils/normalize.ts#L16@0d59458]

```ts
const retryMethods: HttpMethod[] = ['get', 'put', 'head', 'delete', 'options', 'trace', 'query'];
```

- Asi se ve bien hecho (D2): un solo envio en vuelo; si hay request activo, no se arranca otro [ref:https://github.com/formbricks/formbricks/blob/f1fc4adbc38bf49615fc13db30698c056a381a60/packages/surveys/src/lib/response-queue.ts#L292-L295@f1fc4ad]

```ts
async processQueue(): Promise<{ success: boolean }> {
  if (this.isRequestInProgress || this.queue.length === 0) {
    return { success: false };
  }
```

- Anti-ejemplo (D2): parsear el cuerpo dentro del mismo try que el fetch convierte un 502 HTML o un challenge en otro POST [repo:src/core/submit-elementor.ts:33]
- Anti-ejemplo (D2): un hook que lanza de forma sincrona escapa de `allSettled` porque `map` lo ejecuta antes de crear la promesa [repo:src/core/form-engine.ts:129]
- Anti-ejemplo (D3): consentimiento premarcado que viaja como `on` aunque la persona no toque nada [repo:src/forms/lead.ts:23]
- Asi se ve bien hecho (D3): HubSpot guarda el texto exacto que vio el visitante junto al booleano de consentimiento [doc:https://developers.hubspot.com/docs/api-reference/legacy/marketing/forms/v3-legacy/submit-data-unauthenticated@v3-legacy]
- Anti-ejemplo (D4): popup about:blank (same-origin) navegado a un valor del DOM sin allowlist ni corte de opener [repo:src/core/form-engine.ts:125]
- Asi se ve bien hecho (D4): allowlist de esquema y host para la URL de redireccion [doc:https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html@2026-10-01]

## 8. Trampas

- `success:true` no es lead en Salesforce: un exito de admin-ajax solo dice encolado, no lo prometas en el thank-you [repo:CLAUDE.md:105]
- Probar con sesion de WordPress admin abierta da 200 OK sin lead: todo E2E de envio va en incognito [repo:CLAUDE.md:128]
- Quitar `X-Requested-With` o forzar Content-Type silencia la accion SF; cualquier refactor del envio debe conservar FormData + ese header [repo:CLAUDE.md:144]
- Desmarcar el checkbox lo vuelve obligatorio de tildar, porque Elementor rechaza el envio sin el [repo:CLAUDE.md:124]
- Elegir "aviso sin checkbox" (D3-B) choca con esa misma regla server-side del form #593, que no vive en este repo [repo:CLAUDE.md:124]
- Mover `window.open` despues de un await lo saca del gesto y el bloqueador de popups lo corta [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/open@2026-10-01]
- Pasar `noopener` en las features devuelve null y rompe el cierre del popup cuando SF falla [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/open@2026-10-01]
- El valor de `data-zoom-link` alimenta popup, CTA, hidden de SF y Comment: sanearlo en un solo punto de entrada o queda un camino sin allowlist [repo:src/index.ts:58]
- CF-IPCountry llega al origen, no al JavaScript del navegador: el widget no puede leerlo sin que WordPress lo exponga [doc:https://developers.cloudflare.com/network/ip-geolocation/@2026-08-27]
- `/cdn-cgi/trace` figura en la doc de Cloudflare solo como herramienta de troubleshooting del campo colo, no como API de pais; no depender de el [doc:https://developers.cloudflare.com/support/troubleshooting/general-troubleshooting/gathering-information-for-troubleshooting-sites/@2026-08-12]
- Zod Mini sin mensaje propio en algun check muestra "Invalid input" en ingles en un form es/pt [doc:https://zod.dev/packages/mini@4]
- Al pasar a Zod 4 el parametro `message` se renombra a `error`; el workaround de `z.literal` para el checkbox debe revisarse [repo:src/schemas/lead.ts:4]
- GA4 define `currency` en funcion de `value`; mandar solo currency, como hoy, no aporta valor de conversion [repo:src/integrations/index.ts:17]
- `gtag`, `dataLayer` y `fbq` son globales del host: el widget no controla su existencia ni si lanzan [doc:https://developers.google.com/tag-platform/tag-manager/datalayer@2026-10-01]
- El draft Idempotency-Key esta expirado y admin-ajax no lo implementa: mandar el header no deduplica nada [doc:https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/@draft-07]
- Contexto CI: release.yml corre en Node 20 y no ejecuta tests; un criterio que solo se prueba con `node --test` no protege el release [repo:.github/workflows/release.yml:30]
- Contexto tests: el runner nativo necesita Node 22.18 o mayor para TS sin transpilar [repo:test/lead-meta.test.ts:1]
- Contexto preview.html: el dev server sirve otro origen, y admin-ajax solo acepta CORS de www.atfxlatam.com, asi que el envio real no se prueba ahi [repo:CLAUDE.md:122]
- Contexto popups de Elementor: los mounts que aparecen despues del boot no se inicializan, asi que ninguna regla de este brief corre en ellos hoy [repo:src/index.ts:28]

## 9. Incertidumbre

- ASSUMPTION: Zod ocupa una fraccion relevante de dist/forms.js (167 KB minificado junto con GSAP); la cifra de 60 KB del pedido no se verifico. prueba: build con `metafile: true` y `esbuild.analyzeMetafile` para ver los bytes de node_modules/zod
- ASSUMPTION: importar `zod/v4/mini` del 3.25.76 instalado compila con target es2019 sin avisos (se vio que usa `BigInt()` como llamada, no literales). prueba: rama con un schema migrado y `npm run build`
- ASSUMPTION: Salesforce no tiene reglas de duplicados activas para Lead por email, asi que cada reintento crea un lead. prueba: consulta read-only por MCP `SELECT DeveloperName, IsActive FROM DuplicateRule WHERE SobjectType = 'Lead'`
- ASSUMPTION: la cookie `_atcg` la escribe el plugin atfx-general en el primer request desde la geo de Cloudflare. prueba: en incognito, revisar los Set-Cookie de la primera respuesta de www.atfxlatam.com y su valor decodificado
- ASSUMPTION: los largos maximos utiles son los de los campos estandar de Lead (FirstName, LastName, Email, Phone). prueba: describe del objeto Lead por MCP read-only y fijar max() con esos largos
- ASSUMPTION: los datos del form (nombre, email, telefono, pais, experiencia de trading) no son "financieros o patrimoniales" en el sentido del art. 7 LFPDPPP. prueba: lectura de Legal; no es tecnica
- [NEEDS CLARIFICATION: Karen/Legal - base legal del form: consentimiento con checkbox desmarcado (D3-A) o aviso sin checkbox por interes legitimo / tacito (D3-B)? D3-B exige cambiar el form #593 en Elementor]
- [NEEDS CLARIFICATION: Karen/Legal - el GDPR aplica a este trafico (visitantes en la UE)? Cambia cuanto pesa la guia EDPB frente a ANPD/LFPDPPP]
- [NEEDS CLARIFICATION: Karen - que registro de consentimiento basta: hoy SF ya recibe `on`, la URL (referrer) y CreatedDate; guardar la version del texto mostrado exigiria un campo nuevo y los campos son intocables]
- [NEEDS CLARIFICATION: Karen - un lead perdido por no reintentar vs un lead duplicado: cual es peor para ventas? Define si el reintento manual pide confirmacion]
- [NEEDS CLARIFICATION: Karen - D4: mantener el popup automatico de Zoom o dejar solo el enlace del thank-you?]
- No verificado: el texto oficial de la LGPD en planalto.gov.br dio ECONNRESET en cada intento; sus articulos se citan via la guia de la ANPD.
- No verificado: Typeform y el editor nuevo de forms de HubSpot no se investigaron; solo la doc legacy de HubSpot.
- No verificado: la cifra de Valibot vs Zod es del benchmark del propio Valibot.
- El fork atfx-forms-newAug26 (privado, 1db126a) ya resuelve CN-002/CN-007 (safeZoomLink + opener=null) y CN-003 (geo por `_atcg` + gate `moove_gdpr_popup`); no se cita como referencia porque su repo es privado y el linter no puede comprobar el enlace.
- Inyeccion sospechada en fuentes: ninguna.

## 10. Checklist de estandar

- [ ] D1: todo campo de texto tiene min y max de longitud; email con total de 254 o menos
- [ ] D1: pais y prefijo se validan como enum cerrado derivado de la misma lista que pinta las opciones
- [ ] D1: la regex de telefono de Zod y el `pattern` HTML aceptan y rechazan los mismos valores, con test
- [ ] D1: la respuesta de admin-ajax se valida con schema; no-JSON o forma inesperada se trata como "resultado desconocido", nunca como exito
- [ ] D1: cada atributo data-* se valida en un unico punto de entrada; un valor invalido cae a un default seguro y avisa por consola
- [ ] D1: `data-lang` normaliza variantes regionales (pt-BR a pt, es-MX a es)
- [ ] D1: no se agrega ni cambia una dependencia sin aprobacion de Karen
- [ ] D2: el POST se envia como maximo una vez por accion de la persona; ningun reintento automatico tras emitir el fetch
- [ ] D2: test con fake timers: timeout, TypeError y respuesta no-JSON producen exactamente 1 llamada a fetch
- [ ] D2: timeout y error de red muestran un mensaje de "resultado desconocido" distinto del de rechazo del servidor
- [ ] D2: mientras hay un envio en vuelo, un segundo submit no dispara otro fetch (test)
- [ ] D2: un hook de analitica que lanza sincrono o asincrono no cambia el thank-you ni cierra el popup (test)
- [ ] D2: los hooks corren despues de pintar el thank-you y no lo bloquean
- [ ] D2: el payload sigue siendo FormData con `X-Requested-With: XMLHttpRequest` y los mismos campos y llaves
- [ ] D3: el checkbox de consentimiento nace desmarcado, salvo que Karen/Legal firme otra base legal por escrito
- [ ] D3: ninguna llamada a un proveedor de geo de terceros ocurre sin consentimiento (test con fetch espiado)
- [ ] D3: las llamadas de geo a terceros, si quedan, usan `referrerPolicy: "no-referrer"` y `credentials: "omit"`
- [ ] D3: sin geo disponible, pais y prefijo quedan vacios y el form sigue usable
- [ ] D4: `data-zoom-link` solo acepta https y host zoom.us o subdominio; cualquier otro valor se descarta antes de usarse (test con `javascript:` y host ajeno)
- [ ] D4: `window.open` ocurre de forma sincrona en el handler de submit, antes del primer await
- [ ] D4: `popup.opener = null` antes de navegar el popup; el CTA del thank-you conserva `rel=noopener`
- [ ] Todo E2E de envio se hace en incognito y se confirma el lead por consulta read-only en SF

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | Versioning in Zod 4 (zod.dev/v4/versioning) | Colin McDonnell | Zod 4 | 2026-10-01 | high |
| 2 | Release notes Zod 4 (zod.dev/v4) | Colin McDonnell | Zod 4 | 2026-10-01 | high |
| 3 | Zod Mini (zod.dev/packages/mini) | Colin McDonnell | Zod 4 | 2026-10-01 | high |
| 4 | zod packages/zod/package.json | colinhacks/zod | v3.25.76 @7baee4e | 2026-10-01 | high |
| 5 | Valibot comparison / internationalization | open-circle | v1.5.0 | 2026-10-01 | medium |
| 6 | MDN Constraint validation; Client-side form validation | Mozilla | 2026-10-01 | 2026-10-01 | high |
| 7 | OWASP Input Validation Cheat Sheet | OWASP | 2026-10-01 | 2026-10-01 | high |
| 8 | RFC 9110 HTTP Semantics, 9.2.2 | IETF | RFC 9110 | 2026-10-01 | high |
| 9 | draft-ietf-httpapi-idempotency-key-header | IETF httpapi WG | draft-07, expirado | 2026-10-01 | medium |
| 10 | Stripe API - Idempotent requests | Stripe | 2026-10-01 | 2026-10-01 | high |
| 11 | MDN fetch; Promise.allSettled; Window.open; Window.opener | Mozilla | 2026-10-01 | 2026-10-01 | high |
| 12 | GA4 recommended events | Google | 2026-10-01 | 2026-10-01 | medium |
| 13 | GTM data layer | Google | 2026-10-01 | 2026-10-01 | high |
| 14 | Meta Pixel reference | Meta | 2026-10-01 | 2026-10-01 | medium |
| 15 | Reglamento (UE) 2016/679 (EUR-Lex) | UE | 2016/679 | 2026-10-01 | high |
| 16 | EDPB Guidelines 05/2020 on consent | EDPB | v1.1, 2020-05-04 | 2026-10-01 | high |
| 17 | Guia orientativo Cookies e protecao de dados pessoais | ANPD | v1.0, oct 2022 | 2026-10-01 | high |
| 18 | Ley Federal de Proteccion de Datos Personales en Posesion de los Particulares | Camara de Diputados | DOF 2025-03-20, ult. reforma 2025-11-14 | 2026-10-01 | high |
| 19 | Cloudflare IP geolocation; Managed Transforms; troubleshooting | Cloudflare | 2026-08-27 / 2026-08-12 | 2026-10-01 | high |
| 20 | HubSpot submit data (unauthenticated) y consentimiento en forms legacy | HubSpot | v3 legacy | 2026-10-01 | medium |
| 21 | OWASP HTML5 Security; Unvalidated Redirects and Forwards | OWASP | 2026-10-01 | 2026-10-01 | high |
| 22 | ky source/utils/normalize.ts y readme | sindresorhus/ky | @0d59458 | 2026-10-01 | high |
| 23 | stripe-node src/RequestSender.ts | stripe/stripe-node | @fe645f6 | 2026-10-01 | high |
| 24 | Formbricks packages/surveys/src/lib/response-queue.ts | formbricks/formbricks | @f1fc4ad | 2026-10-01 | high |
| 25 | Valibot packages/i18n/src | open-circle/valibot | @d4da61a | 2026-10-01 | high |
