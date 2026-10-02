# s09 — review

Reviewer: Claude Code, 2026-10-02.

## Verificado
- typecheck, 306 tests (14 archivos, también con `--sequence.shuffle`) y build en verde;
  `mount.ts` al 99 % de líneas y 96 % de ramas.
- Decisiones del brief `s09-montaje` (APROBADO por Karen): arranque 1A, idempotencia 2A + 2C,
  global 2D con `versions` por key, `instanceId` 3B, contenedor de estados 4A, D-11 5B, agenda
  mínima `open | invalid` hasta s10.
- Mutation testing de QA sobre `mount.ts`: las mutaciones relevantes mueren (filtro de nodos,
  limpieza del catch, guarda de montaje, `forms.has` hostil, validación del global).
- Ningún camino deja un `form` enviable sin listener; un global malformado falla cerrado.
- Deuda de s08 cerrada: el popup se cierra aunque `setBusy` lance en `true` y en `false`.
- code-reviewer, security-reviewer y qa-reviewer: APPROVE en ronda 2.

## Rondas
1. Code y security APPROVE (security MEDIUM: global existente sin validar); qa WARNING high=1:
   el test de nodos que no son `Element` no podía fallar.
2. Validación de la forma del global con `has`/`add` nativos; tests que fallan sin su
   comportamiento (nodo de texto en el mismo tick, script duplicado con observers vivos, limpieza
   del catch, body nulo, `data-debug` tardío).

## Notas
- `FormDefinition` queda en `{ key }`; `04-arquitectura.md` actualizado.
- `hideForm` usa también `style.display = "none"` porque `.atfx-leadkit { display: grid }` vence a
  `hidden`; s11 debe agregar `.atfx-leadkit[hidden]{display:none}` y estilos para el contenedor de
  estados y el botón de reintento.
- `release()` traga el error de `setBusy(false)` sin señal; hook de log pendiente en s11.
- LOW sin test: throw que no es `Error` en `safeMount`, `forms.add` hostil, global `null`.
- QA en staging (Karen o IT): caché del HTML de las landings, popups o widgets de Elementor que
  clonan el contenedor, Custom Code en el editor, ubicación del snippet.

VERDICT: APPROVE
