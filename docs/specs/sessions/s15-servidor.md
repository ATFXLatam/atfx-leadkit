# s15 — Caducidad y anti-abuso del lado del servidor

Estado: BLOQUEADA (D-14, D-15, D-20). Quién: Karen / IT de WordPress / CRM.
Brief: `docs/research/forms-v2-campaign-expiry.md` (en curso).

## Por qué existe

El cliente no puede impedir que alguien haga POST directo a `admin-ajax.php` con los
`post_id`/`form_id` públicos, ni que manipule el reloj o los atributos. Cerrar una campaña de
verdad, limitar `OwnerId__c` a valores permitidos y frenar spam solo se puede en el servidor
(audit CN-009).

## Opciones a decidir con el brief

- Hook de validación de Elementor Pro en WordPress que rechace envíos fuera de fecha por campaña.
- Token firmado con expiración emitido por WordPress y verificado al recibir.
- Fecha de fin de la Campaign en Salesforce o en el middleware.
- Regla de Cloudflare por ruta y fecha.

## Fuera de este repo

Este paquete no contiene código PHP ni secretos. Si se decide un plugin o un snippet de
WordPress, vive en otro repo con su propio spec.
