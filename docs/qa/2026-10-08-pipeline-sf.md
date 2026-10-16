# Prueba del pipeline admin-ajax -> Salesforce (2026-10-08)

Objetivo: saber qué variantes del payload crean el lead en Salesforce y si `OwnerId__c` asigna
el lead al BDM (Ergin Erdemir, `005T1000007FdqZIAS`). Autorizada por Karen. Todos los envíos van a
producción (`https://www.atfxlatam.com/wp-admin/admin-ajax.php`) sin sesión de WordPress.

Criterio: el pipeline es asíncrono por lotes (atfx-forms CLAUDE.md, hallazgos del 15 jun 2026).
`success:true` + `aanumber` = encolado en WordPress, no = lead en SF. Se revisa a los 40 minutos
del último envío. Los emails llevan "test", así que SF los marca `Is_Test_Account__c=true`.

## Esquema común

Transporte: `POST`, `multipart/form-data`, headers `X-Requested-With: XMLHttpRequest`,
`Origin: https://www.atfxlatam.com`, `Referer` = `referrer`.

| Llave | Valor |
|---|---|
| `action` | `elementor_pro_forms_send_form` |
| `post_id` / `form_id` / `queried_id` | `593` / `36ed025` / `591` |
| `referrer` | `https://www.atfxlatam.com/es/atpokernightoct2026/` |
| `referer_title` | `Poker Night: de la mesa de poker a los mercados \| ATFX` |
| `form_fields[first_name]`, `[last_name]`, `[email]` | por caso |
| `form_fields[dialling_code]` | `52` |
| `form_fields[phone]` | `55` + 8 dígitos aleatorios |
| `form_fields[country_of_residence]` | `MEX` |
| `form_fields[Trading_Experience__c]` | `Principiante` |
| `form_fields[field_8f8f3d5]` | `on` |
| `form_fields[Entity__c]` | `MU` |
| `form_fields[Demo_Account_Balance__c]` | `50000` |
| `form_fields[Demo_Account_Leverage__c]` | vacío |
| `form_fields[Email_language_lead__c]` | `ESP` |
| `form_fields[Landing_Page_Language__c]` | `esp` |

## Casos (cada uno cambia un factor respecto del esquema común)

| Id | Qué prueba | Diferencia con el esquema común |
|---|---|---|
| B0 | form leadkit real desde incógnito | navegador; `lead_source=Website`, `OwnerId__c=Ergin` |
| B1 | payload leadkit + owner | `lead_source=Website`, `OwnerId__c=Ergin` |
| B2 | payload leadkit sin owner | `lead_source=Website` |
| A1 | legacy v1.0.12 por defecto | ninguna (sin `lead_source`, sin owner) |
| A2 | legacy modo webinar | `lead_source=Webinar` + `Webinar_venue_zoom_link__c`, `Webinar_topic__c`, `Webinar_date_time__c`, `Comment` |
| C1 | legacy con BDM | `OwnerId__c=Ergin` |
| C2 | otro lead_source + BDM | `lead_source=Customer Event`, `OwnerId__c=Ergin` |
| E1 | landing legacy que funcionaba | `referrer=https://www.atfxlatam.com/es/training-sessions-25jun/`, su `referer_title` |
| F1 | otro dominio de email | email `@hotmail.com` |
| N1 | control negativo | cuerpo `x-www-form-urlencoded` (roto antes de v1.0.11) |
| N2 | control negativo | multipart sin `X-Requested-With` |

## Resultados

Envío en UTC. "Llegó" y "Owner" se llenan al revisar en SF.

