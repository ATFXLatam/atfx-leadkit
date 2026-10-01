# Reference Brief: caducidad de formularios de campanas (cliente + enforcement server-side)

Slug: forms-v2-campaign-expiry | Nivel: deep | Fecha: 2026-10-01 | Estado: ESCALADO
Versiones: zod=3.23.8, gsap=3.15.0, esbuild=0.23.0, typescript=5.5.4
Verificador: research-verifier 2026-10-01 ESCALATE

## 1. Pregunta y decisiones abiertas

Como se implementa correctamente la caducidad de un formulario de campana en el paquete nuevo de
forms de leads (greenfield), sabiendo que hoy todas las landings envian al mismo form de Elementor
Pro #593 via POST a /wp-admin/admin-ajax.php, de ahi a un middleware asincrono y a Salesforce, y
que las landings de campanas pasadas siguen aceptando leads.

Peticion de Karen (sesion 2026-10-01): "Los formularios de campanas pasadas no deberian seguir
aceptando entrada de leads, necesitan bloquearse al finalizar campana, eso podemos declararlo
sobre un atributo de caducidad no?". Insumos: el codigo del repo, el CLAUDE.md del proyecto, el
informe ~/Desktop/security-audit-atfx-forms-2026-10-01.md (CN-009) y las memorias de campos fijos.
No hay discovery. Ningun brief del INDEX cubre caducidad (los tres existentes tratan runtime,
distribucion y envio/privacidad).

Bloque D1 - Atributo declarativo en el cliente. Nombre y formato (data-closes-at / data-opens-at
en ISO 8601 con offset obligatorio), zona horaria en LATAM multi-pais sin Temporal, reloj del
visitante manipulable o desfasado, que se muestra al caducar (mensaje, CTA a campana vigente,
ocultar form), campanas futuras, y "webinar ya ocurrido" frente a "registro cerrado".

Bloque D2 - Enforcement server-side. Por que el cliente no basta y cual de estas capas lo aplica:
(a) un form de Elementor por campana, (b) hook PHP elementor_pro/forms/validation con fecha de fin
por campana, (c) token firmado con expiracion, (d) middleware/Salesforce (Campaign EndDate,
IsActive), (e) regla de Cloudflare WAF o Worker. Comparado con HubSpot, Typeform, Google Forms y
Tally.

Bloque D3 - Leads que llegan tarde. Rechazar con mensaje frente a aceptar marcados. Es un
trade-off de negocio que decide Karen; el brief solo expone costos y restricciones.

## 2. Estado actual

Contextos: navegador en landings de www.atfxlatam.com (widget HTML de Elementor, bundle desde jsDelivr @latest, HTML de la landing servido por WP Engine detras de Cloudflare), preview.html con el dev server de esbuild, runner `node --test` sobre test/, CI release.yml (typecheck + build), sesion de WordPress admin abierta (silencia la accion SF), backend admin-ajax de WordPress con Elementor Pro (PHP, no es codigo de este repo), middleware asincrono y Salesforce (no es codigo de este repo), edge de Cloudflare frente al origen

