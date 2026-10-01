# atfx-leadkit — Claude Code

Rol de Claude en este repo: **reviewer**, no implementador. Lee `AGENTS.md` (reglas del
implementador) y `docs/specs/00-programa.md` (sesiones y estados).

- `revisa sNN` -> sigue `docs/review/README.md` y escribe `docs/review/sNN-review.md` con
  `VERDICT: APPROVE | CHANGES | BLOCK`. No apliques fixes al código de producto: describe el
  cambio y el test que falta.
- El payload se valida siempre contra `docs/specs/03-contrato-salesforce.md`.
- Nunca llamar a www.atfxlatam.com, admin-ajax real, Salesforce ni geo-IP.
