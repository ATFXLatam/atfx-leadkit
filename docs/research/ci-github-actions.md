# Reference Brief: workflow de CI de verificacion en GitHub Actions

Slug: ci-github-actions | Nivel: quick | Fecha: 2026-10-01 | Estado: APROBADO
Versiones: esbuild=0.28.2, typescript=5.9.3, vitest=5.0.3, zod=3.25.76
Verificador: research-verifier 2026-10-01 ESCALATE

## 1. Pregunta y decisiones abiertas

Que forma debe tener `.github/workflows/ci.yml` para el repo publico `ATFXLatam/atfx-leadkit`: un workflow que solo verifica (typecheck, `test:cov` con umbral 80 %, build con esbuild) en `pull_request` y en `push` a `main`, y que sirva como check requerido de la proteccion de `main`. Fuera de alcance: release, tags y publicacion npm (s14, BLOQUEADA).

Reuso. `embed-form-distribution` y `forms-v2-distribution` ya fijaron, con fuentes leidas el mismo dia, permisos minimos del token, actions por SHA completo con Dependabot y release por PR. Esos principios siguen vigentes y aqui no se reinvestigan; se re-leyeron las mismas paginas en un commit mas nuevo de `github/docs` solo para citar la version actual. Lo que si depende de versiones y se investigo de nuevo: los SHA de las actions, el runtime de Node que exigen las devDependencies actuales (los briefs previos tienen `Versiones:` de esbuild 0.23 y typescript 5.5, que ya no coinciden con este `package.json`), el cache de `setup-node` v7, `cache-mode`, y la interaccion entre filtros, nombres de job y checks requeridos.

Estado remoto leido en esta corrida con `gh api` (solo GET), no es un archivo del repo: el repo es publico y pertenece a una organizacion; `main` esta protegida con `enforce_admins` activo, 0 aprobaciones requeridas y ningun check requerido todavia; no hay rulesets; el permiso por defecto del `GITHUB_TOKEN` es `read`; la politica `sha_pinning_required` esta en `false`.

Decisiones a sostener:
- D1. Permisos del token: `permissions: {}` a nivel de workflow con `contents: read` en el job, o `contents: read` a nivel de workflow.
- D2. Fijar `actions/checkout` y `actions/setup-node` por SHA (candidatos v7.0.1 `3d3c42e5aac5ba805825da76410c181273ba90b1` y v7.0.0 `820762786026740c76f36085b0efc47a31fe5020`) con `persist-credentials: false`.
- D3. Instalacion: `npm ci --ignore-scripts` con `cache: npm` de `setup-node`.
- D4. Runtime: Node 22.
- D5. Concurrencia: `cancel-in-progress` para todo o solo para PR.
- D6. Sin filtros de `paths`, un solo job con nombre estable como check requerido, y `timeout-minutes`.
- D7. Dependabot solo para `github-actions` (ya existe).

## 2. Estado actual

