# s05 — handoff

## Archivos
- creado: `src/forms/shared-fields.ts`
- creado: `src/forms/lead/schema.ts`
- creado: `src/forms/interest/schema.ts`
- creado: `src/forms/schemas.test.ts`

## RED

`npm test` con el test escrito y sin los módulos. Exit distinto de 0.

```
 FAIL  src/forms/schemas.test.ts [ src/forms/schemas.test.ts ]
Error: Failed to resolve import "./shared-fields" from "src/forms/schemas.test.ts". Does the file exist?
  Plugin: vite:import-analysis
  File: /Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit/src/forms/schemas.test.ts:5:43

 Test Files  1 failed | 2 passed (3)
      Tests  10 passed (10)
   Start at  15:06:04
   Duration  673ms
```

## GREEN

```
$ npm run typecheck && npm test

> tsc --noEmit

> vitest run
 ✓ src/smoke.test.ts (1 test) 2ms
 ✓ src/i18n/i18n.test.ts (9 tests) 26ms
 ✓ src/forms/schemas.test.ts (8 tests) 13ms

 Test Files  3 passed (3)
      Tests  18 passed (18)
   Start at  15:07:11
   Duration  1.25s
```

## Cobertura

```
File               | % Stmts | % Branch | % Funcs | % Lines
-------------------|---------|----------|---------|--------
All files          |     100 |      100 |     100 |     100
 forms/shared-fields.ts | 100 |      100 |     100 |     100
 forms/lead/schema.ts   | 100 |      100 |     100 |     100
 forms/interest/schema.ts | 100 |    100 |     100 |     100
```

`npm run test:cov` salió 0. `types.ts` sigue en 0 porque solo exporta tipos. El agregado queda en 100.

## Criterios cubiertos
- CA-07: `unknown country and dialling code are rejected` (país `XXX` y `mex`, prefijo `999999` y `52 `)
- CA-17: `unchecked acceptance is rejected` (`accepted: false`, mensaje del diccionario)
- Mensajes por idioma: `invalid fields use the dictionary message in every language`
- Caso válido por idioma: `each language accepts lead and interest`
- Límites de nombre y email: `name and email limits` (1, 2, 60, 61; apellido 80 y 81; email 254 y 255; trim)
- Teléfono: `phone strips spaces and enforces length` (`55 1234 5678` queda `5512345678`; 5, 6, 20, 21; `+525512345678`)
- Enums cruzados: `choice enums stay on their form`
- D-08: las listas y los límites rechazan la entrada inválida. No cambian las llaves. El valor que sale ya está recortado o sin espacios, como pide el contrato.

## Desviaciones y preguntas
- `LeadValues` está en `shared-fields.ts`. El tipo de la arquitectura vive en `src/contract/types.ts`, que es de s02 y no está en la lista de esta sesión.
- `PHONE_PATTERN` y `PHONE_REGEX` salen de la misma cadena `^[0-9()#&*\-=.]{6,20}$`. El schema quita los espacios y después aplica ese regex. El patrón HTML no admite espacios.
- País y prefijo se comparan tal cual con la lista: sin trim y sin pasar a mayúsculas.
- `createInterestSchema` devuelve `ZodType<LeadValues>`, como dice la API de la sesión. La forma es la misma; cambia el conjunto de `choice`.
- No hay dependencia nueva ni commit.

## Ronda 2

La rama ya trae s02. Se eliminó la copia de `LeadValues` en `src/forms/shared-fields.ts`. `src/forms/lead/schema.ts` y `src/forms/interest/schema.ts` importan `type { LeadValues } from "../../contract/types"`. `src/contract/` no se modificó. La desviación de la copia local queda cerrada. El resto de las desviaciones sigue igual.

`npm run typecheck` salió 0 (`tsc --noEmit`).

`npx vitest run --coverage` salió 0. Start at 16:03:00. Duration 513ms.

```
 Test Files  4 passed (4)
      Tests  37 passed (37)

All files              | 100 | 100 | 100 | 100
 forms/shared-fields.ts | 100 | 100 | 100 | 100
 forms/lead/schema.ts   | 100 | 100 | 100 | 100
 forms/interest/schema.ts | 100 | 100 | 100 | 100
```

`contract/types.ts` e `i18n/types.ts` siguen en 0 porque solo exportan tipos. El agregado queda en 100. Los 19 tests de `src/contract/payload.test.ts` ya venían con s02 y pasan. Sin commit.

## Ronda 3

Review: security BLOCK (high=1), code y qa APPROVE. Solo `src/forms/*`. `src/contract/` no se tocó.

### RED

Tests nuevos antes del cambio. `npx vitest run src/forms/schemas.test.ts` salió 1. Start at 16:23:41.

```
 Test Files  1 failed (1)
      Tests  13 failed | 30 passed (43)
```

Fallaron el patrón del teléfono, los 11 nombres rechazados (`Ana\r\nBcc: x@evil.com`, `\n`, `\r`, `\0`, U+2028, U+202E, `<script>`, `=1+1`, `@x`, `-x`, `+x`) y el teléfono `......`. Los controles de email ya los rechazaba el regex de zod; el schema ahora los rechaza con el propio allowlist antes de `.email()`.

### GREEN

`npm run typecheck` salió 0. `npx vitest run --coverage` salió 0. Start at 16:24:36. Duration 505ms.

```
 Test Files  4 passed (4)
      Tests  72 passed (72)

All files                | 100 | 100 | 100 | 100
 forms/shared-fields.ts  | 100 | 100 | 100 | 100
 forms/lead/schema.ts    | 100 | 100 | 100 | 100
 forms/interest/schema.ts | 100 | 100 | 100 | 100
```

`contract/types.ts` e `i18n/types.ts` siguen en 0. El agregado queda en 100.

