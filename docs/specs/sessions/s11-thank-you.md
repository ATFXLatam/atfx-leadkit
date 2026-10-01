# s11 — Thank-you

Estado: BLOQUEADA (D-16). Depende de: s9.
Brief: `docs/research/forms-v2-thank-you.md` (en curso). El contenido final y la elección inline
vs redirect salen de ahí; esta sesión se reescribe cuando D-16 esté aprobada.

## Ya decidido por los requisitos

- RF-24: el éxito se anuncia con `role="status"` y el foco va al título del thank-you (CA-22).
- Variantes: `webinar` (con link de Zoom) y `producto` (sin link).
- Ningún texto promete rendimientos; si hay CTA a abrir cuenta, va con advertencia de riesgo
  (s12 provee el texto).

## Archivos previstos

- `src/ui/thank-you.ts`
- `src/ui/thank-you.test.ts`
- (según D-16) `src/core/calendar.ts` para el archivo `.ics` / link de Google Calendar.