- D1: el boot recorre todos los `[data-atfx-form-mount]` y monta el form sin ninguna nocion de fecha de campana [repo:src/index.ts:28]
- D1: los atributos se leen con `dataset[key]` y `trim()`, sin validacion de formato generica [repo:src/index.ts:24]
- D1: el unico atributo de fecha existente es `data-webinar-date`, que se reenvia tal cual a `Webinar_date_time__c` [repo:src/index.ts:60]
- D1: el contrato documenta `data-webinar-date="2026-06-25 18:00:00"`, sin offset de zona horaria ni separador T [repo:CLAUDE.md:30]
- D1: el form se pega en un widget HTML de Elementor, no en el widget Form [repo:CLAUDE.md:46]
- D1: el loader `@latest` puede seguir sirviendo la version anterior varios minutos tras un tag [repo:CLAUDE.md:118]
- D2: todas las landings envian `post_id` 593 y `form_id` 36ed025 fijos para enrutar a la accion SF del form #593 [repo:src/forms/lead.ts:26]
- D2: `action` es `elementor_pro_forms_send_form`, el handler clasico de Elementor Pro [repo:src/forms/lead.ts:33]
- D2: admin-ajax acepta valores arbitrarios y no valida picklists [repo:CLAUDE.md:107]
- D2: la atribucion de landing (`Landing_Page_Id__c`) sale del campo top-level `referrer` [repo:CLAUDE.md:109]
- D2: el motor sobrescribe `referrer` con `location.href` de la landing [repo:src/forms/lead.ts:34]
- D2: `success:true` de admin-ajax significa encolado en el middleware, no creado en Salesforce [repo:CLAUDE.md:105]
- D2: con `success:false` el motor muestra `response.data.message` del servidor en el banner del form [repo:src/core/form-engine.ts:114]
- D2: cualquier excepcion (incluida una respuesta no-JSON) cae en el catch que muestra "error de conexion" [repo:src/core/form-engine.ts:136]
- D2: `res.json()` esta dentro del try del fetch, asi que una respuesta HTML provoca reintento [repo:src/core/submit-elementor.ts:33]
- D2: el envio reintenta hasta 2 veces mas ante una excepcion [repo:src/core/submit-elementor.ts:5]
- D2: el bundle es publico en jsDelivr, no puede contener secretos [repo:CLAUDE.md:195]
- D2: con sesion de admin de WordPress el submit devuelve 200 pero no crea lead en SF [repo:CLAUDE.md:128]
- D3: `lead_source` se valida contra el picklist copiado a mano y cae a un default fuera de el [repo:src/core/lead-meta.ts:12]
- D3: en modo webinar el form ya arma un campo `Comment` con topic, fecha y link [repo:src/index.ts:65]
- Restriccion: campos y schemas del form no se modifican; solo el texto puede cambiar [KAREN:memory/feedback_atfx_forms_campos_fijos.md]
- Restriccion: deps, configs raiz, deploy y git estan bloqueados sin aprobacion [KAREN:~/.claude/CLAUDE.md]
- Requisito: los forms de campanas pasadas deben bloquearse al finalizar la campana, declarado con un atributo de caducidad [KAREN:chat 2026-10-01]
- Hallazgo previo CN-009: cualquiera puede hacer POST directo a admin-ajax con post_id/form_id publicos; el control debe ser server-side [KAREN:~/Desktop/security-audit-atfx-forms-2026-10-01.md]

## 3. Fuentes primarias

