# s12 — Cumplimiento

Estado: BLOQUEADA (D-06, D-17, y textos firmados por Legal). Depende de: s9.
Brief: `docs/research/forms-v2-compliance.md` (en curso).

## Ya decidido por los requisitos

- Los textos legales los entrega Legal; el implementador no redacta texto legal.
- Ningún campo nuevo viaja a Salesforce sin decisión firmada (contrato intocable). Si Legal pide
  un opt-in de marketing separado, se escala a CRM antes de implementar.
- Accesibilidad WCAG 2.2 AA (RNF-03) se verifica en s13 con axe en Playwright.

## Archivos previstos

- `src/i18n/legal.ts` (textos y URLs por idioma)
- `src/ui/legal.ts` (aviso de riesgo, entidad, disclaimer CVM para `pt`, links)
- `src/ui/legal.test.ts`
