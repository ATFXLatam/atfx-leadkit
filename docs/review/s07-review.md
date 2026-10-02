# s07 — review

Reviewer: Claude Code, 2026-10-02.

## Verificado
- typecheck, 192 tests de la sesión (244 con s08 integrado) y build en verde.
- `npm run build` produce un JS por formulario con el CSS embebido, sin `.css` hermano; lo fija
  `src/build.test.ts`.
- Light DOM, ids por instancia, solo `textContent`, honeypot oculto por clip y fuera del tab.
- CSS: especificidad de controles > (0,3,1) y de foco > (0,4,1), sin `!important` salvo honeypot,
  reglas seguras para iOS 15 (denylist), contraste de borde y foco >= 3:1 en light y dark.
- code-reviewer, security-reviewer y qa-reviewer: APPROVE en ronda 4 y sobre el merge con main.

## Rondas
1. Implementación iniciada por Cursor (cortada por límite de uso) y completada por tdd-guide.
   Code APPROVE; security WARNING (URLs de privacidad sin verificar); qa WARNING high=5.
2. Error visible, labels en ambas direcciones, contrato del form raíz, honeypot en markup y CSS,
   parser CSS que conserva listas, test de build, contraste de borde.
3. Decisiones de Karen: `@types/node` reemplaza el shim; la URL de privacidad es el PDF oficial de
   AT Global Markets MU para es, en y pt (solo existe en inglés).
4. qa WARNING high=1: el foco solo fijaba especificidad. Se fija el cuerpo de las reglas de foco y
   el checkbox de consentimiento tiene regla propia.

## Notas
- El texto del consentimiento sigue con `PENDIENTE_LEGAL` hasta s12 (D-36).
- El aro de foco aparece también con ratón: se quitaron las reglas `:focus-visible` por iOS 15.
- La fila de s07 en `docs/research/INDEX.md` sigue ESCALADO aunque el brief está APROBADO; la
  actualiza Karen.
- Para s9 (integración con s08): adaptador del puerto `FormUi` sobre `render.ts`,
  `focusFirstInvalid` y `showState` por escribir, renderer del estado `closed`, contenedor de
  estados, estilos de los estados, `Intentar de nuevo` en el diccionario, y un test de integración
  render + controlador.
- Enlaces legales entregados por Karen para s12: Legal
  `https://www.atfx.com/es/condiciones-legales`, Términos
  `https://www.atfx.com/wp-content/uploads/2024/04/AT-Global-Markets-MU_EN_Standard-Terms-of-Business.pdf`,
  Cookies `https://www.atfx.com/wp-content/uploads/2025/03/ES-ATFX-GM-Cookies-Policy-EN-V20200605.pdf`,
  Boletines `https://notice.atfx.com/es/notice`.
- Release: verificar que la URL del PDF de privacidad sigue viva.

VERDICT: APPROVE
