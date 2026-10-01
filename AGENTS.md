# atfx-leadkit — instrucciones para el implementador (Cursor, Grok, cualquier agente)

Paquete nuevo de captación de leads para las landings de ATFX LATAM. Reemplaza a `at_forms`
(`atfx-forms`) y a `atfx-forms-newAug26`, que quedan deprecados para siempre: las landings
viejas siguen con ellos y no se migran.

## Ruta del repo (única fuente)

```
/Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit
```

Todo el código se escribe aquí. Si esta ruta no existe en disco, o no tiene `.git`,
**detente**: la sesión s0 (bootstrap) no se ha hecho.

## Roles

| Rol | Quién | Hace | No hace |
|---|---|---|---|
| Implementador | Cursor / Grok | Una sesión de `docs/specs/sessions/` por vez, test primero | Commits, push, instalar dependencias fuera de la lista aprobada, tocar sesiones BLOQUEADAS |
| Reviewer | Claude Code | Revisa cada sesión contra sus criterios de aceptación y escribe el veredicto | Escribir código de producto |
| Dueña | Karen | git, dependencias, deploy, decisiones de `docs/specs/02-decisiones.md` | — |

## Reglas duras

1. **Una sesión a la vez**, en el orden de `docs/specs/00-programa.md`. No empieces una sesión
   cuyo estado no sea `LISTA`. Una sesión `BLOQUEADA` espera una decisión de Karen.
2. **Test primero.** Escribe los tests de la sesión, córrelos y confirma que fallan (RED). Luego
   implementa lo mínimo (GREEN). Luego limpia (IMPROVE). Pega la salida de RED y de GREEN en el
   handoff.
3. **Solo los archivos que lista la sesión.** Si necesitas otro, detente y anótalo en el handoff
   como desviación; no lo crees.
4. **El contrato con Salesforce es intocable.** `docs/specs/03-contrato-salesforce.md` define cada
   llave y valor. Ningún cambio de nombre, valor o llave sin una decisión firmada por Karen.
5. **Dependencias:** solo las de `docs/specs/02-decisiones.md` con estado APROBADA. Nunca
   `npm install <nuevo>`. Si algo falta, detente.
6. **Nunca** llames a `www.atfxlatam.com`, a `admin-ajax.php` real, a Salesforce ni a servicios de
   geo-IP desde tests o scripts. Todo envío se prueba contra mocks locales.
7. **Inmutabilidad:** funciones que devuelven objetos nuevos; nada de mutar argumentos, `hidden[x] =`
   sobre configs compartidas, ni métodos pegados a nodos del DOM.
8. **Tamaños:** funciones < 50 líneas, archivos < 400 líneas (800 máximo), anidación ≤ 4.
9. **Comentarios solo del porqué**, nunca del qué. Sin emojis en código, docs ni mensajes.
10. **Sin secretos** en el repo: el bundle es público.
11. Si algo del spec es ambiguo o contradice al código, **pregunta** (anótalo en el handoff y
    detente); no adivines.

## Al terminar una sesión

Escribe `docs/review/sNN-handoff.md` con:
- archivos creados o modificados;
- salida de `npm run typecheck`, `npm test` (RED y GREEN) y, si aplica, `npm run e2e`;
- cobertura de los archivos de la sesión;
- desviaciones del spec y preguntas.

Luego detente. Karen pide la revisión; el reviewer escribe `docs/review/sNN-review.md` con
`VERDICT: APPROVE | CHANGES | BLOCK`. Solo con APPROVE Karen commitea y se pasa a la sesión
siguiente.

## Comandos

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest run (jsdom)
npm run test:cov    # cobertura, umbral 80 %
npm run e2e         # Playwright contra harness local (desde s13)
npm run build       # esbuild, un bundle por formulario
npm run size        # presupuesto de peso (desde s13)
```

## Referencias de solo lectura

- Repo viejo (NO copiar su arquitectura; solo datos): `/Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-forms`
  - `src/data/options.ts` — listas de países (ISO3) y prefijos.
  - `src/i18n/index.ts` — textos es/en/pt existentes.
- Fork viejo con buenas piezas: `/Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-forms-newAug26`
  - `src/core/url.ts` (allowlist de Zoom), `src/core/geo.ts` (geo con consentimiento),
    `src/ui/atoms/select.test.ts` (patrón de tests).
- Investigación: `docs/research/` (briefs con fuentes).
- Auditoría que motiva el rediseño: `~/Desktop/security-audit-atfx-forms-2026-10-01.md`.
