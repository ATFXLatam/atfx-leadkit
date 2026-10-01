# Revisión

Una sesión produce dos archivos aquí:

- `sNN-handoff.md` — lo escribe el implementador (plantilla abajo).
- `sNN-review.md` — lo escribe el reviewer (Claude Code), terminando con
  `VERDICT: APPROVE | CHANGES | BLOCK` y la lista de criterios verificados.

## Plantilla de handoff

```markdown
# sNN — handoff

## Archivos
- creado/modificado: ruta

## RED
<salida de npm test antes de implementar>

## GREEN
<salida de npm run typecheck && npm test>

## Cobertura
<tabla de cobertura de los archivos de la sesión>

## Criterios cubiertos
- CA-xx: test `nombre del test`

## Desviaciones y preguntas
- ...
```

## Qué revisa el reviewer

1. Corre `npm run typecheck`, `npm test`, `npm run test:cov` (y `e2e`/`size` cuando existan).
2. Cada CA de la sesión tiene un test que falla si se rompe el comportamiento.
3. Payload contra `docs/specs/03-contrato-salesforce.md` (desde s2, en toda sesión que lo toque).
4. Solo se tocaron los archivos de la sesión; ninguna dependencia nueva.
5. Reglas de `AGENTS.md`: inmutabilidad, tamaños, sin PII en consola, sin `innerHTML` con datos.
6. code-reviewer siempre; security-reviewer en s3, s6, s7, s8, s9, s14; qa-reviewer en s13.
