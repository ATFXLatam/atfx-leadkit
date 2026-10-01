# docs-v2-handoff

Fecha: 2026-10-01  
Rol de esta sesión: editor del spec (sin cambios en `src/` ni configs raíz).

## Archivos tocados

- `docs/research/forms-v2-distribution.md` (copia literal desde `atfx-forms`)
- `docs/research/forms-v2-thank-you.md` (copia literal desde `atfx-forms`)
- `docs/research/forms-v2-campaign-expiry.md` (copia literal desde `atfx-forms`)
- `docs/research/INDEX.md`
- `docs/specs/00-programa.md`
- `docs/specs/01-requisitos.md`
- `docs/specs/02-decisiones.md`
- `docs/specs/04-arquitectura.md`
- `docs/specs/sessions/s01-tooling.md`
- `docs/specs/sessions/s03-atributos.md`
- `docs/specs/sessions/s10-caducidad-cliente.md`
- `docs/specs/sessions/s11-thank-you.md`
- `docs/specs/sessions/s14-distribucion-ci.md`
- `docs/specs/sessions/s15-servidor.md`
- `docs/review/docs-v2-handoff.md`

## Resumen por archivo

- `docs/research/INDEX.md`: se agregaron 3 filas nuevas (`forms-v2-distribution`, `forms-v2-thank-you`, `forms-v2-campaign-expiry`) con estado `ESCALADO`.
- `docs/specs/01-requisitos.md`:
  - RF-05 actualizado con `data-opens-at`, `data-closes-at`, `data-closed-url` y `data-webinar-tz`.
  - RF-14 actualizado para conversiones solo tras `success:true` y uso de `aanumber` como ID.
  - RF-20/RF-21 actualizados a validación estricta con offset, cierre en `now >= closesAt`, chequeo en mount + submit.
  - RF-23/RF-24 reescritos para thank-you inline, variantes webinar/producto, foco y región de estado.
  - RNF-01 actualizado a archivo JS autocontenido por formulario.
  - CA-19..CA-22 actualizados a la nueva semántica de caducidad/accesibilidad.
- `docs/specs/02-decisiones.md`:
  - D-13, D-14, D-16, D-18 y D-19 actualizadas en default/fuente.
  - D-15 actualizada en fuente.
  - Se agregaron D-21..D-32 en estado `PENDIENTE`.
- `docs/specs/04-arquitectura.md`:
  - se incorporó distribución autocontenida por formulario (CSS dentro del JS, inyección única).
  - `MountAttrs` migrado a `opensAt`/`closesAt`, más `closedUrl` y `webinarTz`.
- `docs/specs/00-programa.md`:
  - se actualizaron descripciones y decisiones bloqueantes de s1, s3, s10, s11, s12, s14 y s15.
- `docs/specs/sessions/s01-tooling.md`:
  - actualizado a build sin `.css` separado; CSS importado como texto e inyectado una sola vez.
- `docs/specs/sessions/s03-atributos.md`:
  - actualizado a `data-opens-at`/`data-closes-at`, `data-closed-url`, `data-webinar-tz` y validaciones.
- `docs/specs/sessions/s10-caducidad-cliente.md`:
  - reescritura completa con API, reglas, RED y criterios sobre caducidad cliente.
- `docs/specs/sessions/s11-thank-you.md`:
  - reescritura completa con thank-you inline, conversiones post `success:true`, accesibilidad, webinar/producto, calendar links e `.ics`.
- `docs/specs/sessions/s14-distribucion-ci.md`:
  - reescritura completa con `ci.yml`, `release.yml`, permisos mínimos, actions por SHA, release por PR, trusted publishing y SRI por archivo.
- `docs/specs/sessions/s15-servidor.md`:
  - reescritura completa a mu-plugin en `elementor_pro/forms/validation`, opciones descartadas y riesgo aceptado del `referrer` falsificable.

## Decisiones nuevas agregadas (todas `PENDIENTE`)

- D-21: período de gracia al cierre.
- D-22: fin único o por país.
- D-23: dónde y quién carga la fecha de fin en servidor.
- D-24: cuándo cierra el registro de webinar.
- D-25: uso de `data-webinar-tz`.
- D-26: confirmar si existe email post-envío.
- D-27: URLs de demo/real/WhatsApp/app por país e idioma.
- D-28: enhanced conversions con email/teléfono (condicionado por consentimiento).
- D-29: scope/organización npm y quién publica.
- D-30: pin por sitio vs por campaña.
- D-31: ruta/bucket Cloudflare fase 2.
- D-32: archivado de `at_forms` y `atfx-forms-newAug26`.

## Inconsistencias detectadas y no resueltas

- El brief copiado `forms-v2-distribution.md` incluye un ejemplo de mount con `data-atfx-form-mount`, mientras el spec vigente usa `data-atfx-leadkit` (D-04).  
  Estado: no se editó el brief (copia literal solicitada); inconsistencia documentada para decisión de Karen.
- `data-webinar-date` sigue siendo `YYYY-MM-DD HH:mm:ss` sin zona en el contrato legado, pero el thank-you requiere representar zona correctamente.  
  Estado: se agregó `data-webinar-tz` como atributo de presentación; falta cierre de D-25.
- Quedan abiertas las decisiones de negocio/operación (D-21..D-32), por lo que s10/s11/s14/s15 siguen bloqueadas en programa.

## Cumplimiento

Cambios aplicados:
- Se copió `docs/research/forms-v2-compliance.md` desde `atfx-forms` y se agregó su fila en `docs/research/INDEX.md` (`ESCALADO`).
- `docs/specs/sessions/s12-cumplimiento.md` se reescribió completa con C1..C4: checkbox único desmarcado, prueba de consentimiento por versión de texto, bloque legal bajo botón, WCAG 2.2 AA y alcance anti-abuso cliente/servidor.
- `docs/specs/01-requisitos.md` se actualizó en RF-17 y RF-18, y se añadieron CA-25..CA-32 (consentimiento, enlace privacidad, bloque legal, aviso CVM en `pt`, llaves legales y versionado de consentimiento).
- `docs/specs/sessions/s07-ui.md` se ajustó para render de consentimiento con link de privacidad fuera del `label`.
- `docs/specs/02-decisiones.md` se actualizó en D-05, D-06, D-17 y D-20; se agregaron D-33..D-38 en `PENDIENTE`.

Inconsistencias / pendientes detectados:
- D-06 sigue bloqueada: opt-in de marketing separado exige campo nuevo y hoy rompe el contrato de campos.
- D-33 pendiente: falta definir si la licencia pública será `C113012295`, `C118023331` o ambas.
- D-34 pendiente: falta texto legal final de advertencia de riesgo y definición de porcentaje (si aplica).
- D-35 pendiente: falta texto oficial en portugués para aviso Levycam/CVM.
- D-36 pendiente: falta confirmar si la política de privacidad MU cubre prospectos (no solo clientes).
- D-37 pendiente: faltan plazos y responsables de retención en WordPress/middleware/Salesforce.
- D-38 pendiente: falta cerrar si Turnstile se implementa en servidor y bajo qué esquema operativo.
