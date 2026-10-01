# Programa atfx-leadkit

Repo: `/Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit` (D-01). Toda sesión
escribe solo ahí. Roles y reglas: `AGENTS.md`.

## Documentos

| Archivo | Qué es |
|---|---|
| `01-requisitos.md` | Spec: RF, RNF, criterios de aceptación (CA), seguridad, plan de pruebas |
| `02-decisiones.md` | Decisiones con default y estado; las PENDIENTES bloquean sesiones |
| `03-contrato-salesforce.md` | Payload exacto: la verdad que ningún cambio puede romper |
| `04-arquitectura.md` | Estructura de carpetas, módulos y APIs entre ellos |
| `sessions/sNN-*.md` | Una unidad de trabajo para el implementador |
| `../review/` | Handoffs del implementador y veredictos del reviewer |
| `../research/` | Briefs con fuentes que sostienen las decisiones |

## Sesiones

Estados: `LISTA` (se puede implementar), `BLOQUEADA` (espera decisión), `HECHA` (APPROVE del
reviewer y commit de Karen). Una sesión empieza solo cuando todas sus dependencias están HECHAS.

| Sesión | Quién | Qué | Depende de | Decisiones | Estado |
|---|---|---|---|---|---|
| s0 | Karen | Bootstrap: git, GitHub, dependencias | — | D-01, D-02, D-03, D-18 | HECHA |
| s1 | Implementador | Tooling: tsconfig, esbuild multi-entry, vitest, scripts (bundle JS autocontenido por formulario) | s0 | — | HECHA (PR #1) |
| s2 | Implementador | Contrato: constructor del payload + tests golden | s1 | D-09 | HECHA (PR #5) |
| s3 | Implementador | Atributos de montaje + URL de Zoom + fechas/zonas/cierre | s1 | D-04, D-25 | LISTA |
| s4 | Implementador | Datos (países, prefijos) + i18n | s1 | — | HECHA (PR #4) |
| s5 | Implementador | Schemas de validación de `lead` e `interest` | s4 | D-08 | EN CURSO (Grok) |
| s6 | Implementador | Cliente de envío (sin reintentos, resultado desconocido) | s2 | D-07 | HECHA |
| s7 | Implementador | Render de UI + CSS + honeypot | s3, s4, s5 | D-05, D-10 | BLOQUEADA |
| s8 | Implementador | Controlador: submit, errores, popup, analítica aislada | s6, s7 | D-12 | BLOQUEADA |
| s9 | Implementador | Montaje: idempotente, tardío, multi-instancia, entries | s8 | D-11 | BLOQUEADA |
| s10 | Implementador | Caducidad en cliente con `data-opens-at` / `data-closes-at` y CTA de cerrado | s9 | D-14, D-21, D-22, D-24 | BLOQUEADA |
| s11 | Implementador | Thank-you inline con variantes webinar/producto y conversiones post `success:true` | s9 | D-16, D-24, D-25, D-26, D-27, D-28 | BLOQUEADA |
| s12 | Implementador | Cumplimiento: avisos y textos legales por idioma | s9 | D-06, D-17, D-28 | BLOQUEADA |
| s13 | Implementador | E2E Playwright + presupuesto de peso | s9 | D-19 | BLOQUEADA |
| s14 | Implementador + Karen | Distribución y CI de release (npm + SRI + provenance) | s13 | D-13, D-18, D-29, D-30, D-31, D-32 | BLOQUEADA |
| s15 | Karen / IT | Caducidad y anti-abuso del lado del servidor (mu-plugin WordPress) | s10 | D-14, D-15, D-20, D-21, D-22, D-23, D-24 | BLOQUEADA |
| s16 | Karen | `/pentest` sobre el harness local antes del primer release | s13, s14 | — | BLOQUEADA |

Orden sugerido en paralelo (cuando haya más de un implementador): tras s1, las sesiones s2, s3 y
s4 son independientes entre sí.

## Ciclo de cada sesión

1. Karen abre la sesión en Cursor o Grok con: `Implementa docs/specs/sessions/sNN-*.md siguiendo AGENTS.md`.
2. El implementador hace RED → GREEN → IMPROVE y escribe `docs/review/sNN-handoff.md`.
3. Karen pide a Claude Code: `revisa sNN`.
4. El reviewer corre typecheck, tests y cobertura; revisa contra los CA de la sesión; corre
   code-reviewer y, si toca frontera de confianza, security-reviewer; escribe
   `docs/review/sNN-review.md` con `VERDICT: APPROVE | CHANGES | BLOCK`.
5. CHANGES → la misma sesión corrige y vuelve al paso 3. APPROVE → Karen commitea y marca HECHA.

## Fuera del programa

- Migrar landings viejas: no se hace. Siguen con `at_forms` y `atfx-forms-newAug26`.
- Cambios en Salesforce, en el middleware o en el form #593 de Elementor: se piden a CRM/IT.
