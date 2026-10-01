# Reference Brief: patron post-envio (thank-you) que maximiza conversion y medicion en las LPs de ATFX LATAM

Slug: forms-v2-thank-you | Nivel: standard | Fecha: 2026-10-01 | Estado: ESCALADO
Versiones: zod=3.23.8, gsap=3.15.0, esbuild=0.23.0, typescript=5.5.4
Verificador: research-verifier 2026-10-01 ESCALATE

## 1. Pregunta y decisiones abiertas

Paquete nuevo (greenfield) del form de leads para landings de campanas de ATFX LATAM, broker de CFDs
regulado: webinars (lunes, miercoles y especiales) y LPs de producto (Oro, Petroleo, Bono). Requisito
de Karen: "cumplimiento y thank you page para mejorar conversiones" (sesion 2026-10-01, relayado por
el lead). Pregunta: que patron de post-envio maximiza conversion del siguiente paso y medicion fiable.

Decisiones a tomar:
- P1. Thank-you inline (cambio de estado en el mismo mount) vs redirect a una URL dedicada (/gracias),
  medido contra Google Ads (conversion por pagina vs por evento, enhanced conversions), Meta (Pixel +
  CAPI, deduplicacion) y GA4 (generate_lead), incluido el doble conteo al recargar.
- P2. Contenido del siguiente paso por tipo de campana: webinar (fecha/hora en zona del usuario,
  agregar al calendario, Zoom, recordatorio) vs producto (cuenta demo/real, WhatsApp, app).
- P3. Restricciones de broker regulado en el thank-you (sin promesas de rendimiento, advertencia de
  riesgo junto a un CTA de abrir cuenta).
- P4. Expectativa post-envio ("un asesor te contactara en X", email de confirmacion).
- P5. Accesibilidad del cambio de estado (anuncio del exito y foco).

Restriccion heredada: los campos y schemas del form no se tocan, solo el texto (memoria
feedback_atfx_forms_campos_fijos). Este brief no decide el popup automatico de Zoom: eso es el
bloque D4 de embed-form-submit-privacy, que sigue abierto.

Nota de fuentes: varias paginas de support.google.com se leyeron en esta corrida pero responden 404
al chequeo HEAD del linter; sus afirmaciones van en la seccion 9 con la URL y una prueba, y donde
hubo equivalente en developers.google.com se cito ese.

## 2. Estado actual

Contextos: navegador en landings de www.atfxlatam.com (widget HTML de Elementor, incluidos popups de Elementor) con GA4/GTM/Meta Pixel cargados por la pagina host, preview.html con el dev server de esbuild, runner `node --test` sobre test/ (sin DOM), CI release.yml (Node 20, typecheck + build, sin tests), backend admin-ajax + middleware + Salesforce (fuera de este repo)

- Tras un envio exitoso el motor renderiza el thank-you y reemplaza todo el contenido del mount con `replaceChildren` [repo:src/core/form-engine.ts:133]
- El reemplazo ocurre en la misma pagina, sin navegacion ni redirect [repo:src/ui/organisms/thank-you.ts:4]
- Los hooks de analitica corren antes de pintar el thank-you, con `Promise.allSettled` [repo:src/core/form-engine.ts:127]
- Los hooks solo corren si `response.success` es true; un `success:false` vuelve antes [repo:src/core/form-engine.ts:114]
- `success:true` de admin-ajax significa encolado, no lead creado en Salesforce [repo:CLAUDE.md:105]
- El hook GA4 manda `generate_lead` con `currency` y `aa_number`, sin `value` [repo:src/integrations/index.ts:16]
- El hook GTM empuja `event: "atfx_lead"` con `aa_number` al dataLayer [repo:src/integrations/index.ts:24]
- El hook Meta llama `fbq("track", "Lead")` sin parametros ni `eventID` [repo:src/integrations/index.ts:32]
- La respuesta de Elementor trae `aanumber` y tambien un `redirect_url` opcional que el motor ignora [repo:src/core/types.ts:11]
- El contenedor del thank-you se crea nuevo con `role="status"` en el mismo momento en que se inserta su contenido [repo:src/ui/organisms/thank-you.ts:13]
- El titulo del thank-you es un `h3` fijo, sin `tabindex` ni foco programatico [repo:src/ui/organisms/thank-you.ts:20]
- Si hay `zoomLink` el thank-you agrega un CTA que apunta a ese mismo enlace [repo:src/ui/organisms/thank-you.ts:33]
- El enlace documentado en el contrato es de registro de Zoom (`/webinar/register/WN_...`), no de acceso [repo:CLAUDE.md:28]
- La fecha del webinar llega como texto sin zona horaria ni offset (`2026-06-25 18:00:00`) [repo:CLAUDE.md:30]
- El titulo en espanol es "¡Registro confirmado!" para todo modo, webinar o lead simple [repo:src/i18n/index.ts:73]
- El mensaje afirma "Te enviamos un correo con los detalles de acceso" tambien en LPs de producto [repo:src/i18n/index.ts:74]
- La animacion del thank-you se omite con prefers-reduced-motion [repo:src/ui/motion.ts:16]
- Los tres hooks GA4, GTM y Meta estan registrados en la config del form lead [repo:src/forms/lead.ts:53]
- El popup de Zoom se abre en el gesto de submit y se redirige tras el exito [repo:src/core/form-engine.ts:104]
- Probar con sesion de WordPress abierta devuelve 200 con `aanumber` sin crear lead: un QA logueado ve thank-you y dispara conversiones falsas [repo:CLAUDE.md:128]

