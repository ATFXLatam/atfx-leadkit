# s08 — review

Reviewer: Claude Code, 2026-10-02.

## Verificado
- typecheck y 170 tests en verde; `controller.ts`, `analytics.ts` y `states.ts` al 100 %.
- Orden del handler según la spec: `preventDefault`, lock por instancia, honeypot, validación,
  schedule recalculado en cada envío, popup `about:blank` síncrono con `opener = null`, payload,
  submit, resultado, liberación en `finally`.
- El popup solo navega al `zoomLink` validado por s03 y solo tras `ok`; `redirect_url` no se lee.
- Analítica y hooks solo tras `ok`, aislados, sin PII (`form` y `aanumber`).
- Errores del servidor como texto; llaves de Elementor por `Map` (sin llaves de prototipo).
- code-reviewer, security-reviewer y qa-reviewer: APPROVE en ronda 2.

## Rondas
1. Implementado por Grok. Code y security APPROVE; qa WARNING high=2: fallos de submit,
   `buildPayload` o `page` sin test y con popup huérfano; CA-21 sin probar el recálculo por envío.
2. Implementado por tdd-guide: los fallos previos al resultado pasan a `unknown` con popup cerrado y
   lock liberado; `closePopup` en `finally`; `applyOk` encadena pintura, navegación y analítica con
   try/finally; honeypot de solo espacios cuenta como vacío. 10 tests en RED antes del fix.

## Notas
- `Intentar de nuevo` está fijo en español en `src/ui/states.ts`; llave de diccionario en s9/s11.
- Residual MEDIUM: si `setBusy` lanza en `true` y en `false`, el popup queda abierto
  (`controller.ts`, catch del handler). Baja probabilidad; cerrar el popup antes de `release()`.
- Los `catch` que tragan errores de pintura no dejan señal; evaluar un hook de log en s11.

VERDICT: APPROVE
