# s4 — Datos e i18n

Estado: HECHA (PR #4). Depende de: s1.

## Objetivo

Listas de países y prefijos, y diccionarios es/en/pt con paridad garantizada por test.

## Archivos

- `src/data/countries.ts`
- `src/data/dialling.ts`
- `src/i18n/types.ts`
- `src/i18n/es.ts`, `src/i18n/en.ts`, `src/i18n/pt.ts`
- `src/i18n/index.ts`
- `src/i18n/i18n.test.ts`

(8 archivos: excepción aceptada porque los tres diccionarios son datos con la misma forma.)

## Fuentes de datos

- Países y prefijos: portar de `/Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-forms/src/data/options.ts`
  (mismos códigos ISO3 y mismos valores de prefijo; esos valores viajan a Salesforce).
- Nombres de país en/pt: generarlos una vez con `Intl.DisplayNames` en un script local y
  commitear el resultado como datos (no llamar `Intl.DisplayNames` en runtime: Safari antiguo).
- Textos: partir de `atfx-forms/src/i18n/index.ts` y `atfx-forms-newAug26/src/i18n/index.ts`.

## API

```ts
export interface Country { readonly iso3: string; readonly iso2: string; readonly names: Readonly<Record<Lang, string>> }
export const COUNTRIES: readonly Country[];
export function countryByIso2(iso2: string): Country | undefined;

export interface DiallingCode { readonly value: string; readonly iso2: string; readonly label: string }
export const DIALLING_CODES: readonly DiallingCode[];
export function diallingForIso2(iso2: string): DiallingCode | undefined;

export function resolveDict(lang: Lang): Dict;
```

`Dict` incluye: labels de campos, placeholders, opciones de `lead` (Principiante/Intermedio/
Avanzado con su etiqueta) y de `interest` (Abrir cuenta/Copytrade/IB Program), mensajes de
validación, errores (`unknownResult`, `generic`, `rejected`), textos de estados de caducidad
(`notStarted`, `expired`), textos de thank-you (placeholder; s11 los completa) y `sf`
(`emailLang`, `landingLang`).

## Tests primero

- Paridad: las tres `Dict` tienen exactamente las mismas llaves (recursivo) y ningún valor vacío.
- `sf` por idioma igual al contrato.
- Valores canónicos de opciones iguales en los tres idiomas.
- Cada país tiene nombre en es/en/pt; ISO3 únicos; cada prefijo apunta a un ISO2 existente.
- Conteo de países y prefijos igual al del archivo de origen (evita perder entradas al portar).

Cubre: RNF-06, CA-24.
