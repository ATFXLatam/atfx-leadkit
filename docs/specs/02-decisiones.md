# Decisiones

Cada decisión tiene un default propuesto con su fuente. Las sesiones que dependen de una decisión
PENDIENTE están BLOQUEADAS en `00-programa.md`. Solo Karen cambia el estado a APROBADA o
RECHAZADA (o la reescribe).

| ID | Decisión | Default propuesto | Fuente | Bloquea | Estado |
|---|---|---|---|---|---|
| D-01 | Nombre y ruta del repo | `atfx-leadkit` en `/Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit` | Karen, sesión 2026-10-01 | s0 | APROBADA |
| D-02 | Dependencias de runtime | `zod` (v3.25, ya usado; permite `zod/v4/mini` sin dependencia nueva). **Sin GSAP**: animación con CSS | `research/embed-form-submit-privacy.md` D1; `research/embed-form-runtime.md` decisión 3 | s0 | PENDIENTE |
| D-03 | Dependencias de desarrollo | `typescript`, `esbuild` (>= 0.25, por GHSA-67mh-4wv8-2f99), `vitest`, `@vitest/coverage-v8`, `jsdom`, `@playwright/test` | `research/embed-form-distribution.md`; audit CN-005 | s0 | PENDIENTE |
| D-04 | Contrato de montaje | `<div data-atfx-leadkit="lead">` + atributos `data-*` (no custom element). Nombre del atributo nuevo para no chocar con el paquete viejo | `research/embed-form-runtime.md` decisión 1 | s3 | PENDIENTE |
| D-05 | Checkbox de aceptación por defecto | desmarcado | `research/embed-form-submit-privacy.md` D3 (GDPR cons. 32, EDPB 05/2020, ANPD). LFPDPPP acepta tácito: decisión legal | s7 | PENDIENTE (Legal) |
| D-06 | Consentimiento de marketing separado de términos | pendiente del brief `forms-v2-compliance` | `research/forms-v2-compliance.md` | s12 | PENDIENTE (Legal) |
| D-07 | Reintentos del envío | cero automáticos; timeout, red caída o respuesta no válida = "resultado desconocido" con reintento manual que avisa de posible duplicado | `research/embed-form-submit-privacy.md` D2 (RFC 9110 9.2.2, ky, Stripe) | s6 | PENDIENTE |
| D-08 | Límites de longitud y listas cerradas | se aplican en cliente; no cambian llaves ni valores enviados, solo rechazan entradas inválidas. Confirmar que no viola "campos intocables" | verificador de `embed-form-submit-privacy` (contradicción A6) | s5 | PENDIENTE |
| D-09 | `Demo_Account_*` y `Entity__c` | se siguen enviando igual (paridad) | contrato | s2 | PENDIENTE |
| D-10 | Selector de país y prefijo | `<select>` nativo con `autocomplete` (`country`, `tel-country-code`); sin combobox con búsqueda | `research/embed-form-runtime.md` decisión 4 | s7 | PENDIENTE |
| D-11 | Geo-IP | sin terceros. País desde un atributo que pone el servidor (`data-country` con `CF-IPCountry`) o nada. Terceros solo con consentimiento | `research/embed-form-submit-privacy.md` geo | s9 | PENDIENTE |
| D-12 | Popup de Zoom | se mantiene abrir en el gesto de submit, solo `https://*.zoom.us`, `opener = null`, CTA de respaldo | `research/embed-form-submit-privacy.md` D4 | s8 | PENDIENTE |
| D-13 | Distribución | pendiente del brief `forms-v2-distribution` | `research/forms-v2-distribution.md` | s14 | PENDIENTE |
| D-14 | Caducidad de campañas: capa cliente + capa servidor | pendiente del brief `forms-v2-campaign-expiry` | `research/forms-v2-campaign-expiry.md` | s10, s15 | PENDIENTE |
| D-15 | Leads que llegan después del cierre | rechazar (default) vs aceptar marcados | brief de caducidad | s15 | PENDIENTE (negocio) |
| D-16 | Thank-you: inline vs redirect a `/gracias`; contenido por tipo de campaña | pendiente del brief `forms-v2-thank-you` | `research/forms-v2-thank-you.md` | s11 | PENDIENTE |
| D-17 | Avisos regulatorios en el form (riesgo CFD, CVM Brasil, entidad, links legales) | pendiente del brief de cumplimiento; textos los firma Legal | `research/forms-v2-compliance.md` | s12 | PENDIENTE (Legal) |
| D-18 | Visibilidad del repo y protección de ramas | público o plan que permita rulesets; `main` y `v*` protegidos; PR obligatorio | `research/embed-form-distribution.md` | s0, s14 | PENDIENTE |
| D-19 | Presupuesto de peso | ≤ 20 KB brotli por bundle de formulario (JS + CSS) | audit de performance (sin GSAP ni Zod completo ~11 KB) | s13 | PENDIENTE |
| D-20 | Anti-abuso | honeypot en cliente (s7). Turnstile/rate limit son del servidor: fuera de este repo, se escala a IT | audit CN-009 | — | PENDIENTE |
