# fix/s07-input-overflow handoff (completo; el gate se resolvio con nota de Reuso en docs/research/s07-ui.md)

## Estado
RESUELTO. RED y GREEN aplicados; 308 tests, build y smoke en verde; overflow <=1px en los tres
forms (claro y oscuro). El gate se resolvio con una nota de Reuso en el brief aprobado
docs/research/s07-ui.md. Las secciones "Causa", "RED" y "Pendiente (GREEN)" de abajo son
historicas (el diagnostico inicial de grid era secundario); la causa real y el fix estan en
"Correccion de causa" y "GREEN".

Mensaje del bloqueo (PostToolUse:Bash, research-gate): "el comando escribio codigo ... la rama paso de 0 a 39 lineas; el umbral es 20. Edicion bloqueada por research-gate: el cambio de la rama llega a 39 lineas de codigo (el nivel 'omitir' de /research es hasta 20) y la rama no trae un Reference Brief aprobado. Corre /research antes de seguir ... No se revirtio nada."

## Causa [historico; ver 'Correccion de causa']
Los items del grid (.atfx-leadkit__field, y los controles dentro del field que tambien es grid) tienen min-width:auto, asi que crecen a su ancho intrinseco y se salen de la columna del form.

## RED (medido a 360px, smoke nuevo, chromium y webkit identicos)
Overflow sobre el borde interno del form, en #lead, #interest y #late (claro y oscuro):
- inputs (firstName, lastName, email, phone) y submit: +26px
- selects (diallingCode, country, choice): +50px

Vitest: 1 falla esperada ("grid items declare min-width: 0 ...", 26 pasan).

## Archivos tocados
- src/ui/render.test.ts: test de regresion CSS (min-width:0 en __field, input/select control, consent-row).
- scripts/qa-smoke.mjs: runLayout (viewport 360x800, tolerancia 1px, sin scroll horizontal), agregado a runEngine.

## Pendiente (GREEN) [historico, ya aplicado]
En src/styles/leadkit.css agregar `min-width: 0` en `.atfx-leadkit .atfx-leadkit__field`, en la regla compartida de input/select control/submit, y cambiar el `1fr` de .atfx-leadkit__consent-row a `minmax(0, 1fr)` (o min-width:0 en la fila). Luego correr typecheck, vitest --coverage, build y el smoke, y anotar medidas GREEN (<=1px). Requiere que Karen resuelva el research-gate (brief) o autorice continuar.


## Correccion de causa (hallazgo al aplicar GREEN)
min-width:0 solo no cambio nada (misma medida +26/+50). Diagnostico con computed style: el form tenia box-sizing content-box. La regla `.atfx-leadkit, .atfx-leadkit * { box-sizing: inherit }` incluia al root, y por venir despues anulaba su propio `border-box` heredando el content-box del host; los controles con width:100% median 294 + 24 padding + 2 borde = 320 en columna de 294 (+26; selects +50 por su padding-right 2.25rem). El blowout de grid era secundario.

## GREEN
Cambios en src/styles/leadkit.css: se quita `.atfx-leadkit` de la regla inherit (la regla queda `.atfx-leadkit *`); min-width:0 en __field y en la regla compartida de controles/submit; `minmax(0, 1fr)` en consent-row. Test nuevo en render.test.ts para el box-sizing del root.
Medidas a 360px (smoke runLayout, chromium y webkit, #lead, #interest oscuro, #late): overflow <=1px en todos los controles y sin scroll horizontal.
typecheck ok; vitest 14 archivos / 308 tests ok, cobertura 99.11% stmts, 96.6% branches, 100% funcs; build ok; smoke: ok server, ok chromium, ok webkit.
