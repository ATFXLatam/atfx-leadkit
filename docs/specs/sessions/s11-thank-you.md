# s11 — Thank-you inline y conversiones

Estado: BLOQUEADA (D-16, D-24, D-25, D-26, D-27, D-28). Depende de: s9.
Brief: `docs/research/forms-v2-thank-you.md` (ESCALADO).

## Objetivo

Implementar thank-you inline (sin `/gracias`) con dos variantes (`webinar` y `producto`), asegurar
accesibilidad del cambio de estado y estandarizar medición de conversiones solo en éxito real de
cliente (`success:true`), usando `aanumber` como identificador de deduplicación.

## Archivos

- `src/ui/thank-you.ts`
- `src/ui/thank-you.test.ts`
- `src/core/calendar.ts`
- `src/core/analytics.ts`
- `src/core/controller.ts`

## API

```ts
export interface ThankYouContext {
  readonly form: FormKey;
  readonly lang: Lang;
  readonly zoomLink: string | null;
  readonly webinarTopic: string | null;
  readonly webinarDate: string | null;
  readonly webinarTz: string | null; // IANA, solo display
  readonly aanumber?: string;
}

export function ensureStatusRegion(container: HTMLElement): HTMLElement;
// Crea/retorna la región role="status" antes de cambiar su texto.

export function renderThankYou(container: HTMLElement, ctx: ThankYouContext): void;
// Reemplazo inline del mount con foco al heading.

export function buildGoogleCalendarUrl(input: WebinarEvent): string;
export function buildIcsFile(input: WebinarEvent): { readonly fileName: string; readonly content: string };
```

## Reglas

- Default de D-16: thank-you inline en el mismo mount; nunca redirect a `/gracias`.
- Conversiones (GA4/GTM/Meta) solo tras `success:true`.
- Si hay `aanumber`, mapear:
  - Google Ads: `transaction_id = aanumber`
  - Meta Pixel: `eventID = aanumber`
  - `dataLayer`: incluir `aanumber` en el push `atfx_lead`.
- Si no hay `aanumber`, no inventar ID.
- Accesibilidad:
  - Registrar región de estado antes del cambio de texto.
  - Encabezado del thank-you con `tabindex="-1"` y foco programático inmediato.
- Variante webinar:
  - Mostrar tema.
  - Mostrar fecha en zona del usuario con `Intl.DateTimeFormat` + `timeZoneName`.
  - `data-webinar-tz` (IANA) se usa solo para interpretar/mostrar; no altera `Webinar_date_time__c`.
  - CTA "Agregar a Google Calendar".
  - Descarga `.ics` con UTC en `Z`, escape RFC 5545 en campos TEXT, y `UID` único sin `Math.random`
    (usar `crypto.randomUUID()` o ID derivado de `aanumber` cuando exista).
  - CTA de Zoom aclarando que es enlace de registro.
- Variante producto:
  - Un CTA principal y máximo uno secundario.
  - Todo CTA de abrir cuenta lleva advertencia de riesgo junto al CTA (texto legal provisto por s12).
- Copy:
  - No prometer "te enviamos un correo" ni SLA de contacto hasta cerrar D-26.

## Tests primero (RED)

- `renderThankYou`:
  - crea/reutiliza región `role="status"` antes de actualizar texto.
  - mueve foco al heading con `tabindex="-1"`.
- Conversiones:
  - con `success:true` se disparan integraciones.
  - con `success:false`/`unknown` no se disparan.
  - si hay `aanumber`, se mapea a `transaction_id`, `eventID`, `dataLayer`.
- Variante webinar:
  - renderiza tema, fecha/hora formateadas y nombre de zona (`timeZoneName`).
  - genera URL de Google Calendar con timestamps UTC.
  - genera `.ics` válido: `DTSTART/DTEND` en `Z`, `UID` único, escapes RFC 5545.
  - CTA de Zoom contiene texto de registro.
- Variante producto:
  - respeta máximo de un CTA secundario.
  - CTA de abrir cuenta incluye advertencia de riesgo.
- Regresión:
  - recargar página tras thank-you no dispara conversiones nuevas (E2E s13).

## Criterios de aceptación de la sesión

- Cubre RF-14, RF-23, RF-24 y CA-22 de `01-requisitos.md`.
- No hay ruta `/gracias` ni dependencia de pageview para conversión.
- El flujo webinar queda completo (fecha legible, calendar links, CTA Zoom de registro).
- El flujo producto no excede 2 CTAs y respeta advertencia de riesgo.