- No existe ningun workflow: `.github/` solo contiene `dependabot.yml` [repo:.github/dependabot.yml:1]
- Dependabot ya esta configurado solo para el ecosistema `github-actions`, semanal [repo:.github/dependabot.yml:5]
- El comentario del archivo dice que las deps npm se suben a mano porque cada version cambia el SRI de las landings [repo:.github/dependabot.yml:3]
- El script `typecheck` es `tsc --noEmit` [repo:package.json:6]
- El script `test:cov` es `vitest run --coverage` [repo:package.json:9]
- El script `build` invoca la API JS de esbuild via `node esbuild.config.mjs`, no el binario CLI [repo:package.json:10]
- `esbuild.config.mjs` importa esbuild como modulo (`import * as esbuild from "esbuild"`) [repo:esbuild.config.mjs:3]
- Vitest corre en entorno `jsdom` [repo:vitest.config.ts:5]
- El umbral de cobertura es 80 en lines, branches, functions y statements [repo:vitest.config.ts:11]
- Hay `package-lock.json` en lockfileVersion 3, condicion para `npm ci` [repo:package-lock.json:4]
- `package.json` no declara `engines` ni `packageManager`, asi que nada fija la version de Node del proyecto [repo:package.json:1]
- jsdom 30.1.1 exige Node `^22.22.2 || ^24.15.0 || >=26.0.0` [repo:package-lock.json:1452]
- vitest 5.0.3 exige Node `^22.12.0 || ^24.0.0 || >=26.0.0` [repo:package-lock.json:2208]
- @vitest/coverage-v8 5.0.3 exige Node `>=22` [repo:package-lock.json:1123]
- Solo dos paquetes del lockfile declaran install scripts: `esbuild` y `fsevents` (este ultimo solo macOS) [repo:package-lock.json:1385]
- `.gitignore` excluye `dist/` y `coverage/`, asi que el build y la cobertura del CI no se commitean [repo:.gitignore:2]
- La sesion s14 planea `permissions: {}` a nivel workflow y `contents: read` en los jobs de verificacion [repo:docs/specs/sessions/s14-distribucion-ci.md:24]
- La sesion s14 planea que el mismo `ci.yml` exija ademas `e2e` y `size`, que hoy no existen como scripts [repo:docs/specs/sessions/s14-distribucion-ci.md:26]
- La decision D-18 (proteccion de ramas, PR obligatorio) sigue PENDIENTE en el registro de decisiones [repo:docs/specs/02-decisiones.md:26]
Contextos: runner hospedado `ubuntu-latest` (Ubuntu 24.04) en `pull_request` desde una rama del mismo repo; `pull_request` desde un fork (repo publico); `pull_request` abierto por Dependabot; `push` a `main` tras el merge; evaluacion del check requerido por la proteccion de `main`; maquina local de desarrollo que corre los mismos scripts npm

## 3. Fuentes primarias