### Qué cambió
- Nombre: allowlist `u`, empieza con `\p{L}`, y después solo `\p{L}`, `\p{M}`, espacio, apóstrofe, punto y guion. Eso cierra el header `Ana\r\nBcc: x@evil.com` y la fórmula al inicio (`=`, `+`, `-`, `@`). Válidos: `Jose Maria`, `José María`, `D'Angelo`, `Ana-Luisa`.
- Email: `^[^\p{Cc}\p{Cf}]*$` con flag `u`, antes de `.email()`, mismo mensaje del diccionario.
- Teléfono: `PHONE_PATTERN` y `PHONE_REGEX` siguen siendo la misma cadena, ahora `^(?=(?:[^0-9]*[0-9]){6})[0-9()#&*\-=.]{6,20}$`. `......` se rechaza. El schema sigue quitando espacios antes de aplicar ese regex.
- QA: `it.each` del charset del teléfono; la tabla de campos inválidos y los bordes de longitud corren contra lead e interest; ` a ` falla por `too_small` tras el trim; `  Lo  ` sale `Lo`; `1-242`, `358-18` y `COL` pasan; los mensajes de validación no están vacíos y difieren entre es, en y pt; 10 dígitos con espacios pasan y 21 no; `accepted` ausente, `undefined` o `"on"` se rechaza.

Sin dependencia nueva ni commit.

## Ronda 4

Review: security y qa APPROVE; code WARNING (high=1) y una nota funcional de security. Solo `src/forms/*`. `src/contract/` no se tocó.

### RED

Tests antes del cambio. `npx vitest run src/forms/schemas.test.ts` salió 1. Start at 17:22:12.

```
 Test Files  1 failed (1)
      Tests  5 failed | 28 passed (33)
```

Fallaron el literal de `PHONE_PATTERN`, `new RegExp('^(?:' + PHONE_PATTERN + ')$', 'v')` (Invalid character in character class) y los nombres `D\u2019Angelo`, `O\u2019Brien` y `Ana\u30FBLuisa`. Los nombres rechazados, los emails con controles y el charset del teléfono ya pasaban en interest al parametrizarlos con `FORM_CASES`.

### GREEN

`npm run typecheck` salió 0. `npx vitest run --coverage` salió 0. Start at 17:22:26. Duration 847ms.

```
 Test Files  4 passed (4)
      Tests  62 passed (62)

All files                | 100 | 100 | 100 | 100
 forms/shared-fields.ts  | 100 | 100 | 100 | 100
 forms/lead/schema.ts    | 100 | 100 | 100 | 100
 forms/interest/schema.ts | 100 | 100 | 100 | 100
```

Hay menos tests que en la ronda 3 porque los casos de nombre, email y teléfono quedaron agrupados por schema. `contract/types.ts` e `i18n/types.ts` siguen en 0. El agregado queda en 100.

### Qué cambió
- `NAME_PATTERN` también acepta U+2019 y U+30FB. `ACCEPTED_NAMES` incluye `D\u2019Angelo`, `O\u2019Brien` y `Ana\u30FBLuisa`. El apóstrofe ASCII sigue válido.
- `PHONE_PATTERN` es `^(?=(?:[^0-9]*[0-9]){6})[0-9\(\)#&*\-=.]{6,20}$`. `PHONE_REGEX` sale de esa misma cadena. El test compila `new RegExp('^(?:' + PHONE_PATTERN + ')$', 'v')` y compara los mismos casos que `PHONE_REGEX`.
- Nombres rechazados, emails con controles y charset del teléfono corren con `FORM_CASES` en lead e interest.

Sin dependencia nueva ni commit.

## Ronda 5

Review: code APPROVE; qa WARNING (high=0) y una nota de security. Solo `src/forms/*`. `src/contract/` no se tocó.

### RED

Tests antes del cambio. `npx vitest run src/forms/schemas.test.ts` salió 1. Start at 17:54:23.

```
 Test Files  1 failed (1)
      Tests  3 failed | 27 passed (30)
```

Fallaron el literal de `PHONE_PATTERN` y el prefijo del teléfono en lead e interest. El mensaje del assert fue `phone="*123456"`. `=(1)*(2)` ya lo rechazaba el lookahead de seis dígitos (solo tiene dos). Los que sí pasaban eran `*123456`, `#123456` y `-123456`.

### GREEN

`npm run typecheck` salió 0. `npx vitest run --coverage` salió 0. Start at 17:54:37. Duration 965ms.

```
 Test Files  4 passed (4)
      Tests  59 passed (59)

All files                | 100 | 100 | 100 | 100
 forms/shared-fields.ts  | 100 | 100 | 100 | 100
 forms/lead/schema.ts    | 100 | 100 | 100 | 100
 forms/interest/schema.ts | 100 | 100 | 100 | 100
```

`contract/types.ts` e `i18n/types.ts` siguen en 0. El agregado queda en 100.

### Qué cambió
- `PHONE_PATTERN` y `PHONE_REGEX` siguen siendo la misma cadena: `^(?=(?:[^0-9]*[0-9]){6})[0-9\(][0-9\(\)#&*\-=.]{5,19}$`. El primer carácter es dígito o `(`. Sigue compilando con `new RegExp('^(?:' + PHONE_PATTERN + ')$', 'v')`. Rechaza `=(1)*(2)`, `*123456`, `#123456` y `-123456`. Acepta `(55)12345678` y `5512345678`, en lead e interest.
- Cada `expect` dentro de un loop lleva el caso, por ejemplo `firstName=${JSON.stringify(name)}`.
- `ACCEPTED_NAMES` y el trim de email corren con `FORM_CASES` en lead e interest.

Sin dependencia nueva ni commit.
