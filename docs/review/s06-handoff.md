# s06 — handoff

## Archivos
- creado/modificado: `src/core/response.ts`
- creado/modificado: `src/core/submit.ts`
- creado/modificado: `src/core/submit.test.ts`

## RED
Comando:

`npx vitest run src/core/submit.test.ts`

Salida (fallando antes de implementar):

```text
 FAIL  src/core/submit.test.ts [ src/core/submit.test.ts ]
Error: Failed to resolve import "./submit" from "src/core/submit.test.ts". Does the file exist?
```

## GREEN
Comando:

`npx vitest run src/core/submit.test.ts`

Salida:

```text
Test Files  1 passed (1)
Tests       8 passed (8)
```

Comando solicitado al cierre:

`npm run typecheck && npx vitest run --coverage`

Salida:

```text
src/core/submit.test.ts(25,29): error TS2558: Expected 0-1 type arguments, but got 2.
src/core/submit.test.ts(44,18): error TS2339: Property 'method' does not exist on type 'never'.
src/core/submit.test.ts(45,18): error TS2339: Property 'headers' does not exist on type 'never'.
src/core/submit.test.ts(46,18): error TS2339: Property 'signal' does not exist on type 'never'.
src/core/submit.test.ts(47,18): error TS2339: Property 'body' does not exist on type 'never'.
src/core/submit.test.ts(48,30): error TS2339: Property 'body' does not exist on type 'never'.
src/core/submit.test.ts(54,29): error TS2558: Expected 0-1 type arguments, but got 2.
src/core/submit.test.ts(55,14): error TS7006: Parameter '_input' implicitly has an 'any' type.
src/core/submit.test.ts(55,22): error TS7006: Parameter 'init' implicitly has an 'any' type.
src/core/submit.test.ts(76,29): error TS2558: Expected 0-1 type arguments, but got 2.
src/core/submit.test.ts(85,29): error TS2558: Expected 0-1 type arguments, but got 2.
src/core/submit.test.ts(96,29): error TS2558: Expected 0-1 type arguments, but got 2.
```

Cobertura corrida por separado:

Comando:

`npx vitest run --coverage`

Salida:

```text
Test Files  4 passed (4)
Tests       37 passed (37)

All files          |   97.87 |       92 |     100 |   97.87
core              |   93.93 |       80 |     100 |   93.93
submit.ts         |   92.59 |    77.77 |     100 |   92.59 | uncovered: 24,29
```

## Criterios cubiertos
- CA-12 (parte pura): test `returns unknown timeout after 15 seconds and does not retry`.
- CA-13: test `returns unknown invalid-response for non-contract body`.
- Transporte (method, URL, header, body, un solo fetch): test `sends one POST with endpoint, header and exact FormData body`.
- Red caída sin reintento: test `returns unknown network when fetch rejects and does not retry`.
- Rechazo de negocio: test `maps success false with errors and message to rejected`.

## Desviaciones y preguntas
- Bloqueo de hook/gate: al intentar corregir los errores de `typecheck` en `src/core/submit.test.ts`, `ApplyPatch` fue bloqueado por `research-gate` con este mensaje:

```text
Edicion bloqueada por research-gate: el cambio de la rama llega a 158 lineas de codigo (el nivel "omitir" de /research es hasta 20) y la rama no trae un Reference Brief aprobado. Corre /research antes de seguir: escribe docs/research/<slug>.md, pasa lint-brief y research-verifier, y deja Estado AUTO (o APROBADO por Karen si escala). Si un brief existente ya cubre la pregunta, reusalo anotando la reutilizacion en el brief dentro de esta rama.
```

- Por tu regla explícita, no creé brief ni toqué `docs/research/`; me detuve en ese punto.

## Ronda 2

### Archivos
- modificado: `src/core/response.ts`
- modificado: `src/core/submit.ts`
- modificado: `src/core/submit.test.ts`

### RED
Comando:

`npx vitest run src/core/submit.test.ts`

Salida (fallando antes de implementar):

```text
❯ src/core/submit.test.ts (15 tests | 4 failed)
× returns unknown timeout when json body never resolves before 15 seconds
× accepts [] in data as empty object
× accepts [] in data.errors as empty object
× accepts [] in data.data as empty object
```

### GREEN
Comando:

`npx vitest run src/core/submit.test.ts`

Salida:

```text
Test Files  1 passed (1)
Tests       15 passed (15)
```

### Comando de cierre solicitado
Comando:

`npm run typecheck && npx vitest run --coverage`

Salida:

```text
> atfx-leadkit@0.0.0 typecheck
> tsc --noEmit

Test Files  4 passed (4)
Tests       44 passed (44)

Statements   : 99% (100/101)
Branches     : 91.07% (51/56)
Functions    : 100% (16/16)
Lines        : 99% (100/101)
```

### Cobertura foco sesión
```text
core/submit.ts | 96.55% statements | 75% branches | 100% funcs | 96.55% lines | uncovered: 63
```

### Criterios de esta ronda
- Schema acepta solo `[]` vacío como objeto vacío en `data`, `data.errors` y `data.data`; arrays con elementos se rechazan.
- Cuerpos `0` y `-1` se rechazan como `unknown/invalid-response`.
- Rechazo de negocio se decide por `success: false` (con HTTP 200 en el test).
- Timeout único de 15 s con `setTimeout` + `AbortController`, cubriendo `fetch` y `response.json()`, con `clearTimeout` en `finally`.
- Detección de timeout mediante flag `timedOut` del callback del timer (sin `instanceof DOMException`).
- Mocks de `fetch` tipados con `vi.fn<typeof fetch>`.

## Ronda 3

### Archivos
- modificado: `src/core/submit.ts`
- modificado: `src/core/submit.test.ts`

### RED
Comando:

`npx vitest run src/core/submit.test.ts`

Salida (fallando antes de implementar):

```text
❯ src/core/submit.test.ts (27 tests | 1 failed)
× does not classify body-construction failures as network

AssertionError: promise resolved "{ kind: 'unknown', reason: 'network' }" instead of rejecting
```

### GREEN
Comando:

`npx vitest run src/core/submit.test.ts`

Salida:

```text
Test Files  1 passed (1)
Tests       27 passed (27)
```

### Comando de cierre solicitado
Comando:

`npm run typecheck && npx vitest run --coverage`

Salida:

```text
> atfx-leadkit@0.0.0 typecheck
> tsc --noEmit

Test Files  4 passed (4)
Tests       56 passed (56)

All files   | 100% statements | 96.42% branches | 100% funcs | 100% lines
submit.ts   | 100% statements | 90% branches    | 100% funcs | 100% lines
```

### Criterios de esta ronda
- HIGH: limpieza de timer con fake timers cubierta para `ok`, `rejected`, `network`, `invalid-response` y `timeout`; en todos los casos termina en `vi.getTimerCount() === 0`.
- HIGH: `success: false` sin `message` cubierto con `errors` y con `data` vacío, ambos con `toStrictEqual` y sin llave `message`.
- MEDIUM: éxito sin `aanumber` cubierto para `data: {}` y `data: { data: {} }` con `toStrictEqual({ kind: "ok" })`.
- LOW: límite de timeout cubierto avanzando `SUBMIT_TIMEOUT_MS - 1` (promesa pendiente) y con `timeoutMs` personalizado.
- HIGH: `toFormData(entries)` movido fuera del `try` y antes del timer; fallo de construcción de body ahora rechaza la promesa y no se clasifica como `network`.