- GitHub recomienda que el `GITHUB_TOKEN` tenga por defecto solo lectura de contenidos y subir permisos por job cuando haga falta [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/actions/reference/security/secure-use.md@0b8c768]
- Si se especifica el acceso de cualquier permiso del token, todos los no especificados quedan en `none` [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/data/reusables/actions/github-token-scope-descriptions.md@0b8c768]
- En un `pull_request` desde un fork, sin el ajuste "Send write tokens", los permisos de escritura se rebajan a lectura [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/actions/reference/workflows-and-actions/workflow-syntax.md@0b8c768]
- Fijar una action a un SHA completo es hoy la unica forma de usarla como release inmutable, y el SHA debe verificarse en el repo de la action y no en un fork [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/actions/reference/security/secure-use.md@0b8c768]
- GitHub ofrece una politica de repo u organizacion que exige que toda action este fijada a un SHA completo [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/data/reusables/actions/actions-use-policy-settings.md@0b8c768]
- Dependabot no crea alertas para actions fijadas por SHA; las version updates si abren PR para actualizarlas [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/actions/reference/security/secure-use.md@0b8c768]
- Dependabot aplica por defecto un cooldown de 3 dias a version updates, que no aplica a security updates [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/data/reusables/dependabot/default-cooldown-period.md@0b8c768]
- El tag `v7.0.1` de `actions/checkout` apunta al commit `3d3c42e5aac5ba805825da76410c181273ba90b1`, publicado el 2026-07-20 [doc:https://github.com/actions/checkout/releases/tag/v7.0.1@v7.0.1]
- El tag `v7.0.0` de `actions/setup-node` apunta al commit `820762786026740c76f36085b0efc47a31fe5020`, publicado el 2026-07-14 como release inmutable [doc:https://github.com/actions/setup-node/releases/tag/v7.0.0@v7.0.0]
- `actions/checkout` en ese SHA tiene `persist-credentials` con default `true` y corre sobre `node24` [doc:https://github.com/actions/checkout/blob/3d3c42e5aac5ba805825da76410c181273ba90b1/action.yml@v7.0.1]
- El README de checkout dice que el token persistido permite comandos git autenticados y que `persist-credentials: false` lo desactiva [doc:https://github.com/actions/checkout/blob/3d3c42e5aac5ba805825da76410c181273ba90b1/README.md@v7.0.1]
- `actions/setup-node` v7 solo activa el cache automatico de npm si `package.json` declara `packageManager` o `devEngines.packageManager`; si no, hay que pasar `cache: npm` [doc:https://github.com/actions/setup-node/blob/820762786026740c76f36085b0efc47a31fe5020/README.md@v7.0.0]
- setup-node recomienda desactivar el cache automatico en workflows con privilegios elevados o acceso a informacion sensible [doc:https://github.com/actions/setup-node/blob/820762786026740c76f36085b0efc47a31fe5020/README.md@v7.0.0]
- setup-node cachea los datos globales del gestor de paquetes con la llave del hash del lockfile y no cachea `node_modules` [doc:https://github.com/actions/setup-node/blob/820762786026740c76f36085b0efc47a31fe5020/README.md@v7.0.0]
- Con `check-latest: false` (default) setup-node usa primero la version del toolcache del runner que cumpla el semver [doc:https://github.com/actions/setup-node/blob/820762786026740c76f36085b0efc47a31fe5020/docs/advanced-usage.md@v7.0.0]
- La imagen Ubuntu 24.04 (`ubuntu-latest`) trae Node 22.23.2 y 24.21.0 en el toolcache [doc:https://github.com/actions/runner-images/blob/57b93f2cf7eda14a6a71f3175d15218626cdbd4c/images/ubuntu/Ubuntu2404-Readme.md@20260920.314.1]
- La etiqueta `ubuntu-latest` apunta hoy a Ubuntu 24.04 [doc:https://github.com/actions/runner-images/blob/57b93f2cf7eda14a6a71f3175d15218626cdbd4c/README.md@57b93f2]
- Node 22 (Jod) esta en Maintenance LTS desde 2025-10-21 y llega a fin de vida el 2027-04-30; Node 24 pasa a maintenance el 2026-10-20 y termina el 2028-04-30 [doc:https://github.com/nodejs/Release/blob/72fdab20216c5f04e0a0fe72a225c2504e9f2b42/schedule.json@72fdab2]
- `npm ci` falla si el lockfile no coincide con `package.json` y borra `node_modules` antes de instalar [doc:https://docs.npmjs.com/cli/v11/commands/npm-ci@11]
- Con `ignore-scripts`, `npm run <script>` sigue ejecutando el script pedido pero no sus pre y post scripts [doc:https://docs.npmjs.com/cli/v11/commands/npm-ci@11]
- esbuild documenta que con `--ignore-scripts` no corre su install script pero npm igual instala el binario de la plataforma desde las optionalDependencies, con un costo extra solo para el comando CLI [doc:https://esbuild.github.io/getting-started/@0.28.2]
- Vitest 5.0.3 pone `process.exitCode = 1` cuando la cobertura no alcanza un umbral, asi que `test:cov` falla el job [doc:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/packages/vitest/src/node/coverage.ts#L586@v5.0.3]
- Un workflow que se salta por filtro de `paths`, de `branches` o por mensaje de commit deja sus checks en "Pending" y bloquea el merge; GitHub recomienda no exigir workflows que se puedan saltar [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks.md@0b8c768]
- Un job saltado por un condicional `if` reporta "Success", no Pending [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks.md@0b8c768]
- Solo los checks de runs disparados por `push`, `pull_request`, `pull_request_review`, `pull_request_target`, `deployment` o `deployment_status` cuentan para un check requerido; `workflow_dispatch` no [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks.md@0b8c768]
- Con checks requeridos, los nombres de job deben ser unicos entre todos los workflows, o el resultado es ambiguo y bloquea el PR [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches.md@0b8c768]
- Los checks requeridos pueden ser estrictos (rama al dia con la base, el default) o laxos [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches.md@0b8c768]
- `cancel-in-progress: true` cancela el run en curso del mismo grupo de concurrencia, y acepta una expresion para cancelar condicionalmente [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/data/reusables/actions/actions-group-concurrency.md@0b8c768]
- `jobs.<job_id>.timeout-minutes` tiene default 360 minutos [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/actions/reference/workflows-and-actions/workflow-syntax.md@0b8c768]
- Un cache creado por un run de `pull_request` queda limitado al merge ref y no lo puede restaurar ni la rama base ni otro PR [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/actions/reference/workflows-and-actions/dependency-caching.md@0b8c768]
- Solo triggers confiables como `push` pueden escribir cache en el scope de la rama por defecto; `pull_request` no esta afectado por esa restriccion porque ya queda en su merge ref [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/actions/reference/workflows-and-actions/dependency-caching.md@0b8c768]
- La clave `cache-mode` (`read`, `write`, `write-only`, `none`) limita el acceso al cache por workflow o por job [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/actions/reference/workflows-and-actions/dependency-caching.md@0b8c768]
- GitHub advierte que cualquiera con lectura puede abrir un PR y leer el contenido del cache, asi que no se guardan secretos en rutas cacheadas [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/actions/reference/workflows-and-actions/dependency-caching.md@0b8c768]
- zizmor (auditor estatico de workflows) recomienda `permissions: {}` a nivel workflow, `persist-credentials: false` salvo que se necesite git autenticado, y limita su audit de cache-poisoning a workflows de release que publican artefactos [doc:https://docs.zizmor.sh/audits/@2026-10-01]

## 4. Implementaciones de referencia

- Vitest (vitest-dev, framework de test que usa este repo, CI activo con zizmor) fija `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` con `persist-credentials: false` [ref:https://github.com/vitest-dev/vitest/blob/ad208cc2911a0b48a6afae8bcae2f67de1393089/.github/workflows/ci.yml#L38@ad208cc]
- Vitest declara `permissions: {}` a nivel de workflow en su CI [ref:https://github.com/vitest-dev/vitest/blob/ad208cc2911a0b48a6afae8bcae2f67de1393089/.github/workflows/ci.yml#L5@ad208cc]
- Vitest usa concurrencia por numero de PR o ref con `cancel-in-progress: true` en su CI [ref:https://github.com/vitest-dev/vitest/blob/ad208cc2911a0b48a6afae8bcae2f67de1393089/.github/workflows/ci.yml#L17@ad208cc]
- Vitest pone `timeout-minutes: 10` en su job de lint [ref:https://github.com/vitest-dev/vitest/blob/ad208cc2911a0b48a6afae8bcae2f67de1393089/.github/workflows/ci.yml#L31@ad208cc]
- Vitest fija `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0` en su action compuesta de setup, con cache del gestor de paquetes [ref:https://github.com/vitest-dev/vitest/blob/ad208cc2911a0b48a6afae8bcae2f67de1393089/.github/actions/setup-and-cache/action.yml#L17@ad208cc]
- En su workflow de zizmor, Vitest cancela en curso solo fuera de `main` (`cancel-in-progress: ${{ github.ref_name != 'main' }}`) [ref:https://github.com/vitest-dev/vitest/blob/ad208cc2911a0b48a6afae8bcae2f67de1393089/.github/workflows/zizmor.yml#L16@ad208cc]
- jsdom (dependencia directa de este repo, mantenida por el equipo de jsdom) corre CI en `push` y `pull_request` a `main` con `permissions: contents: read` a nivel de workflow [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/.github/workflows/jsdom-ci.yml#L9@0a117f4]
- jsdom prueba explicitamente su minimo 22.22.2 ademas de `22` en la matriz, para que el piso de `engines` no se rompa en silencio [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/.github/workflows/jsdom-ci.yml#L55@0a117f4]
- jsdom, aun siendo referencia, fija sus actions por tag mayor (`actions/checkout@v7`) y no por SHA [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/.github/workflows/jsdom-ci.yml#L17@0a117f4]
- Typeform embed (widget embebible del mismo tipo que este repo) corre build y `test:coverage` como jobs de pull request antes de llegar a `main` [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/.github/workflows/pull-request.yml@ffcede3]

## 5. Opciones

| Decision | Opcion | Pros | Contras | Recomendacion |
|---|---|---|---|---|
| D1 permisos | A. `permissions: {}` global + `contents: read` en el job | Coincide con s14, con zizmor y con Vitest; un job futuro no hereda nada | Una linea mas | Recomendada |
| D1 permisos | B. `contents: read` global | Coincide con jsdom y con la guia de GitHub; mas corto | Todo job futuro hereda lectura sin pedirla | Valida |
| D2 pins | SHA completo + comentario `# vX.Y.Z` + `persist-credentials: false` | Inmutable; el SHA ya lo usa Vitest; ningun paso necesita git autenticado | Dependabot no alerta sobre SHA, solo actualiza | Recomendada |
| D3 instalacion | `npm ci --ignore-scripts` + `cache: npm` | No corre scripts de terceros; cache llaveado por lockfile; el job no tiene secretos ni publica | Depende de que esbuild funcione sin postinstall | Recomendada, con la prueba de la seccion 9 |
| D3 instalacion | Sin cache (`package-manager-cache: false`) | Elimina cualquier discusion de cache | Mas lento en cada run | Solo si el workflow gana privilegios |
| D4 runtime | Node 22 | Cumple todos los `engines`; toolcache trae 22.23.2 | Maintenance LTS, fin de vida 2027-04-30 | Valida, ver seccion 9 |
| D4 runtime | Node 24 | LTS hasta 2028-04-30; cumple todos los `engines` | Puede diferir del Node local si este es 22 | Valida, ver seccion 9 |
| D5 concurrencia | `cancel-in-progress: true` siempre | Simple; ejemplo de la doc de GitHub | Un push a `main` puede cancelar la verificacion del commit anterior de `main` | Valida |
| D5 concurrencia | `cancel-in-progress` solo en `pull_request` | Ahorra minutos en PR y deja cada commit de `main` verificado | Expresion en vez de literal | Recomendada |
| D6 forma | Un job `verify` con typecheck, test:cov y build en serie, sin `paths` | Un solo check requerido, un solo `npm ci` | Un fallo temprano oculta los siguientes | Recomendada |
| D6 forma | Tres jobs en paralelo | Ves los tres resultados a la vez | Tres checks que exigir y tres `npm ci` | No por ahora |

## 6. Evidencia en contra

- Contra el cache: setup-node aconseja desactivarlo en workflows con privilegios; aqui se acepta porque el job solo tiene `contents: read`, no tiene secretos y no publica, y el cache de un PR no llega al scope de `main` [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/actions/reference/workflows-and-actions/dependency-caching.md@0b8c768]
- Contra el cache, segunda parte: cuando s14 agregue un workflow de release que publique, ese workflow no debe reusar el cache, que es exactamente lo que audita zizmor [doc:https://docs.zizmor.sh/audits/@2026-10-01]
- Contra los pins por SHA: quitan las alertas de Dependabot para esas actions; se acepta porque las version updates ya estan activas y GitHub las da como el mecanismo para mantener los pins [repo:.github/dependabot.yml:5]
- Contra `--ignore-scripts`: esbuild dice que la forma optima de instalarlo es sin ese flag; se acepta porque el costo extra que describe es del comando CLI y el build usa la API JS [doc:https://esbuild.github.io/getting-started/@0.28.2]
- Contra Node 22: le quedan siete meses de vida a la fecha de este brief y jsdom ya exige 22.22.2 o mas, asi que el piso sube; no lo resuelvo yo, queda en la seccion 9 [doc:https://github.com/nodejs/Release/blob/72fdab20216c5f04e0a0fe72a225c2504e9f2b42/schedule.json@72fdab2]
- Contra cancelar siempre: el ejemplo de GitHub con `ci-${{ github.ref }}` cancela el run anterior de `main` al llegar un push nuevo, y ese commit queda sin verificacion propia [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/data/reusables/actions/actions-group-concurrency.md@0b8c768]

## 7. Ejemplares y anti-ejemplos

- Bien: `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` con `persist-credentials: false` debajo [ref:https://github.com/vitest-dev/vitest/blob/ad208cc2911a0b48a6afae8bcae2f67de1393089/.github/workflows/ci.yml#L38@ad208cc]
- Bien: `uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0` [ref:https://github.com/vitest-dev/vitest/blob/ad208cc2911a0b48a6afae8bcae2f67de1393089/.github/actions/setup-and-cache/action.yml#L17@ad208cc]
- Bien: `permissions: {}` en la raiz del workflow, con el permiso que cada job necesita declarado en el job [ref:https://github.com/vitest-dev/vitest/blob/ad208cc2911a0b48a6afae8bcae2f67de1393089/.github/workflows/zizmor.yml#L12@ad208cc]
- Bien: cancelar en curso solo fuera de `main` con una expresion en `cancel-in-progress` [ref:https://github.com/vitest-dev/vitest/blob/ad208cc2911a0b48a6afae8bcae2f67de1393089/.github/workflows/zizmor.yml#L16@ad208cc]
- Anti-ejemplo: un workflow con `paths:` en `push` exigido como check; el propio zizmor.yml de Vitest filtra por `paths` y por eso no podria ser check requerido de una rama protegida [ref:https://github.com/vitest-dev/vitest/blob/ad208cc2911a0b48a6afae8bcae2f67de1393089/.github/workflows/zizmor.yml#L9@ad208cc]
- Anti-ejemplo: actions por tag mayor (`actions/checkout@v7`), aun en un proyecto de referencia [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/.github/workflows/jsdom-ci.yml#L17@0a117f4]

## 8. Trampas

- Renombrar el job, o repetir su nombre en el futuro `release.yml` de s14, deja el check requerido ambiguo o esperando un nombre que ya no reporta [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches.md@0b8c768]
- Un filtro de `paths` o `branches` que salte el workflow deja el check en Pending para siempre; si algo debe saltarse, que sea un paso con `if`, que reporta Success [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks.md@0b8c768]
- Sin `cache: npm` explicito no hay cache, porque `package.json` no declara `packageManager` [doc:https://github.com/actions/setup-node/blob/820762786026740c76f36085b0efc47a31fe5020/README.md@v7.0.0]
- `node-version: 22` toma la 22.x del toolcache del runner; si una imagen futura trajera una 22 menor que 22.22.2, jsdom quedaria fuera de su rango de `engines` [repo:package-lock.json:1452]
- Agregar `npm run e2e` o `npm run size` al job antes de que existan esos scripts rompe el check; s14 los lista pero hoy no estan en `package.json` [repo:package.json:5]
- Exigir el check en la proteccion antes de que el workflow haya corrido una vez deja el PR que lo introduce sin poder mergear, porque `enforce_admins` esta activo y el check aun no existe [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks.md@0b8c768]
- Contexto `pull_request` desde rama propia: el job corre con `contents: read` y sin secretos, y el cache que escribe queda en el merge ref del PR [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/actions/reference/workflows-and-actions/dependency-caching.md@0b8c768]
- Contexto `pull_request` desde fork: los permisos de escritura se rebajan a lectura, lo que no afecta a un job que solo lee [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/actions/reference/workflows-and-actions/workflow-syntax.md@0b8c768]
- Contexto `push` a `main`: es el unico trigger de este workflow que escribe cache en el scope de `main`, del que leen los PR siguientes [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/actions/reference/workflows-and-actions/dependency-caching.md@0b8c768]
- Contexto proteccion de `main`: solo cuentan los checks de runs `push` o `pull_request`; un `workflow_dispatch` agregado para depurar no satisface el check [doc:https://github.com/github/docs/blob/0b8c768bf0d5a13560ec82fd3daa414137e2e436/content/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks.md@0b8c768]
- Contexto maquina local: el proyecto no fija Node con `engines` ni `.nvmrc`, asi que el CI puede verificar con un Node distinto del que usa quien desarrolla [repo:package.json:1]
- Contexto PR de Dependabot: su comportamiento con este workflow no se verifico en esta corrida; queda como supuesto con prueba en la seccion 9 [repo:.github/dependabot.yml:5]

## 9. Incertidumbre

- ASSUMPTION: `npm ci --ignore-scripts` deja la API JS de esbuild 0.28.2 operativa en Linux x64, como dice su documentacion. prueba: el primer run del workflow en el PR que lo introduce; `npm run build` debe pasar y producir `dist/`.
- ASSUMPTION: un PR abierto por Dependabot dispara el workflow y reporta el check sin necesitar secretos. prueba: el primer PR semanal de Dependabot muestra el check `verify` en verde o rojo, no ausente.
- ASSUMPTION: el nombre de contexto que pide la proteccion es el `name` del job (por ejemplo `verify`), no el del workflow. prueba: tras el primer run, `gh api repos/ATFXLatam/atfx-leadkit/commits/<sha>/check-runs --jq '.check_runs[].name'` y usar ese nombre exacto.
- [NEEDS CLARIFICATION: Node 22 o Node 24 en CI. Las dos cumplen todos los `engines`; 22 termina el 2027-04-30 y 24 el 2028-04-30. Que Node usas en local?]
- [NEEDS CLARIFICATION: `cancel-in-progress` siempre, o solo en PR para que cada commit de `main` quede verificado?]
- [NEEDS CLARIFICATION: el check requerido, estricto (rama al dia con `main`, default de GitHub) o laxo? Con un solo colaborador, estricto obliga a actualizar la rama tras cada merge.]
- [NEEDS CLARIFICATION: activar la politica del repo "Require actions to be pinned to a full-length commit SHA" para que el pin no dependa solo de revision? Hoy `sha_pinning_required` esta en false.]

## 10. Checklist de estandar

- [ ] `.github/workflows/ci.yml` se dispara en `pull_request` y en `push` a `main`, sin `paths`, `paths-ignore` ni `branches-ignore`.
- [ ] La raiz del workflow tiene `permissions: {}` y el job declara solo `contents: read`.
- [ ] `actions/checkout` esta en `3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` con `persist-credentials: false`, y `actions/setup-node` en `820762786026740c76f36085b0efc47a31fe5020 # v7.0.0`.
- [ ] Ningun `uses:` del workflow apunta a un tag o rama; todos son SHA de 40 hex con comentario de version.
- [ ] setup-node declara la version de Node elegida y `cache: npm`.
- [ ] La instalacion es `npm ci --ignore-scripts`, sin `npm install`.
- [ ] Los pasos son `npm run typecheck`, `npm run test:cov` y `npm run build`, sin `|| true` ni `continue-on-error`.
- [ ] Bajar la cobertura de un archivo por debajo de 80 hace fallar el job (comprobado una vez en una rama de prueba).
- [ ] El job tiene `timeout-minutes` explicito y muy por debajo del default de 360.
- [ ] Hay `concurrency` con grupo por workflow y PR o ref, y `cancel-in-progress` segun lo que Karen decida.
- [ ] El job tiene un `name` unico entre todos los workflows del repo, y ese nombre es el que se agrega como check requerido despues del primer run en verde.
- [ ] `.github/dependabot.yml` sigue con solo `github-actions`.
- [ ] El workflow no usa secretos, ni `pull_request_target`, ni `id-token`.

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | Secure use reference (Actions) | GitHub docs | 0b8c768 | 2026-10-01 | high |
| 2 | GITHUB_TOKEN permission scopes (reusable) | GitHub docs | 0b8c768 | 2026-10-01 | high |
| 3 | Workflow syntax (permissions, timeout-minutes) | GitHub docs | 0b8c768 | 2026-10-01 | high |
| 4 | Actions use policy settings (SHA pinning policy) | GitHub docs | 0b8c768 | 2026-10-01 | high |
| 5 | Dependabot default cooldown (reusable) | GitHub docs | 0b8c768 | 2026-10-01 | high |
| 6 | Troubleshooting required status checks | GitHub docs | 0b8c768 | 2026-10-01 | high |
| 7 | About protected branches | GitHub docs | 0b8c768 | 2026-10-01 | high |
| 8 | Concurrency groups (reusable) | GitHub docs | 0b8c768 | 2026-10-01 | high |
| 9 | Dependency caching reference | GitHub docs | 0b8c768 | 2026-10-01 | high |
| 10 | actions/checkout release v7.0.1, action.yml y README | GitHub (actions) | v7.0.1 3d3c42e | 2026-10-01 | high |
| 11 | actions/setup-node release v7.0.0, README y advanced-usage | GitHub (actions) | v7.0.0 8207627 | 2026-10-01 | high |
| 12 | runner-images README y Ubuntu 24.04 readme | GitHub (actions) | 20260920.314.1 | 2026-10-01 | high |
| 13 | Node.js release schedule.json | Node.js Release WG | 72fdab2 | 2026-10-01 | high |
| 14 | npm ci | npm docs | v11 | 2026-10-01 | high |
| 15 | esbuild Getting Started | esbuild (Evan Wallace) | 0.28.2 | 2026-10-01 | high |
| 16 | vitest coverage.ts (umbrales) | vitest-dev | v5.0.3 33cadea | 2026-10-01 | high |
| 17 | zizmor audits | zizmor | 2026-10-01 | 2026-10-01 | medium |
| 18 | vitest CI, setup-and-cache y zizmor workflows | vitest-dev | ad208cc | 2026-10-01 | high |
| 19 | jsdom CI workflow | jsdom | 0a117f4 | 2026-10-01 | high |
| 20 | Typeform embed pull-request workflow | Typeform | ffcede3 | 2026-10-01 | high |
| 21 | Estado remoto de ATFXLatam/atfx-leadkit (repo, proteccion, Actions) por gh api GET | GitHub API | 2026-10-01 | 2026-10-01 | high |