| Id | Nombre | Email | Enviado | HTTP | success | aanumber | Llegó | Owner |
|---|---|---|---|---|---|---|---|---|
| B0 | Carlos Mendoza Ruiz | test123456@gmail.com | ~16:00 | 200 | true | (no capturado) | no (17:09) | - |
| B1 | Andres Villalobos Ortega | test123458@gmail.com | ~16:12 | 200 | true | wp20261008198063 | no (17:09) | - |
| B2 | Mariana Quiroga Salinas | test123459@gmail.com | ~16:12 | 200 | true | wp20261008726616 | no (17:09) | - |
| A1 | Valeria Ibarra Soto | test123460@gmail.com | 16:27:46 | 200 | true | wp20261008664288 | no (17:09) | - |
| A2 | Rodrigo Paredes Luna | test123461@gmail.com | 16:27:55 | 200 | true | wp20261008482028 | no (17:09) | - |
| C1 | Fernanda Castillo Nava | test123462@gmail.com | 16:28:03 | 200 | true | wp20261008438557 | no (17:09) | - |
| C2 | Diego Salazar Rivas | test123463@gmail.com | 16:28:10 | 200 | true | wp20261008892120 | no (17:09) | - |
| E1 | Lucia Herrera Campos | test123464@gmail.com | 16:28:17 | 200 | true | wp20261008847521 | no (17:09) | - |
| F1 | Jorge Medina Fuentes | test123465@hotmail.com | 16:28:23 | 200 | true | wp20261008935138 | no (17:09) | - |
| N1 | Paola Reyes Aguilar | test123466@gmail.com | 16:28:29 | 200 | true | wp20261008733902 | no (17:09) | - |
| N2 | Ivan Cordero Pena | test123467@gmail.com | 16:28:35 | 200 | true | wp20261008737666 | no (17:09) | - |

| G1 | Sofia Navarro Gil | pokernight.a1@debugtest.com | 17:10:36 | 200 | true | wp20261008642685 | no (17:51) | - |
| G2 | Tomas Bravo Lira | pokernight.c1@debugtest.com | 17:10:43 | 200 | true | wp20261008288904 | no (17:51) | - |

Revisión 1 (17:09 UTC, 40 min después): ninguno de los 11 aparece en la búsqueda de Leads
(`test1234*`, 0 resultados). La misma búsqueda sí devuelve 11 leads `@debugtest.com` de junio,
así que el usuario de Karen ve leads de prueba: no es visibilidad.

Casos agregados tras la revisión 1 (mismo esquema, dominio que llegaba en junio):

| Id | Qué prueba | Diferencia con el esquema común |
|---|---|---|
| G1 | ¿el bloqueo es el email gmail con "test"? | email `@debugtest.com` |
| G2 | idem + owner | email `@debugtest.com`, `OwnerId__c=Ergin` |

Revisión 2: a partir de 17:51 UTC.

## Lectura esperada

- Llegan A1 y no B2: el `lead_source=Website` fijo de leadkit rompe algo (legacy no lo mandaba).
- Llegan C1/C2 con owner Ergin: `OwnerId__c` funciona; si llegan con otro owner, no está mapeado.
- Llega E1 y no A1: el pipeline filtra por `referrer` (landing nueva no registrada).
- N1/N2 llegan: los fixes de v1.0.11 ya no son necesarios. No llegan: confirma que siguen siéndolo.
- No llega ninguno: el pipeline está caído o descarta emails con "test"; repetir con un email sin "test".

Revisión 2 (17:51 UTC): G1 y G2 no llegaron; la búsqueda `debugtest.com` sigue en los mismos 11
leads de junio. El dominio que llegaba en junio tampoco crea leads hoy.

Ronda karentest (17:23 UTC, `karentest01..08@gmail.com`, todos `success:true` con aanumber):
K1 legacy por defecto, K2 webinar, K3 owner Ergin, K4 payload leadkit, K5 Perú (+51/PER),
K6 idioma inglés, K7 experiencia Intermedio, K8 referrer con UTMs.

Patrón de los leads que sí llegaron (vista "All Lead", Created Date desc): el más reciente es del
4 oct 2026 21:15; todos con owner `mamit` y UTM `mx_atfx_retail_*_masteraccreg` (LPs Oro, Petróleo,
Bono). Desde entonces el usuario de Karen no ve ningún lead nuevo.

Conclusión: ninguna variante del payload (incluido el esquema exacto de atfx-forms v1.0.12 y el
referrer de una landing legacy) crea leads visibles hoy. El fallo está en el pipeline
WordPress -> Salesforce o en la visibilidad, no en el form. Escalar a CRM/IT con los aanumber de
esta tabla. Mientras tanto la Poker Night guarda los leads en Google Sheets (PR #5 de
AT_PokerNight_Oct2026).