- D1: el formato de fecha de JS es `YYYY-MM-DDTHH:mm:ss.sssZ`, donde Z es la letra Z o `+HH:mm` / `-HH:mm` [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format@2026-10-01]
- D1: sin offset, las formas solo-fecha se interpretan como UTC y las formas fecha-hora como hora local del dispositivo [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format@2026-10-01]
- D1: el valor interno de Date es UTC; la zona local la pone el host (el dispositivo del visitante) [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format@2026-10-01]
- D1: Date.parse solo garantiza el formato ISO; otros formatos son definidos por la implementacion y devuelve NaN si no puede parsear [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse@2026-10-01]
- D1: el atributo `datetime` de HTML admite "global date and time" con offset, incluido el separador espacio, que no es el formato de Date [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/time@2026-10-01]
- D1: la validacion de cliente no es una medida de seguridad; un usuario puede alterar la peticion de red [doc:https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation@2026-10-01]
- D1: JWT `exp` no se acepta "en o despues" de la hora de expiracion; `nbf` no antes de su hora; permite leeway de pocos minutos por desfase de reloj [doc:https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.4@RFC7519]
- D2: `elementor_pro/forms/validation` recibe `$record` y `$ajax_handler` y es el punto para agregar validadores; los errores se agregan con `$ajax_handler->add_error()` [doc:https://developers.elementor.com/docs/hooks/forms@2026-10-01]
- D2: `elementor_pro/forms/process` corre despues de la validacion y `elementor_pro/forms/new_record` despues de las acciones [doc:https://developers.elementor.com/docs/hooks/forms@2026-10-01]
- D2: en WordPress, `current_time('timestamp')` no es un Unix timestamp (suma el offset del sitio); usar `time()` o `current_datetime()` desde 5.3 [doc:https://developer.wordpress.org/reference/functions/current_time/@2026-10-01]
- D2: `wp_send_json_error()` sin `status_code` responde HTTP 200 con `success:false` [doc:https://developer.wordpress.org/reference/functions/wp_send_json_error/@2026-10-01]
- D2: `url_to_postid()` devuelve el post ID de una URL del propio sitio o 0 si no lo determina [doc:https://developer.wordpress.org/reference/functions/url_to_postid/@2026-10-01]
- D2: `hash_equals($known, $user)` compara en tiempo constante; el valor del usuario va segundo [doc:https://www.php.net/manual/en/function.hash-equals.php@2026-10-01]
- D2: Salesforce Campaign End Date: "Responses received after this date are still counted" [doc:https://help.salesforce.com/s/articleView?id=sf.campaigns_fields.htm&language=en_US&type=5@2026-10-01]
- D2: Salesforce Campaign Active es solo un checkbox de activo/inactivo, y Status un picklist administrable [doc:https://help.salesforce.com/s/articleView?id=sf.campaigns_fields.htm&language=en_US&type=5@2026-10-01]
- D2: Web-to-Lead asocia el lead a una campana con `Campaign_ID` y `member_status` ocultos; sin member status no lo asocia [doc:https://help.salesforce.com/s/articleView?id=000383049&language=en_US&type=1@2026-10-01]
- D2: Cloudflare custom rules: maximo 5 en Free, 20 en Pro, 100 en Business y 1000 en Enterprise, con acciones como Block [doc:https://developers.cloudflare.com/waf/custom-rules/@2026-10-01]
- D2: `http.request.timestamp.sec` es la hora UNIX en que Cloudflare recibio la peticion [doc:https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/http.request.timestamp.sec/@2026-10-01]
- D2: `http.request.body.form` (leer campos del POST en una regla) requiere plan Enterprise [doc:https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/http.request.body.form/@2026-10-01]
- D2: `http.referer` es el header Referer de la peticion, un string que manda el cliente [doc:https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/http.referer/@2026-10-01]
- D2: `is_timed_hmac_valid_v0()` valida un token HMAC con TTL relativo a su emision y requiere plan Pro, Business o Enterprise [doc:https://developers.cloudflare.com/ruleset-engine/rules-language/functions/@2026-10-01]
- D2: los secrets de un Worker son bindings cifrados que no se ven tras definirlos y se leen desde `env` [doc:https://developers.cloudflare.com/workers/configuration/secrets/@2026-10-01]
- D2: sin Referrer-Policy explicita el default es strict-origin-when-cross-origin, que en mismo origen manda origen, ruta y query [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy@2026-10-01]
- D2: RFC 9110 define 403 como "entendio la peticion pero se niega a cumplirla" y 410 como recurso ya no disponible de forma probablemente permanente [doc:https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.11@RFC9110]
- Industria: HubSpot no cierra por fecha; al despublicar, links y embeds se reemplazan por "This form is no longer accepting submissions" [doc:https://knowledge.hubspot.com/forms/unpublish-forms@2026-10-01]
- Industria: la API de Google Forms separa `isPublished` de `isAcceptingResponses`: un form puede seguir visible y no aceptar respuestas [doc:https://developers.google.com/workspace/forms/api/reference/rest/v1/forms@v1]
- Industria: Tally permite cerrar a mano, cerrar en una fecha programada, limitar envios y editar el mensaje de form cerrado [doc:https://tally.so/help/form-settings@2026-10-01]
- Industria: la API de Typeform expone `settings.is_public` para pasar un form a privado [doc:https://www.typeform.com/developers/create/reference/create-form/@2026-10-01]

## 4. Implementaciones de referencia

- OpnForm (OpnForm/OpnForm, 3.7k estrellas, push 2026-10-01): form builder open source con `closes_at`; referencia porque cierra por fecha con enforcement en el servidor y test [ref:https://github.com/OpnForm/OpnForm/blob/413c20cb837f595035b11c41927658778d654d1e/api/app/Models/Forms/Form.php#L351@413c20c]
- OpnForm calcula `is_closed` en cada peticion como `now()->gt($this->closes_at)`, sin cron que cambie un estado [ref:https://github.com/OpnForm/OpnForm/blob/413c20cb837f595035b11c41927658778d654d1e/api/app/Models/Forms/Form.php#L353@413c20c]
- OpnForm normaliza `closes_at` a UTC al guardarlo [ref:https://github.com/OpnForm/OpnForm/blob/413c20cb837f595035b11c41927658778d654d1e/api/app/Models/Forms/Form.php#L338@413c20c]
- OpnForm niega el envio en la policy `answer()` si el form esta cerrado [ref:https://github.com/OpnForm/OpnForm/blob/413c20cb837f595035b11c41927658778d654d1e/api/app/Policies/FormPolicy.php#L155@413c20c]
- OpnForm tiene un test que envia a un form con `closes_at` de ayer y espera 403 [ref:https://github.com/OpnForm/OpnForm/blob/413c20cb837f595035b11c41927658778d654d1e/api/tests/Feature/Forms/AnswerFormTest.php#L29@413c20c]
- En el cliente, OpnForm no calcula el cierre con el reloj del navegador: pinta `closed_text` segun el `is_closed` que manda el servidor [ref:https://github.com/OpnForm/OpnForm/blob/413c20cb837f595035b11c41927658778d654d1e/client/components/open/forms/OpenCompleteForm.vue#L50@413c20c]
- Formbricks (13k estrellas, push 2026-10-01) elimino en 2025 sus columnas `closeOnDate` y `runOnDate` y el estado `scheduled`, pasando los programados a `paused` [ref:https://github.com/formbricks/formbricks/blob/ea59c711fb5ba379b053b162177d67bd404394ad/packages/database/migration/20250904145727_removes_cron_and_survey_scheduling/migration.sql#L10@ea59c71]
- Plugin oficial de hCaptcha para WordPress: engancha `elementor_pro/forms/validation` y rechaza con `add_error()`; referencia porque es el patron de un vendor para bloquear un form de Elementor server-side [ref:https://github.com/hCaptcha/hcaptcha-wordpress-plugin/blob/3e5ef91b7a569c82548bb154c50a49adcdd9e0c2/src/php/ElementorPro/HCaptchaHandler.php#L371@3e5ef91]
- Simple Cloudflare Turnstile documenta que los forms atomicos de Elementor 4 no pasan por `elementor_pro/forms/validation`; postean a `elementor_pro_atomic_forms_send_form` [ref:https://github.com/ElliotSowersby/simple-cloudflare-turnstile/blob/46219aafab43b94c271df9c03704fec915993de8/inc/integrations/other/elementor.php#L247@46219aa]
- proelements redistribuye el codigo GPL de Elementor Pro 4.3.0 (no es Elementor oficial): si `validate()` falla, el handler responde error con `send()` antes de correr las acciones [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/ajax-handler.php#L122@84c616b]
- proelements: `validate()` dispara `elementor_pro/forms/validation` y devuelve `empty($ajax_handler->errors)` [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/form-record.php#L142@84c616b]
- proelements: el record solo conserva los campos definidos en la config del form; una llave nueva en `form_fields[...]` no entra al record [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/form-record.php#L307@84c616b]
- proelements: el meta `page_url` del record sale de `$_POST['referrer']`, un valor del cliente [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/form-record.php#L243@84c616b]
- Elementor core oficial: `Documents_Manager::get()` solo exige que el post exista (`get_post`), sin mirar si esta publicado [ref:https://github.com/elementor/elementor/blob/d82b5ccd2091c21af3bb248878a494bd94989627/core/documents-manager.php#L182@d82b5cc]
- Base de datos IANA tz: Mexico (regla Mexico) dejo de tener horario de verano tras 2022 [ref:https://github.com/eggert/tz/blob/bec4d95af5bc600df799bdec8964a4c78e9b57b3/northamerica#L2953@bec4d95]
- Base de datos IANA tz: Chile mantiene horario de verano de septiembre a abril sin fecha de fin [ref:https://github.com/eggert/tz/blob/bec4d95af5bc600df799bdec8964a4c78e9b57b3/southamerica#L1393@bec4d95]
- Base de datos IANA tz: la ultima regla de horario de verano de Brasil es de 2018-2019 [ref:https://github.com/eggert/tz/blob/bec4d95af5bc600df799bdec8964a4c78e9b57b3/southamerica#L946@bec4d95]

## 5. Opciones

D1 - Cliente (UX). La recomendacion aplica en todos los casos; lo que se decide es el formato.

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| C1 `data-closes-at` + `data-opens-at` ISO 8601 con offset obligatorio (`2026-10-31T23:59:59-06:00`), parseo estricto por regex antes de Date.parse | Un instante absoluto, igual en todo pais y dispositivo; el mismo string lo parsea PHP | El autor debe poner el offset correcto de esa fecha (Chile cambia de offset) | baja | Si |
| C2 Solo fecha (`2026-10-31`) | Facil de escribir | Se interpreta como medianoche UTC: cierra el 30 a las 18:00 en CDMX | baja | No |
| C3 Fecha-hora sin offset | Legible | Hora local del visitante: cada pais cierra a otra hora | baja | No |
| C4 Fecha + `data-tz="America/Mexico_City"` | El autor no calcula offsets | Requiere Intl/Temporal para resolver la zona; mas codigo, y el servidor necesita la misma tabla tz | media | No por ahora |

D2 - Enforcement server-side.

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| (a) Un form Elementor por campana, borrarlo al cerrar | Sin codigo | Cambia post_id/form_id (fijos, enrutan a la accion SF); duplica la config SF por campana; despublicar la pagina no corta el endpoint; cierre manual | media | No |
| (b) mu-plugin PHP en `elementor_pro/forms/validation`: resuelve la landing desde `referrer` y compara `time()` con su fecha de fin server-side | Rechaza antes de las acciones (no llega al middleware); el usuario ve el mensaje; un solo lugar; patron de hCaptcha | Requiere poder instalar PHP en WordPress; la identidad de campana sale de `referrer` (del cliente); no cubre forms atomicos de Elementor 4 | media | Si |
| (c) Token firmado con exp (HMAC) emitido server-side | Liga el envio a una emision real | Alguien debe emitirlo (PHP o Worker) y conocer la fecha de fin: no evita (b); un token de una landing vigente sirve igual; clave en wp-config o secret de Worker | alta | No para caducidad |
| (d) Middleware / Salesforce (Campaign EndDate, Active) | Vive donde esta la campana | EndDate no bloquea ("still counted"); el middleware es asincrono: el usuario ya vio el thank-you; no es codigo propio | media | Solo como marca complementaria |
| (e) Regla WAF de Cloudflare por `http.referer` + `http.request.timestamp.sec` | Sin tocar WordPress; corta en el edge | Referer lo manda el cliente; leer campos del body exige Enterprise; 5-20 reglas segun plan, una por campana; la respuesta de bloqueo no es JSON: el cliente muestra "error de conexion" y reintenta | baja | Solo como parche temporal |

D3 - Leads tardios.

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| R Rechazar con mensaje y CTA a campana vigente | Lo que hacen HubSpot, Google Forms y Tally; CRM limpio; la oferta vencida no se promete | Se pierde un interesado real si no sigue el CTA | baja | Decide Karen |
| M Aceptar y marcar como tardio | No se pierde el contacto | Salesforce cuenta respuestas tardias igual; marcar exige un valor de picklist o el Comment; sin cambiar campos | media | Decide Karen |

Recomendacion por capas: C1 en el cliente para UX, (b) como enforcement, y D3 abierto para Karen.
Mientras (b) no exista, (e) puede cerrar una campana puntual.

## 6. Evidencia en contra

- Contra (b): la identidad de campana sale de `referrer`, que manda el cliente; quien la falsee envia como si viniera de otra landing [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/form-record.php#L243@84c616b]
- Se acepta: el objetivo es que una campana vencida no reciba leads atribuidos a ella; un `referrer` falso a otra URL produce un lead atribuido a esa otra URL, no a la vencida [repo:CLAUDE.md:109]
- Se acepta tambien porque todo el POST es del cliente: post_id, form_id y queried_id son publicos (CN-009), asi que ninguna opcion sin cambiar el endpoint da identidad no falsificable [KAREN:~/Desktop/security-audit-atfx-forms-2026-10-01.md]
- Contra (b): requiere PHP en el WordPress de produccion, fuera de este repo y con dueno sin confirmar; si no se puede, la unica capa server-side disponible es (e) [repo:CLAUDE.md:14]
- Contra (b): el hook no cubre forms atomicos de Elementor 4; hoy no aplica porque el bundle usa la accion clasica [repo:src/forms/lead.ts:33]
- Contra C1: el reloj del visitante puede estar mal o manipularse, asi que el cliente puede mostrar abierto un form cerrado o al reves [doc:https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation@2026-10-01]
- Se acepta: el cliente es solo UX; el servidor decide con su propio reloj, como OpnForm, que no calcula el cierre en el navegador [ref:https://github.com/OpnForm/OpnForm/blob/413c20cb837f595035b11c41927658778d654d1e/client/components/open/forms/OpenCompleteForm.vue#L50@413c20c]
- Contra tener dos fuentes (atributo en el HTML y tabla en el servidor): pueden divergir; se resuelve con el servidor como autoridad y el atributo como copia de UX, y un criterio de aceptacion que los compare [ref:https://github.com/OpnForm/OpnForm/blob/413c20cb837f595035b11c41927658778d654d1e/api/app/Models/Forms/Form.php#L353@413c20c]
- Contra rechazar (R): Salesforce no considera que una campana con EndDate pasada deje de recibir respuestas, sugiere que el CRM esta pensado para contarlas [doc:https://help.salesforce.com/s/articleView?id=sf.campaigns_fields.htm&language=en_US&type=5@2026-10-01]
- No se resuelve aqui: es la decision D3 de negocio, para Karen [KAREN:chat 2026-10-01]

## 7. Ejemplares y anti-ejemplos

- Bien hecho: cierre calculado en cada peticion contra el reloj del servidor, sin job que cambie estados [ref:https://github.com/OpnForm/OpnForm/blob/413c20cb837f595035b11c41927658778d654d1e/api/app/Models/Forms/Form.php#L353@413c20c]

```php
return $this->visibility === 'closed' || ($this->closes_at && now()->gt($this->closes_at));
```

- Bien hecho: un validador de Elementor que agrega error y corta antes de las acciones [ref:https://github.com/hCaptcha/hcaptcha-wordpress-plugin/blob/3e5ef91b7a569c82548bb154c50a49adcdd9e0c2/src/php/ElementorPro/HCaptchaHandler.php#L371@3e5ef91]

```php
add_action( 'elementor_pro/forms/validation', [ $this, 'validation' ], 10, 2 );
// ...
$ajax_handler->add_error( $field['id'], $result );
```

- Bien hecho: test de regresion que manda un envio a un form cerrado y exige el rechazo [ref:https://github.com/OpnForm/OpnForm/blob/413c20cb837f595035b11c41927658778d654d1e/api/tests/Feature/Forms/AnswerFormTest.php#L29@413c20c]
- Bien hecho: instante absoluto con offset explicito, que Date y PHP leen igual [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format@2026-10-01]

```html
<div data-atfx-form-mount="lead" data-closes-at="2026-10-31T23:59:59-06:00"></div>
```

- Anti-ejemplo: el formato documentado de `data-webinar-date` no tiene offset ni T; Date.parse lo trata como definido por la implementacion [repo:CLAUDE.md:30]
- Anti-ejemplo: `current_time('timestamp')` en PHP para comparar contra la fecha de fin, porque suma el offset del sitio [doc:https://developer.wordpress.org/reference/functions/current_time/@2026-10-01]
- Anti-ejemplo: `wp_send_json_error()` desde un handler propio sin pasar por Elementor, que devuelve 200 y una forma de respuesta distinta a la que lee el cliente [doc:https://developer.wordpress.org/reference/functions/wp_send_json_error/@2026-10-01]

## 8. Trampas

- Una fecha sin offset (`2026-10-31T23:59`) se lee como hora local del visitante: Lima, CDMX y Sao Paulo cierran a horas distintas [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format@2026-10-01]
- Una fecha sola (`2026-10-31`) se lee como medianoche UTC: en CDMX el form cerraria el 30 a las 18:00 [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format@2026-10-01]
- Chile cambia de offset en septiembre y abril: el offset del atributo tiene que ser el vigente en la fecha de cierre, no el de hoy [ref:https://github.com/eggert/tz/blob/bec4d95af5bc600df799bdec8964a4c78e9b57b3/southamerica#L1393@bec4d95]
- Date.parse acepta mas formatos de los que el estandar garantiza; sin regex estricta antes, un formato raro funciona en un navegador y da NaN en otro [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse@2026-10-01]
- NaN en una comparacion siempre da false: un atributo invalido sin chequeo deja el form abierto en silencio [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse@2026-10-01]
- El limite es exclusivo: cerrado cuando ahora es mayor o igual a la hora de fin, como `exp` en JWT [doc:https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.4@RFC7519]
- Una pagina abierta antes del cierre sigue mostrando el form; todo envio pasa por `handleSubmit`, donde el chequeo de cliente debe repetirse, y el servidor decide [repo:src/core/form-engine.ts:83]
- Despublicar o mandar a borrador la landing no corta el endpoint: el handler solo pide que el post exista [ref:https://github.com/elementor/elementor/blob/d82b5ccd2091c21af3bb248878a494bd94989627/core/documents-manager.php#L182@d82b5cc]
- Con un solo form #593 compartido, una caducidad configurada en el form apagaria todas las campanas a la vez [repo:src/forms/lead.ts:26]
- Agregar un campo `form_fields[campaign_end]` no llega al record si el form #593 no lo define, y definirlo cambia el schema fijo [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/form-record.php#L307@84c616b]
- Una regla de Cloudflare que bloquea devuelve HTML: `res.json()` falla, el motor reintenta y muestra "error de conexion" [repo:src/core/submit-elementor.ts:33]
- Leer campos del POST en una regla WAF exige Enterprise; sin el, la regla solo puede usar ruta, Referer y hora [doc:https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/http.request.body.form/@2026-10-01]
- Rechazar en el middleware o en Salesforce llega tarde: `success:true` ya se devolvio y la persona vio el thank-you [repo:CLAUDE.md:105]
- Probar el rechazo con sesion de admin de WordPress da falsos resultados; probar en incognito [repo:CLAUDE.md:128]
- La clave de un token firmado no puede vivir en el bundle: es publico en jsDelivr [repo:CLAUDE.md:195]
- Marcar un lead tardio con un `lead_source` fuera del picklist hace que el form lo cambie por el default [repo:src/core/lead-meta.ts:21]
- Contexto navegador: el atributo solo afecta landings que cargan una version del bundle que lo entiende; `@latest` tarda minutos en propagar [repo:CLAUDE.md:118]
- Contexto preview.html y `node --test`: el reloj es el de la maquina; los tests deben inyectar "ahora" en vez de leer `Date.now()` [repo:src/core/lead-meta.ts:1]
- Contexto CI: release.yml no corre tests, asi que un test de caducidad no protege el release hasta que el CI lo ejecute [KAREN:~/Desktop/security-audit-atfx-forms-2026-10-01.md]
- Contexto WordPress/PHP: comparar con `time()` contra un instante en UTC; el reloj valido es el del servidor [doc:https://developer.wordpress.org/reference/functions/current_time/@2026-10-01]
- Contexto middleware y Salesforce: no ven la caducidad salvo que se marque el lead; EndDate no los detiene [doc:https://help.salesforce.com/s/articleView?id=sf.campaigns_fields.htm&language=en_US&type=5@2026-10-01]
- Contexto edge Cloudflare: la cache de HTML de la landing no afecta, porque el atributo es un instante absoluto, pero la regla WAF ve el Referer, no el body [doc:https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/http.referer/@2026-10-01]

## 9. Incertidumbre

- ASSUMPTION: el Elementor Pro instalado en www.atfxlatam.com sigue el mismo flujo que proelements 4.3.0 (validacion antes de acciones, record solo con campos definidos). prueba: en staging, mu-plugin que agregue un error en `elementor_pro/forms/validation` y confirmar en incognito que responde `success:false` y que no aparece lead en SF tras 10 min.
- ASSUMPTION: despublicar la landing no corta el endpoint en la version instalada. prueba: pasar una landing de prueba a borrador y hacer POST a admin-ajax con su post_id desde la consola del sitio.
- ASSUMPTION: el `referrer` que llega en el POST identifica la landing de campana (no hay landings que compartan URL). prueba: listar las URLs de landings activas y pasadas y confirmar que `url_to_postid` resuelve cada una.
- ASSUMPTION: Salesforce no impide crear el lead si la campana esta inactiva; solo la membresia de campana podria verse afectada. prueba: leer en SF (solo lectura) un lead reciente de una campana con Active desmarcado.
- ASSUMPTION: la API de envio de HubSpot rechaza forms despublicados; la doc solo habla de links y embeds. prueba: no aplica a ATFX salvo que se use HubSpot; se cita solo como referencia de UX.
- ASSUMPTION: Typeform permite programar fecha de cierre y limite de respuestas segun su centro de ayuda, que respondio 403 en esta corrida. prueba: abrir help.typeform.com "Close your form" en un navegador.
- ASSUMPTION: Google Forms permite programar fecha y hora de cierre y limite de respuestas; el centro de ayuda lo dice pero responde 404 a clientes no navegador y no se puede citar. prueba: abrir support.google.com/docs/answer/139706 en un navegador.
- ASSUMPTION: hay landings de campanas pasadas que cargan una version fija del bundle y nunca veran un atributo nuevo. prueba: buscar `at_forms@v` en el HTML publicado de las landings pasadas.
- ASSUMPTION: el sitio no usa forms atomicos de Elementor 4. prueba: confirmar en la red del navegador que todo envio usa `action=elementor_pro_forms_send_form`.
- [NEEDS CLARIFICATION: quien controla el WordPress de produccion y sus plugins, y si se puede agregar un mu-plugin PHP; sin eso la opcion (b) no existe]
- [NEEDS CLARIFICATION: que plan de Cloudflare tiene el sitio y quien puede crear reglas WAF]
- [NEEDS CLARIFICATION: ante un lead tardio, rechazar con mensaje o aceptar y marcar; si es marcar, con que valor y en que campo existente]
- [NEEDS CLARIFICATION: hora de fin de una campana multi-pais: un instante unico o uno por pais]
- [NEEDS CLARIFICATION: gracia para quien empezo a llenar antes del cierre (unos minutos) o corte exacto]
- [NEEDS CLARIFICATION: en webinars, el registro cierra al empezar, al terminar o en otra fecha; y si se ofrece grabacion despues]
- [NEEDS CLARIFICATION: texto del mensaje de cerrado por idioma y a donde lleva el CTA (campana vigente o home)]
- [NEEDS CLARIFICATION: quien da de alta la fecha de fin en el servidor y donde (meta de la pagina en WP o tabla en el mu-plugin)]

## 10. Checklist de estandar

- [ ] `data-closes-at` y `data-opens-at` aceptan solo ISO 8601 con offset explicito (Z o +HH:mm), validados por regex antes de Date.parse
- [ ] Un atributo de fecha invalido registra un console.warn con el valor y no rompe el render (el servidor decide)
- [ ] Cerrado cuando ahora es mayor o igual a closes-at; abierto cuando ahora es mayor o igual a opens-at; test en ambos bordes con "ahora" inyectado
- [ ] Al caducar, el form se reemplaza por un mensaje de cerrado traducido en es/en/pt; no queda form ni boton de envio en el DOM
- [ ] El CTA del mensaje de cerrado, si existe, se valida (https y host del sitio) como `data-zoom-link`
- [ ] El chequeo de cliente se repite al enviar, no solo al montar
- [ ] Antes de abrir (opens-at futuro) se muestra un mensaje de "proximamente" distinto del de cerrado
- [ ] La caducidad de registro es independiente de `data-webinar-date`; no se deriva de ella
- [ ] El servidor rechaza un POST directo a admin-ajax para una landing vencida, aunque el atributo se borre o el reloj se cambie, con `success:false` y mensaje
- [ ] El rechazo ocurre antes de las acciones del form: ningun lead de una landing vencida aparece en Salesforce tras 10 minutos (prueba en incognito)
- [ ] El servidor compara con `time()` contra la fecha de fin guardada en UTC
- [ ] Un envio a una landing vigente sigue funcionando igual (regresion)
- [ ] Ningun campo, llave ni post_id/form_id del form cambia
- [ ] No hay secretos en el bundle
- [ ] La decision D3 de Karen (rechazar o marcar) esta escrita en la spec antes de implementar

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | MDN Date (date time string format) y Date.parse | Mozilla | 2026-10-01 | 2026-10-01 | high |
| 2 | MDN time element; Client-side form validation; Referrer-Policy | Mozilla | 2026-10-01 | 2026-10-01 | high |
| 3 | RFC 7519 JWT (exp, nbf) | IETF | RFC 7519 | 2026-10-01 | high |
| 4 | RFC 9110 HTTP Semantics (403, 410) | IETF | RFC 9110 | 2026-10-01 | high |
| 5 | Elementor developers - Forms hooks | Elementor | 2026-10-01 | 2026-10-01 | high |
| 6 | WordPress reference: current_time, wp_send_json_error, url_to_postid | WordPress.org | 2026-10-01 | 2026-10-01 | high |
| 7 | PHP manual hash_equals | php.net | 2026-10-01 | 2026-10-01 | high |
| 8 | Salesforce Help: Campaign fields; Associate a Web-To-Lead to a Campaign | Salesforce | 2026-10-01 | 2026-10-01 | high |
| 9 | Cloudflare WAF custom rules; fields timestamp.sec, body.form, referer; functions; Workers secrets | Cloudflare | 2026-10-01 | 2026-10-01 | high |
| 10 | HubSpot unpublish forms | HubSpot | 2026-10-01 | 2026-10-01 | high |
| 11 | Google Forms API v1 forms (PublishSettings) | Google | v1 | 2026-10-01 | high |
| 12 | Tally form settings | Tally BV | 2026-10-01 | 2026-10-01 | high |
| 13 | Typeform Create API create-form | Typeform | 2026-10-01 | 2026-10-01 | medium |
| 14 | OpnForm (Form.php, FormPolicy.php, AnswerFormTest.php, OpenCompleteForm.vue) | OpnForm | 413c20c | 2026-10-01 | high |
| 15 | Formbricks migration removes_cron_and_survey_scheduling | Formbricks | ea59c71 | 2026-10-01 | medium |
| 16 | hCaptcha WordPress plugin HCaptchaHandler.php | hCaptcha | 3e5ef91 | 2026-10-01 | high |
| 17 | Simple Cloudflare Turnstile elementor.php | Elliot Sowersby | 46219aa | 2026-10-01 | medium |
| 18 | proelements (redistribucion GPL de Elementor Pro 4.3.0) | proelements | 84c616b | 2026-10-01 | medium |
| 19 | Elementor core documents-manager.php | Elementor | d82b5cc | 2026-10-01 | high |
| 20 | IANA tz database (northamerica, southamerica) | eggert/tz | bec4d95 | 2026-10-01 | high |