## 3. Fuentes primarias

- Google Ads ofrece dos modos de conversion web: "Page load" en la pagina de confirmacion (el default y mas comun) y "Click" en un boton o enlace [doc:https://developers.google.com/tag-platform/devguides/conversions@2026-10-01]
- La guia del Google tag pide los snippets de key event en paginas de confirmacion o de envio de form, y `transaction_id` como ID unico "para deduplicacion" [doc:https://developers.google.com/tag-platform/devguides/gtag-integration@2026-10-01]
- La misma guia describe `generate_lead` como el evento que se dispara cuando un usuario envia un form [doc:https://developers.google.com/tag-platform/devguides/gtag-integration@2026-10-01]
- Por la API de Google Ads, enhanced conversions para web puede enviar los datos hasheados hasta 24 h despues casados por order ID, en vez de al disparar el tag [doc:https://developers.google.com/google-ads/api/docs/conversions/enhanced-conversions/web-setup@2026-10-01]
- Esa guia recomienda anadir transaction IDs (order IDs) al tag de conversion para ayudar al casado [doc:https://developers.google.com/google-ads/api/docs/conversions/enhanced-conversions/web-setup@2026-10-01]
- Enhanced conversions for leads complementa conversiones offline importadas con email/telefono hasheados (SHA-256) capturados en el form, junto con el GCLID [doc:https://developers.google.com/google-ads/api/docs/conversions/upload-identifiers@2026-10-01]
- Meta deduplica Pixel y Conversions API cuando el `eventID` del Pixel coincide con el `event_id` del servidor y el nombre del evento coincide [doc:https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events@2026-10-01]
- La sintaxis del Pixel para eso es `fbq('track', evento, params, {eventID: 'EVENT_ID'})` y la ventana de deduplicacion es de 48 horas [doc:https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events@2026-10-01]
- Meta define el evento estandar Lead como "cuando se completa un registro" [doc:https://developers.facebook.com/docs/meta-pixel/reference@2026-10-01]
- WCAG 4.1.3 define un mensaje de estado como un cambio de contenido sin cambio de contexto; el exito de un envio con `role=status` es su ejemplo [doc:https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html@2.2]
- WCAG 4.1.3 excluye de su alcance los mensajes que reciben el foco [doc:https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html@2.2]
- La tecnica G199 pide feedback de exito explicito, por ejemplo "recibiras respuesta en las proximas 48 horas" [doc:https://www.w3.org/WAI/WCAG22/Techniques/general/G199@2.2]
- El tutorial de forms de WAI sugiere usar el encabezado principal y el `<title>` para comunicar el exito [doc:https://www.w3.org/WAI/tutorials/forms/notifications/@2026-10-01]
- MDN: los lectores de pantalla solo anuncian cambios dinamicos de una region viva ya registrada; crearla junto con su contenido no es fiable [doc:https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions@2026-10-01]
- MDN recomienda anadir `aria-live="polite"` redundante a `role="status"` para maxima compatibilidad [doc:https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions@2026-10-01]
- GOV.UK: una pagina de confirmacion lleva numero de referencia, que pasa despues y cuando, contacto y enlaces a lo que el usuario necesitara despues [doc:https://design-system.service.gov.uk/patterns/confirmation-pages/@2026-10-01]
- Zoom: con registro obligatorio, el enlace de acceso llega en el email de confirmacion de Zoom; el enlace de registro es otro [doc:https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0061631@2026-10-01]
- MDN: un date-time sin offset se interpreta en hora local, y formatos no estandar (con espacio) dependen del navegador [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse@2026-10-01]
- `Intl.DateTimeFormat` usa la zona del runtime si se omite `timeZone`, y `timeZoneName` imprime el nombre o el offset de la zona [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat@2026-10-01]
- RFC 5545: en valores TEXT la coma, el punto y coma, la barra invertida y el salto de linea se escapan con barra invertida [doc:https://www.rfc-editor.org/rfc/rfc5545#section-3.3.11@rfc5545]
- RFC 5545: UID debe ser globalmente unico, y la hora UTC se escribe con sufijo Z [doc:https://www.rfc-editor.org/rfc/rfc5545#section-3.3.11@rfc5545]
- El footer de ATFX usa la advertencia "HIGH RISK INVESTMENT WARNING: Trading Forex and CFDs is highly speculative, carries a high level of risk" y lista sus entidades y reguladores [doc:https://www.atfx.com/en/@2026-10-01]
- ESMA (solo UE) exige una advertencia de riesgo especifica del proveedor con el porcentaje de cuentas minoristas que pierden dinero [doc:https://www.esma.europa.eu/sites/default/files/library/esma35-43-1000_additional_information_on_the_agreed_product_intervention_measures_relating_to_contracts_for_differences_and_binary_options.pdf@ESMA35-43-1000]
- ESMA senala que bonos y beneficios de trading distraen del alto riesgo del producto, lo que toca a la LP de Bono si su entidad cae bajo esa regla [doc:https://www.esma.europa.eu/sites/default/files/library/esma35-43-1000_additional_information_on_the_agreed_product_intervention_measures_relating_to_contracts_for_differences_and_binary_options.pdf@ESMA35-43-1000]
- Secundaria: Unbounce recomienda confirmar, decir que pasa despues y ofrecer un solo siguiente paso valioso (actualizado 2024-02-01) [doc:https://unbounce.com/conversion-rate-optimization/thank-you-pages/@2024-02-01]
- Secundaria: HubSpot lista acceso a la oferta, CTA secundario y email de auto-respuesta como componentes del thank-you (actualizado 2025-06-11) [doc:https://blog.hubspot.com/blog/tabid/6307/bid/30650/the-anatomy-of-conversion-optimized-thank-you-pages.aspx@2025-06-11]

## 4. Implementaciones de referencia

- govuk-frontend (Government Digital Service, design system publico usado por los servicios del gobierno del Reino Unido, activo a 2026-10-01): `setFocus` da `tabindex=-1` temporal y enfoca el elemento [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/common/index.mjs#L43@283cc58]
- govuk-frontend enfoca su resumen al inicializarse "para el anuncio accesible", en vez de depender de una region viva [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/components/error-summary/error-summary.mjs#L25@283cc58]
- govuk-frontend usa el Panel en su variante de confirmacion por defecto, con encabezado nivel 1 configurable [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/components/panel/template.njk#L9@283cc58]
- calendar-link (AnandChowdhary, 624 estrellas, activo a 2026-09-26): arma el enlace de Google Calendar con `action=TEMPLATE` y `dates` en UTC [ref:https://github.com/AnandChowdhary/calendar-link/blob/4098452b6614e9e119dba9f5c8e78f9d31079b84/src/index.ts#L89@4098452]
- calendar-link formatea inicio y fin en UTC (`YYYYMMDDTHHmmssZ`) para Google y para .ics [ref:https://github.com/AnandChowdhary/calendar-link/blob/4098452b6614e9e119dba9f5c8e78f9d31079b84/src/index.ts#L229@4098452]

## 5. Opciones

P1, patron post-envio:

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Inline (cambio de estado en el mount) + conversiones por evento tras success:true, con aanumber como ID de deduplicacion | Recargar no re-dispara; el email esta en memoria para enhanced conversions; funciona dentro de popups de Elementor; un solo paquete sirve todas las LPs; ya existe | Ads/Meta se configuran por evento (GTM `atfx_lead`), no por URL; no hay URL a la que volver | baja | Recomendada |
| B. Redirect a /gracias por LP o por idioma | Conversion por URL sin codigo; pagina con mas espacio; URL que se puede volver a visitar | Recarga, marcador o visita directa re-disparan la conversion; hay que llevar email, fecha y zoom por query o storage; una pagina WP por campana e idioma; rompe el popup de Elementor | media | No por defecto |
| C. Inline + replaceState a una URL virtual (?gracias) | URL distinguible sin navegar | Con historial activo GA4 puede contar un page_view extra; recargar re-muestra el form, no el thank-you | media | No |

P2, contenido por tipo de campana:

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| Webinar: confirmacion + fecha/hora en zona del usuario + agregar a Google Calendar y .ics + Zoom + "que pasa despues" | Reduce inasistencia; responde la duda principal (cuando y como entro) | Requiere fecha con zona explicita; el enlace actual es de registro, no de acceso | media | Recomendada |
| Producto: confirmacion + un CTA principal (cuenta demo) + uno secundario (WhatsApp) + advertencia de riesgo junto al CTA | Un siguiente paso claro; cumple el aviso de riesgo | CTA a abrir cuenta exige texto legal aprobado | baja | Recomendada |
| Thank-you generico igual para todo | Ya existe | Promete un email de acceso en LPs de producto; sin siguiente paso | baja | No |

## 6. Evidencia en contra

- Contra A: "Page load" es el modo por defecto y mas comun de Google Ads, y los equipos de pauta suelen esperar una URL /gracias [doc:https://developers.google.com/tag-platform/devguides/conversions@2026-10-01]
- Se resuelve: el modo "Click"/evento es soportado en la misma guia, y enhanced conversions for leads casa por datos capturados en el form, que A tiene en memoria al disparar [doc:https://developers.google.com/google-ads/api/docs/conversions/upload-identifiers@2026-10-01]
- Se acepta como coste: quien configura Ads y Meta debe usar el evento de GTM `atfx_lead`, no una regla de URL [repo:src/integrations/index.ts:24]
- Contra A: GOV.UK pide permitir volver a la confirmacion, y un estado inline se pierde al recargar [doc:https://design-system.service.gov.uk/patterns/confirmation-pages/@2026-10-01]
- Se acepta: el registro durable es el email de Zoom/CRM, no la pagina; por eso P4 (email) es pregunta abierta para Karen [doc:https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0061631@2026-10-01]
- Contra disparar en el navegador: el exito es "encolado", asi que la conversion del navegador puede contar leads que nunca llegan a Salesforce [repo:CLAUDE.md:105]
- Se mitiga, no se resuelve: enhanced conversions for leads permite subir desde el CRM solo los leads que si llegaron, casados por datos hasheados y GCLID [doc:https://developers.google.com/google-ads/api/docs/conversions/upload-identifiers@2026-10-01]

## 7. Ejemplares y anti-ejemplos

- Bien: enfocar el contenedor de confirmacion con `tabindex=-1` y quitarlo al perder el foco (patron `setFocus` de GOV.UK) [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/common/index.mjs#L43@283cc58]
- Bien: Pixel con ID compartido, `fbq('track', 'Lead', {}, {eventID: aanumber})`, para que un CAPI futuro deduplique [doc:https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events@2026-10-01]
- Bien: conversion de Ads con `transaction_id` unico por envio [doc:https://developers.google.com/tag-platform/devguides/gtag-integration@2026-10-01]
- Bien: Google Calendar con `dates` en UTC terminado en Z, como hace calendar-link [ref:https://github.com/AnandChowdhary/calendar-link/blob/4098452b6614e9e119dba9f5c8e78f9d31079b84/src/index.ts#L76@4098452]
- Bien: mensaje de exito que dice que pasa despues y cuando (G199: "recibiras respuesta en las proximas 48 horas") [doc:https://www.w3.org/WAI/WCAG22/Techniques/general/G199@2.2]
- Anti-ejemplo: calendar-link "escapa" la coma reemplazandola por coma, sin barra invertida, contra RFC 5545 [ref:https://github.com/AnandChowdhary/calendar-link/blob/4098452b6614e9e119dba9f5c8e78f9d31079b84/src/index.ts#L216@4098452]
- Anti-ejemplo: calendar-link genera UID con `Math.random() * 100000`, que no es globalmente unico [ref:https://github.com/AnandChowdhary/calendar-link/blob/4098452b6614e9e119dba9f5c8e78f9d31079b84/src/index.ts#L299@4098452]
- Anti-ejemplo: `role="status"` creado junto con su contenido, como el thank-you actual [repo:src/ui/organisms/thank-you.ts:13]
- Anti-ejemplo: un texto que promete un correo de acceso en una LP de producto que no envia ninguno [repo:src/i18n/index.ts:74]
- Anti-ejemplo: Pixel `Lead` sin `eventID`, imposible de deduplicar con un evento de servidor [repo:src/integrations/index.ts:32]

## 8. Trampas

- Con redirect, cada carga de /gracias (recarga, atras, marcador) es una visita a la pagina de conversion en modo "Page load" y vuelve a contar [doc:https://developers.google.com/tag-platform/devguides/conversions@2026-10-01]
- Sin `transaction_id` esas cargas repetidas no se deduplican en Google Ads [doc:https://developers.google.com/tag-platform/devguides/gtag-integration@2026-10-01]
- Con redirect, enhanced conversions por tag necesita el email en /gracias; la alternativa sin PII en la URL es subirlo por API hasta 24 h despues con order ID [doc:https://developers.google.com/google-ads/api/docs/conversions/enhanced-conversions/web-setup@2026-10-01]
- El enlace de Zoom del contrato es de registro: el CTA "Abrir Zoom" lleva a un segundo formulario y el acceso solo llega por el email de Zoom [doc:https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0061631@2026-10-01]
- `data-webinar-date` sin zona se interpreta en la hora local de cada visitante, asi que la hora mostrada y el evento de calendario saldrian mal fuera de la zona del host [doc:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse@2026-10-01]
- El valor de `Webinar_date_time__c` que va a Salesforce no se cambia; la zona va en un atributo nuevo del mount solo para mostrar [repo:CLAUDE.md:30]
- `role="status"` creado con su contenido puede no anunciarse; mover el foco al encabezado no depende de eso [doc:https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions@2026-10-01]
- Un `success:true` es encolado: el thank-you no debe afirmar que el lead "quedo registrado en el sistema" ni prometer un contacto que el pipeline no garantiza [repo:CLAUDE.md:105]
- Un QA con sesion de WordPress abierta dispara conversiones reales en Ads y Meta sin lead en Salesforce; probar en incognito y excluir trafico interno [repo:CLAUDE.md:128]
- Un `redirect_url` configurado en la accion de Elementor llegaria en la respuesta; hoy se ignora y asi debe seguir si se elige inline [repo:src/core/types.ts:11]
- Contexto popup de Elementor: inline sigue dentro del popup; un redirect navegaria la pagina entera [repo:CLAUDE.md:40]
- Contexto `node --test`: no hay DOM, asi que foco y region viva no se prueban ahi; van al E2E de Playwright del brief embed-form-distribution [repo:test/lead-meta.test.ts:1]
- Contexto CI: release.yml no corre tests, asi que ningun criterio de este brief queda protegido en CI sin agregarlos [repo:.github/workflows/release.yml:36]
- Contexto preview.html: GA4/GTM/Pixel no estan cargados, los hooks no hacen nada por el `?.`; la medicion se verifica en una LP real con Tag Assistant y Meta Test Events [repo:src/integrations/index.ts:16]
- Una advertencia de riesgo copiada de la UE (porcentaje ESMA) no es necesariamente la que aplica a la entidad que atiende LATAM [doc:https://www.atfx.com/en/@2026-10-01]

## 9. Incertidumbre

- ASSUMPTION: GA4 cuenta cada disparo de un key event con el metodo recomendado "once per event", asi que una /gracias recargada infla GA4 (leido en support.google.com/analytics/answer/13366706, 404 al HEAD del linter). prueba: abrir esa pagina en el navegador y confirmar el texto
- ASSUMPTION: la medicion mejorada de GA4 dispara `form_submit` al enviar el form sin saber si el servidor lo acepto, asi que no debe ser key event (leido en support.google.com/analytics/answer/9216061). prueba: enviar un form invalido en una LP con DebugView y ver si aparece form_submit
- ASSUMPTION: la misma medicion mejorada, con la opcion de historial activa, cuenta page views por pushState/replaceState (support.google.com/analytics/answer/9216061). prueba: llamar history.replaceState en una LP con DebugView abierto
- ASSUMPTION: Google Ads recomienda contar "One" conversion por clic para leads (leido en support.google.com/google-ads/answer/3438531). prueba: abrir la pagina y revisar la config de la accion de conversion de ATFX
- ASSUMPTION: Google Ads advierte que recargar la pagina de conversion re-dispara el tag (leido en support.google.com/google-ads/answer/6386790). prueba: abrir la pagina en el navegador
- ASSUMPTION: GA4 recomienda `qualify_lead`, `working_lead` y `close_convert_lead` para el embudo offline (leido en support.google.com/analytics/answer/9267735). prueba: abrir la pagina, seccion lead generation
- ASSUMPTION: la politica de Google Ads solo permite anunciar CFDs a proveedores con licencia y cuenta certificada (leido en support.google.com/adspolicy/answer/2464998). prueba: confirmar con el equipo de pauta el estado de certificacion de la cuenta
- ASSUMPTION: al reemplazar el form, el boton enfocado sale del DOM y el foco cae al body. prueba: en preview.html enviar con teclado y leer `document.activeElement` tras el thank-you
- ASSUMPTION: el `aanumber` es unico por envio y el middleware lo conoce, de modo que sirve de `transaction_id` de Google Ads y de `event_id` para un CAPI futuro. prueba: dos envios seguidos en incognito, comparar aanumber en la respuesta y en el registro del middleware
- ASSUMPTION: los parametros `value`/`currency`/`lead_source` de `generate_lead` salen de un resumen de busqueda; la referencia de eventos no se pudo leer completa en esta corrida. prueba: abrir developers.google.com/analytics/devguides/collection/ga4/reference/events, pestana lead generation
- ASSUMPTION: el formato `calendar.google.com/calendar/render?action=TEMPLATE` no tiene documentacion oficial de Google localizada; se apoya en calendar-link. prueba: abrir un enlace generado en una cuenta de Google y verificar titulo, hora y zona
- ASSUMPTION: la entidad regulada que atiende LATAM no esta bajo ESMA. prueba: Compliance confirma entidad y regulador por pais de las LPs
- [NEEDS CLARIFICATION: Karen - inline (recomendado) o /gracias? Si el equipo de pauta exige URL, se puede medir igual por evento; con /gracias el doble conteo solo se evita fijando transaction_id]
- [NEEDS CLARIFICATION: Karen - alguien envia hoy un email de confirmacion tras el form (middleware, Salesforce, Zoom)? El copy actual lo promete en todo modo]
- [NEEDS CLARIFICATION: Karen - el lead queda inscrito en Zoom automaticamente o debe registrarse otra vez en el enlace WN_? Define si el CTA es "Completa tu registro en Zoom" o "Abrir Zoom"]
- [NEEDS CLARIFICATION: Karen - hay SLA real de contacto de un asesor (tiempo y canal)? Sin SLA el texto no promete plazo]
- [NEEDS CLARIFICATION: Karen/Compliance - texto exacto de la advertencia de riesgo por entidad y si una LP de Bono puede mostrar el bono en el thank-you]
- [NEEDS CLARIFICATION: Karen - URL de cuenta demo, de cuenta real, numero de WhatsApp y enlaces de app por pais/idioma; y si hay o habra Conversions API en el middleware]
- [NEEDS CLARIFICATION: Karen - se manda email/telefono a enhanced conversions? Depende de la base de consentimiento del bloque D3 de embed-form-submit-privacy]

## 10. Checklist de estandar

- [ ] Tras `success:true` el form se reemplaza inline; no hay navegacion ni uso de `redirect_url`.
- [ ] GA4 `generate_lead`, GTM `atfx_lead` y Meta `Lead` se disparan una sola vez por envio exitoso y nunca ante `success:false` o error de red (test con fetch simulado).
- [ ] Recargar la pagina despues del thank-you no dispara ningun evento de conversion (E2E).
- [ ] El `aanumber` viaja como `transaction_id` (Ads), `eventID` (Pixel) y en el push de dataLayer; si falta, el evento sale sin ID y no se inventa uno.
- [ ] El foco pasa al encabezado del thank-you (`tabindex=-1`) al mostrarse; un lector de pantalla lo anuncia (verificado con VoiceOver).
- [ ] La region de exito no depende solo de un `role="status"` creado en el mismo tick que su texto.
- [ ] Modo webinar: muestra tema, fecha y hora formateadas con `Intl.DateTimeFormat` en la zona del usuario con `timeZoneName`, a partir de una fecha con zona explicita.
- [ ] Modo webinar: ofrece "Agregar a Google Calendar" y descarga .ics con DTSTART/DTEND en UTC (Z), TEXT escapado segun RFC 5545 y UID unico.
- [ ] Modo webinar: el texto del CTA de Zoom corresponde al tipo de enlace (registro o acceso) que Karen confirme.
- [ ] Modo producto: un CTA principal y como maximo uno secundario; ningun texto promete rendimiento ni ganancias.
- [ ] Todo CTA de abrir cuenta lleva junto la advertencia de riesgo aprobada por Compliance, en el idioma del form.
- [ ] El thank-you no promete un email ni un plazo de contacto que no este confirmado por Karen.
- [ ] Copy del thank-you por modo (webinar/producto) en es, en y pt; los campos y hidden enviados a Salesforce no cambian.
- [ ] La animacion del thank-you respeta prefers-reduced-motion (se conserva).

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | Measure conversions and key events | Google | 2026-10-01 | 2026-10-01 | high |
| 2 | Integrate the Google tag into your CMS or website builder | Google | 2026-10-01 | 2026-10-01 | high |
| 3 | Enhanced conversions for web (Google Ads API) | Google | 2026-10-01 | 2026-10-01 | high |
| 4 | Enhanced conversions for leads (Google Ads API) | Google | 2026-10-01 | 2026-10-01 | high |
| 5 | Deduplicate Pixel and Server Events | Meta for Developers | 2026-10-01 | 2026-10-01 | high |
| 6 | Meta Pixel reference (standard events) | Meta for Developers | 2026-10-01 | 2026-10-01 | high |
| 7 | Understanding SC 4.1.3 Status Messages | W3C WAI | WCAG 2.2 | 2026-10-01 | high |
| 8 | G199 Providing success feedback | W3C WAI | WCAG 2.2 | 2026-10-01 | high |
| 9 | Forms tutorial: User notifications | W3C WAI | 2026-10-01 | 2026-10-01 | high |
| 10 | ARIA live regions | MDN | 2026-10-01 | 2026-10-01 | high |
| 11 | Confirmation pages pattern | GOV.UK Design System | 2026-10-01 | 2026-10-01 | high |
| 12 | Scheduling a webinar with registration | Zoom Support | 2026-10-01 | 2026-10-01 | high |
| 13 | Date.parse() | MDN | 2026-10-01 | 2026-10-01 | high |
| 14 | Intl.DateTimeFormat() constructor | MDN | 2026-10-01 | 2026-10-01 | high |
| 15 | RFC 5545 iCalendar | IETF | RFC 5545 | 2026-10-01 | high |
| 16 | ATFX home footer (risk warning) | ATFX | 2026-10-01 | 2026-10-01 | medium |
| 17 | Additional information on product intervention measures (CFDs) | ESMA | ESMA35-43-1000, 2018-03-27 | 2026-10-01 | high |
| 18 | Thank you pages examples | Unbounce | 2024-02-01 | 2026-10-01 | low |
| 19 | Anatomy of conversion-optimized thank you pages | HubSpot | 2025-06-11 | 2026-10-01 | low |
| 20 | govuk-frontend | alphagov | 283cc58 | 2026-10-01 | high |
| 21 | calendar-link | AnandChowdhary | 4098452 | 2026-10-01 | medium |
| 22 | Google Ads / GA4 Help (6386790, 3438531, 9267735, 13366706, 9216061, adspolicy 2464998) | Google | 2026-10-01 | 2026-10-01 | medium (no resuelven al linter) |
