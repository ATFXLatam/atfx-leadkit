# s15 — Caducidad y anti-abuso del lado del servidor

Estado: BLOQUEADA (D-14, D-15, D-20, D-21, D-22, D-23, D-24). Quién: Karen / IT WordPress / CRM.
Brief: `docs/research/forms-v2-campaign-expiry.md` (ESCALADO).

## Objetivo

Implementar enforcement server-side para cerrar campañas vencidas antes de cualquier acción del
formulario de Elementor, usando reloj del servidor y fecha de fin en UTC definida fuera del cliente.

## Diseño aprobado para implementación externa

- Un mu-plugin en WordPress engancha `elementor_pro/forms/validation`.
- Identifica la landing por el campo `referrer` recibido en el POST.
- Resuelve su fecha de fin en UTC (fuente a definir en D-23).
- Compara con `time()` del servidor.
- Si está cerrada (`time() >= closesAtUtc`), agrega error de validación y rechaza antes de
  ejecutar acciones del formulario.
- La respuesta llega como `success:false`; el cliente ya sabe mostrar ese mensaje sin cambios de
  contrato.

## Riesgo aceptado

- `referrer` es falsificable por cliente. Se acepta porque el objetivo de esta capa es impedir
  leads atribuidos a una landing vencida; la atribución exacta antifraude total queda fuera del
  alcance de este repo y del endpoint actual compartido.

## Opciones descartadas

- Un form de Elementor por campaña: descartado por costo operativo y fragilidad de mantenimiento.
- Validar solo en cliente (`data-closes-at`): descartado por bypass vía POST directo.
- Resolver cierre en middleware/Salesforce: descartado para bloqueo inmediato (llega tarde al UX).
- Regla WAF de Cloudflare como capa principal: descartada por acoplamiento a plan/limitaciones de
  señales y respuesta no alineada al flujo JSON de Elementor.
- Token firmado con expiración para esta sesión: descartado por complejidad extra sin resolver la
  fuente autoritativa de cierre por landing.

## Criterios de aceptación (para Karen/IT)

- Hook corre en `elementor_pro/forms/validation` y corta antes de acciones.
- Usa `time()` (no `current_time('timestamp')`) y fecha de fin almacenada en UTC.
- Landing vencida devuelve `success:false` con mensaje de cierre.
- Landing vigente sigue aceptando envíos sin regresión.
- Todo vive fuera de este repo y se documenta en su propio handoff técnico.

## Fuera de este repo

Este paquete no contiene PHP, configuración de WordPress ni secretos. La implementación vive en
infra de Karen/IT y no bloquea edición de código en `src/` aquí.
