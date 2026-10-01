# s06 — review

Reviewer: Claude Code, 2026-10-01.

## Verificado
- typecheck y 56 tests en verde; `submit.ts` y `response.ts` al 100 % de líneas.
- Un solo `fetch` por llamada y ningún reintento (D-07), aserto en cada camino de fallo.
- Respuesta validada con zod contra `03-contrato-salesforce.md` (sección Respuesta, actualizada
  con la decisión de Karen sobre `[]`).
- code-reviewer, security-reviewer y qa-reviewer: APPROVE en ronda 3.

## Rondas
1. El research-gate frenó al implementador; se detuvo sin escribir briefs (regla nueva). Brief
   `s06-envio-cliente` ESCALADO → APROBADO por Karen con tres decisiones: solo `[]` vacío como
   objeto vacío, `SubmitResult` según `04-arquitectura`, un timer de 15 s que cubre `json()`.
2. CHANGES (qa WARNING high=2): sin test de limpieza del timer ni de rechazo sin `message`.
3. Cubierto con `vi.getTimerCount()` y `toStrictEqual`; `toFormData` sale del `try` y su fallo
   rechaza la promesa (documentado en la spec).

## Notas
- Pendiente de Karen o IT: capturar desde DevTools una respuesta real de éxito y una de rechazo
  para fijarlas como fixtures.
- s08 debe mostrar `message` y `fieldErrors` con `textContent`, nunca `innerHTML`.
- Sin `redirect: "error"` en `fetch`: cambiaría el transporte del contrato; queda como decisión.

VERDICT: APPROVE
