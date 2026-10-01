# s12 — Cumplimiento

Estado: BLOQUEADA (D-05, D-06, D-17, D-20, D-33, D-34, D-35, D-36, D-37, D-38). Depende de: s7, s9, s11.
Brief: `docs/research/forms-v2-compliance.md` (ESCALADO).

## Objetivo

Implementar cumplimiento en consentimiento, bloque legal, accesibilidad y anti-abuso sin cambiar
el contrato de campos con Salesforce.

## Archivos

- `src/i18n/legal.ts`
- `src/i18n/legal.test.ts`
- `src/ui/legal-block.ts`
- `src/ui/legal-block.test.ts`
- `src/ui/render.ts`
- `CHANGELOG.md`

## API

```ts
export const CONSENT_TEXT_VERSION: Readonly<Record<Lang, string>>;

export interface LegalCopy {
  readonly consentLabel: string;
  readonly consentError: string;
  readonly consentPrivacyText: string;
  readonly consentPrivacyUrl: string;
  readonly legalRiskWarning: string;
  readonly legalEntity: string;
  readonly legalLicense: string;
  readonly legalTermsText: string;
  readonly legalTermsUrl: string;
  readonly legalPrivacyText: string;
  readonly legalPrivacyUrl: string;
  readonly legalCvmNotice: string | null; // obligatorio en pt, null en es/en
}

export function getLegalCopy(lang: Lang): LegalCopy;
export function renderLegalBlock(copy: LegalCopy): HTMLElement;
```

## Reglas

### C1 — Consentimiento (sin campo nuevo)

- Un solo checkbox obligatorio, desmarcado por defecto (D-05).
- El texto del checkbox cubre solo el contacto solicitado por la persona; no mezcla opt-in de
  marketing.
- El enlace a privacidad se renderiza por idioma (`es`/`en`/`pt`) junto al checkbox y fuera del
  `label` para no togglear el control al abrir el link.
- El mensaje de error usa el mismo vocabulario de la etiqueta de consentimiento.
- Un segundo campo para marketing (email/WhatsApp/llamadas) queda PENDIENTE (D-06) porque rompe
  contrato de campos.
- Si un texto menciona WhatsApp, debe nombrar el canal y la empresa.
- Prueba de consentimiento sin campos nuevos:
  - `CONSENT_TEXT_VERSION` exporta un id por idioma.
  - Cada cambio en texto/versionado se registra en `CHANGELOG.md`.
  - No registrar IP ni user-agent desde el widget.

### C2 — Bloque legal bajo el botón

- Render fijo bajo el botón de submit.
- Incluye: advertencia de riesgo, entidad y licencia, links de privacidad y términos por idioma.
- En `pt`, además incluye aviso Levycam/CVM.
- Todos los textos vienen de Legal; el spec define llaves i18n para completar por Legal:
  - `legal.consent.label`
  - `legal.consent.error`
  - `legal.consent.privacyText`
  - `legal.consent.privacyUrl`
  - `legal.block.riskWarning`
  - `legal.block.entity`
  - `legal.block.license`
  - `legal.block.termsText`
  - `legal.block.termsUrl`
  - `legal.block.privacyText`
  - `legal.block.privacyUrl`
  - `legal.block.cvmNotice`
- Ninguna llave legal puede quedar vacía ni con `PENDIENTE_LEGAL`.

### C3 — WCAG 2.2 AA

- `autocomplete`: `given-name`, `family-name`, `email`, `tel-national`, `country`,
  `tel-country-code`.
- Errores: `aria-invalid` y `aria-describedby` en el campo inválido.
- Submit inválido: foco al primer error.
- Éxito: foco al heading del thank-you (s11).
- D-10 mantiene `select` nativo: no existe buscador sin label.
- Contraste (texto/error/foco/componentes) se mide con axe en s13.

### C4 — Anti-abuso y alcance

- Honeypot en cliente ya definido en s7; esta sesión no agrega otro mecanismo cliente.
- Turnstile y rate limit son de servidor (D-20, s15, IT). No se implementan aquí.
- Retención de datos queda en decisión IT/Legal, fuera del widget.

## Tests primero (RED)

- `legal copy`:
  - falla si falta alguna llave en cualquier idioma.
  - falla si una llave legal está vacía.
  - falla si una llave legal contiene `PENDIENTE_LEGAL`.
  - falla si `legalCvmNotice` en `pt` es `null` o vacío.
- `consentimiento`:
  - checkbox inicia desmarcado.
  - solo existe un checkbox obligatorio de consentimiento.
  - error de consentimiento reutiliza el mismo vocabulario de la etiqueta.
  - el link de privacidad existe por idioma y no está dentro del `label`.
  - no se agrega ningún campo nuevo al payload.
- `versionado`:
  - `CONSENT_TEXT_VERSION` expone ids para `es`, `en`, `pt`.
  - al cambiar un id o texto legal, hay entrada en `CHANGELOG.md`.
- `accesibilidad`:
  - campos inválidos reciben `aria-invalid` + `aria-describedby`.
  - submit inválido mueve foco al primer error.
  - success mueve foco al thank-you.
- `anti-abuso`:
  - no hay integración de Turnstile en cliente.
  - honeypot sigue bloqueando `fetch` si se llena (regresión de s7).

## Criterios de aceptación de la sesión

- Cubre RF-17, RF-18 y CA-25 a CA-32 de `01-requisitos.md`.
- El consentimiento no introduce campos nuevos ni mezcla finalidades de marketing.
- El bloque legal queda bajo el botón con variantes por idioma y aviso CVM en `pt`.
- El build falla si falta texto legal firmado (llave vacía o `PENDIENTE_LEGAL`).
