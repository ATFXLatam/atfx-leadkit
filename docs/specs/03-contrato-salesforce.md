# Contrato con WordPress / Salesforce

Fuente: código en producción de `at_forms` v1.0.12 (`src/forms/lead.ts`, `src/index.ts`,
`src/i18n/index.ts`, `src/core/submit-elementor.ts`) y hallazgos verificados en
`atfx-forms/CLAUDE.md` (15-16 jun 2026). Regla de Karen: las llaves y valores que llegan a
Salesforce no se modifican (memoria `feedback_atfx_forms_campos_fijos`).

Este documento es la verdad del payload. La sesión s2 lo convierte en tests golden; desde ahí,
cualquier diff en el payload rompe CI.

## Transporte

| Aspecto | Valor | Por qué |
|---|---|---|
| Método | `POST` | — |
| URL | `/wp-admin/admin-ajax.php` (mismo origen de la landing) | admin-ajax solo acepta `Origin: https://www.atfxlatam.com` |
| Cuerpo | `FormData` (multipart, el navegador pone el boundary) | Con `x-www-form-urlencoded` WordPress responde 200 pero no dispara la acción de Salesforce (fix v1.0.11) |
| Header | `X-Requested-With: XMLHttpRequest` | Sin él, la acción de Salesforce se salta en silencio (fix v1.0.11) |
| Credenciales | por defecto (same-origin) | — |

## Campos de nivel superior

| Llave | Valor | Notas |
|---|---|---|
| `action` | `elementor_pro_forms_send_form` | fijo |
| `post_id` | `593` | identifica el widget de Elementor con la acción de SF; igual en todas las landings |
| `form_id` | `36ed025` | idem |
| `queried_id` | `591` | idem |
| `referrer` | `location.href` completo (con query string) | se convierte en `Landing_Page_Id__c`; de ahí SF parsea `utm_*__c` |
| `referer_title` | `document.title` recortado; si vacío, `ATFX LATAM` | WordPress lo usa en notificaciones internas |

## `form_fields[...]` que llena la persona

| Llave | Valor enviado | Validación (s4) |
|---|---|---|
| `form_fields[first_name]` | texto recortado | 2-60 caracteres (máximo: ver decisión D-08) |
| `form_fields[last_name]` | texto recortado | 2-80 |
| `form_fields[email]` | email recortado | formato email, máximo 254 |
| `form_fields[dialling_code]` | código tal como está en la lista (`52`, `1-242`, `358-18`) | debe existir en la lista de prefijos |
| `form_fields[phone]` | dígitos y `( ) # & * - = .` | 6-20 caracteres; sin `+` inicial (el prefijo va aparte); espacios se eliminan antes de validar |
| `form_fields[country_of_residence]` | ISO3 (`MEX`, `COL`, `BRA`…) | debe existir en la lista de países |
| `form_fields[Trading_Experience__c]` | form `lead`: `Principiante` \| `Intermedio` \| `Avanzado`. Form `interest`: `Abrir cuenta` \| `Copytrade` \| `IB Program` | enum cerrado; mismo valor en los tres idiomas, solo cambia la etiqueta |
| `form_fields[field_8f8f3d5]` | `on` si está marcado; la llave se omite si no | obligatorio (ver D-05 sobre el valor por defecto) |

## `form_fields[...]` ocultos

| Llave | Valor | Cuándo |
|---|---|---|
| `form_fields[Entity__c]` | `MU` | siempre (el middleware lo sobrescribe a `GM`; se manda por paridad) |
| `form_fields[Demo_Account_Balance__c]` | `50000` | siempre (ver D-09) |
| `form_fields[Demo_Account_Leverage__c]` | cadena vacía | siempre (ver D-09) |
| `form_fields[Email_language_lead__c]` | `ESP` \| `ENG` \| `PTG` | según idioma resuelto |
| `form_fields[Landing_Page_Language__c]` | `esp` \| `en` \| `pt` | según idioma resuelto |
| `form_fields[lead_source]` | valor del picklist | ver abajo |
| `form_fields[OwnerId__c]` | Id de usuario SF (`005` + 12 o 15 alfanuméricos) | solo si el atributo es válido; si no, la llave se omite |
| `form_fields[Webinar_venue_zoom_link__c]` | link de Zoom validado | solo en modo webinar |
| `form_fields[Webinar_topic__c]` | texto, máximo 120 | solo en modo webinar y si hay atributo |
| `form_fields[Webinar_date_time__c]` | `YYYY-MM-DD HH:mm:ss` | solo en modo webinar y si hay atributo |
| `form_fields[Comment]` | `Webinar Topic: <t> \| Webinar Date & Time: <d> \| Webinar Zoom Link: <z>` (partes ausentes se omiten; el link siempre va) | solo en modo webinar |

### `lead_source`

Picklist leído en la UI de SF el 2026-09-29: `Advertisement`, `Customer Event`,
`Employee Referral`, `Google AdWords`, `Other`, `Partner`, `Purchased List`, `Trade Show`,
`Webinar`, `Website`, `CS`.

Regla: si `data-lead-source` está en el picklist (coincidencia exacta), se usa. Si no:
`Webinar` cuando hay link de Zoom válido, `Website` en otro caso. Un valor fuera del picklist
emite un `console.warn` sin datos personales.

## Ninguna otra llave

El payload se construye desde datos, **no serializando el DOM**. Un input que otro script del
host agregue dentro del `<form>` no se envía.

## Respuesta de admin-ajax

```ts
{ success: boolean;
  data: { message?: string; errors?: Record<string, string>;
          data?: { aanumber?: string; redirect_url?: string; usertype?: string } } }
```

- `success: true` significa **encolado** en WordPress, no que el lead exista en SF.
- Las llaves de `errors` vienen como nombres de campo de Elementor (`first_name`, etc.).
- La respuesta se valida con schema (s5). Lo que no cumpla el schema es "resultado desconocido".

## Códigos de idioma

| `data-lang` (normalizado) | `Email_language_lead__c` | `Landing_Page_Language__c` |
|---|---|---|
| `es`, `es-*` | `ESP` | `esp` |
| `en`, `en-*` | `ENG` | `en` |
| `pt`, `pt-*` | `PTG` | `pt` |
| otro o ausente | `ESP` | `esp` |
