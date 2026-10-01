# s04 — handoff

## Archivos
- creado: `src/data/countries.ts`
- creado: `src/data/dialling.ts`
- creado: `src/i18n/types.ts`
- creado: `src/i18n/es.ts`
- creado: `src/i18n/en.ts`
- creado: `src/i18n/pt.ts`
- creado: `src/i18n/index.ts`
- creado: `src/i18n/i18n.test.ts`

## RED

`npm test` con el test ya escrito y sin `src/data/`. Exit distinto de 0.

```
 RUN  v5.0.3 /Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit

 ❯ src/i18n/i18n.test.ts (0 test)
 ✓ src/smoke.test.ts (1 test) 1ms

 FAIL  src/i18n/i18n.test.ts [ src/i18n/i18n.test.ts ]
Error: Failed to resolve import "../data/countries" from "src/i18n/i18n.test.ts". Does the file exist?
  Plugin: vite:import-analysis
  File: /Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit/src/i18n/i18n.test.ts:2:41

 Test Files  1 failed | 1 passed (2)
      Tests  1 passed (1)
   Start at  14:33:04
   Duration  343ms
```

## GREEN

```
$ npm run typecheck && npm test

> tsc --noEmit

> vitest run
 ✓ src/smoke.test.ts (1 test) 1ms
 ✓ src/i18n/i18n.test.ts (6 tests) 19ms

 Test Files  2 passed (2)
      Tests  7 passed (7)
   Start at  14:45:45
   Duration  387ms
```

`npm run test:cov` también salió 0. Los `find` del test anotan `(dial: DiallingCode)`. `npm run typecheck` sale en 0.

## Cobertura

```
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------|---------|----------|---------|---------|-------------------
All files      |     100 |      100 |     100 |     100 |
 data          |     100 |      100 |     100 |     100 |
  countries.ts |     100 |      100 |     100 |     100 |
  dialling.ts  |     100 |      100 |     100 |     100 |
 i18n          |     100 |      100 |     100 |     100 |
  en.ts        |     100 |      100 |     100 |     100 |
  es.ts        |     100 |      100 |     100 |     100 |
  index.ts     |     100 |      100 |     100 |     100 |
  pt.ts        |     100 |      100 |     100 |     100 |
  types.ts     |       0 |        0 |       0 |       0 |
```

`types.ts` solo exporta tipos. v8 no tiene sentencias que instrumentar y lo muestra en 0. El agregado queda en 100 y el umbral pasa. Los tests quedan fuera de la cobertura por Vitest 5. `src/entries/**` sigue excluido desde s01.

## Criterios cubiertos
- RNF-06: `dicts share keys and have no empty copy`, `sf codes match the contract`, `en and pt country names are the Intl.DisplayNames snapshot`, `countries keep the source count, unique iso3 and names`
- CA-24: `dicts share keys and have no empty copy` (la forma recursiva de las tres `Dict` es la misma y no hay cadenas vacías)
- Conteo y valores de origen: `countries keep the source count, unique iso3 and names` (237, ISO3 únicos, MX/HK/AX), `dialling codes keep the source count and point at a country` (225, cada ISO2 existe, US/MX/AX/BS)
- Valores canónicos: `option values are canonical in every language`

## Desviaciones y preguntas
- Los textos de `thankYou` se copiaron de los diccionarios viejos como placeholder de s11. Siguen prometiendo un correo y un CTA de Zoom. s11 los reemplaza.
- `Intl.DisplayNames` se usó una vez en un script local, fuera del repo, para dejar es/en/pt escritos en `countries.ts`. El módulo en runtime no llama a `Intl`. El test sí lo llama, así que el snapshot queda atado al ICU de esta máquina.
- Los nombres en español son los del archivo de origen (`México`, `RAE de Hong Kong (China)`, `Islas Åland`), no los de `Intl`.
- El label de cada prefijo es bandera regional, espacio y código con signo más, igual que el origen. Esos glifos viven solo en `label`.
- Los conteos 237 y 225 están fijos en el test. El test no lee el repo hermano.
- `errors` tiene `unknownResult`, `generic` y `rejected`. `unknownResult` no habla de error de conexión.
- Los callbacks `find` de `i18n.test.ts` anotan `dial: DiallingCode`. `npm run typecheck` sale en 0.
- No hizo falta ningún archivo fuera de la lista de la sesión. No se tocó s01, `docs/specs` ni `docs/research`. No hay commit.

## Cambios tras review

VERDICT CHANGES. El test `en and pt country names are the Intl.DisplayNames snapshot` llamaba a `Intl.DisplayNames` y dependía del ICU de la máquina. Quedó reemplazado por `en and pt names of MX, BR, US, CO and AX are fixed`, con literales fijos: MX en `Mexico` / pt `México`, BR en `Brazil` / pt `Brasil`, US en `United States` / pt `Estados Unidos`, CO en `Colombia` / pt `Colômbia`, AX en `Åland Islands` / pt `Ilhas Aland`. Que ningún nombre en/pt quede vacío sigue en `countries keep the source count, unique iso3 and names`. No se tocó ningún otro archivo.

```
$ npm run typecheck && npm test

> tsc --noEmit

> vitest run
 ✓ src/smoke.test.ts (1 test) 3ms
 ✓ src/i18n/i18n.test.ts (6 tests) 17ms

 Test Files  2 passed (2)
      Tests  7 passed (7)
   Start at  14:50:32
   Duration  844ms
```

## Ronda 2

`src/data/source-values.fixture.ts` congela dos arrays extraídos una vez de `atfx-forms/src/data/options.ts`, en el orden del origen: 237 pares `[iso3, iso2]` y 225 pares `[valor, iso2]`. El archivo tiene 467 líneas, por debajo del máximo de 800.

Tests nuevos: `countries and dials match the frozen source pairs` (`toEqual` de las listas completas), `country iso2 is unique and iso3 is three letters`, `lookups trim spaces and uppercase`.

`DICTS` es `Readonly<Record<Lang, Dict>>`. Los índices `byIso2` son `ReadonlyMap`.

```
$ npm run typecheck && npm run test:cov

> tsc --noEmit

> vitest run --coverage
 ✓ src/smoke.test.ts (1 test) 1ms
 ✓ src/i18n/i18n.test.ts (9 tests) 14ms

 Test Files  2 passed (2)
      Tests  10 passed (10)
   Start at  14:55:23
   Duration  445ms

All files  100  100  100  100
```

`types.ts` sigue en 0 porque solo exporta tipos. El agregado queda en 100. No hay commit.
