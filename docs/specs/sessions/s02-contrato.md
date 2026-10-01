# s2 — Contrato: constructor del payload

Estado: BLOQUEADA (D-09). Depende de: s1.

## Objetivo

Convertir `docs/specs/03-contrato-salesforce.md` en código puro y en tests golden. Desde esta
sesión, cualquier cambio en el payload rompe un test.

## Archivos

- `src/contract/picklist.ts`
- `src/contract/payload.ts`
- `src/contract/payload.test.ts`
- `src/contract/types.ts` (tipos `MountAttrs`, `LeadValues`, `PageContext`, `PayloadEntries`
  de `04-arquitectura.md`; s3 los reusa)

## API

```ts
export const LEAD_SOURCES: readonly string[];          // picklist exacto del contrato
export function resolveLeadSource(explicit: string | null, hasZoom: boolean): string;
export function isValidLeadSource(value: string): boolean;

export const ENDPOINT = "/wp-admin/admin-ajax.php";
export function buildPayload(
  form: FormKey, attrs: MountAttrs, values: LeadValues, page: PageContext,
): PayloadEntries;
export function toFormData(entries: PayloadEntries): FormData;
```

- `buildPayload` no lee `window` ni `document`: todo llega por argumentos.
- Orden de entradas estable (el del contrato) para que el golden sea comparable.
- `referer_title`: `page.title.trim()`, vacío → `ATFX LATAM`, recortado a 200.
- `Comment` solo en modo webinar, con el formato exacto del contrato.
- `OwnerId__c` solo si `attrs.bdmOwner` no es null.
- `field_8f8f3d5=on` solo si `values.accepted`.

## Tests primero (todos con `toEqual` sobre el array completo)

Golden explícitos, escritos a mano a partir del contrato, no generados por el código:
1. lead · es · simple · sin owner · aceptado.
2. lead · pt · webinar con topic y fecha · con owner.
3. lead · en · webinar solo con link (sin topic ni fecha): `Comment` = `Webinar Zoom Link: <z>`.
4. interest · es · simple, `Trading_Experience__c = "Copytrade"`.
5. `resolveLeadSource`: explícito válido; `Promotion` → default; con zoom → `Webinar`; sin zoom →
   `Website`; `" Webinar "` con espacios; mayúsculas distintas (`webinar`) → default.
6. `referer_title` vacío → `ATFX LATAM`; título de 300 caracteres → 200.
7. `toFormData` conserva todas las entradas y su orden.

Cubre: CA-06, CA-09, CA-10 (parte pura), RNF-08 (100 % en este módulo).

## Criterios

- Cobertura 100 % de `src/contract/`.
- El reviewer compara cada golden contra `03-contrato-salesforce.md` línea por línea.
