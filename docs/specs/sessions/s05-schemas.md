# s5 — Schemas de validación

Estado: HECHA (PR #12). Depende de: s4.

## Objetivo

Validación de lo que escribe la persona para `lead` e `interest`, con mensajes por idioma y
listas cerradas.

## Archivos

- `src/forms/lead/schema.ts`
- `src/forms/interest/schema.ts`
- `src/forms/shared-fields.ts` (reglas comunes: nombre, email, teléfono, país, prefijo, aceptación)
- `src/forms/schemas.test.ts`

## Reglas (de `03-contrato-salesforce.md`)

| Campo | Regla |
|---|---|
| firstName | trim, 2-60 |
| lastName | trim, 2-80 |
| email | trim, email, ≤ 254 |
| diallingCode | ∈ `DIALLING_CODES.value` |
| phone | quitar espacios; sin `+` inicial; `^[0-9()#&*\-=.]{6,20}$` |
| country | ∈ `COUNTRIES.iso3` |
| choice | lead: Principiante, Intermedio, Avanzado. interest: Abrir cuenta, Copytrade, IB Program |
| accepted | `true` |

El `pattern` HTML de s7 debe ser equivalente al regex del teléfono; exportar ambos desde
`shared-fields.ts` para que no diverjan.

## API

```ts
export function createLeadSchema(dict: Dict): ZodType<LeadValues>;
export function createInterestSchema(dict: Dict): ZodType<LeadValues>;
export const PHONE_PATTERN: string;   // para el atributo pattern
```

## Tests primero

- Por idioma, un caso válido y el mensaje de cada campo inválido viene del diccionario.
- Límites: 1, 2, 60, 61 caracteres en nombre; email de 255; teléfono de 5, 6, 20, 21.
- Teléfono `55 1234 5678` válido (espacios removidos); `+525512345678` inválido con mensaje.
- País `XXX` y prefijo `999999` inválidos (CA-07).
- `accepted: false` inválido (CA-17, parte pura).
- Interest rechaza `Principiante`; lead rechaza `Copytrade`.
