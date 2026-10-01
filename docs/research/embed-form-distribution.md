# Reference Brief: distribucion, integridad, testing y release del widget embebible atfx-forms

Slug: embed-form-distribution | Nivel: deep | Fecha: 2026-10-01 | Estado: ESCALADO
Versiones: esbuild=0.23, typescript=5.5, zod=3.23, gsap=3.15
Verificador: research-verifier 2026-10-01 ESCALATE

## 1. Pregunta y decisiones abiertas

Para recrear el widget JS embebible que montan las landings WordPress/Elementor de www.atfxlatam.com, cual es el estandar de industria para distribuirlo, garantizar su integridad, probarlo y liberarlo. El brief alimenta la spec de la recreacion; no decide.

Insumos leidos en esta corrida: el CLAUDE.md y el codigo del repo, el fork hermano `atfx-forms-newAug26` (repo privado `karenrebecag/at_forms_aug26`, no citable por permalink publico: su `vercel.json` sirve `/loader.js` con `max-age=300, must-revalidate` y `/assets/*` con `max-age=31536000, immutable`, y su `buildCommand` es `npm run typecheck && npm test && npm run build`; su `esbuild.config.mjs` genera nombres `[name].[hash]` y escribe el loader con los nombres resueltos via `metafile`), y el informe `~/Desktop/security-audit-atfx-forms-2026-10-01.md` (fuera del repo; sus IDs CN-xxx y Q-xx se mencionan como referencia, no como prueba).

Bloque D1, distribucion. Canal y propiedad del origen que sirve el loader y los assets: jsDelivr `/gh/` desde el repo publico personal con `dist/` commiteado y loader `@latest` (hoy), host propio (Vercel, Cloudflare R2/Pages o un subdominio de ATFX) con loader de vida corta y assets hasheados inmutables, o npm + jsDelivr `/npm/`. Restricciones: la landing no fija versiones; la CSP del host; cuenta personal vs organizacion.

Bloque D2, integridad. Si el loader puede imponer SRI a los assets que inyecta, que aporta frente a la amenaza real (una credencial de GitHub comprometida), y si conviene sumar provenance (artifact attestations, npm provenance).

Bloque D3, testing. Unidad con vitest + jsdom/happy-dom, E2E con Playwright del bundle montado en una pagina host simulada con `admin-ajax` mockeado (sin tocar Salesforce), contract test del payload, y que cubren Typeform y Cal.com.

Bloque D4, CI y release. Gate de tests obligatorio, permisos minimos de `GITHUB_TOKEN`, actions fijadas por SHA, release por PR de release o tag vs auto-tag en cada push (hoy), branch protection/rulesets, Dependabot.

Bloque D5, performance de carga. Preconnect, CSS dentro del bundle vs link aparte, reserva de altura contra CLS, presupuesto de tamano.

## 2. Estado actual

Contextos: landing de produccion (WordPress + Elementor Pro detras de Cloudflare con Rocket Loader, www.atfxlatam.com), editor/preview de Elementor con sesion de admin de WordPress, CDN jsDelivr (cache de alias y de tags), runner de GitHub Actions (Node 20, workflow release), dev server local de esbuild en :8765 con preview.html, test local con node --test (Node 22.18 o superior), fork hermano en Vercel (solo como referencia)
- El repo es publico por requisito de jsDelivr `/gh/` y vive en la cuenta personal `karenrebecag` [repo:CLAUDE.md:11]
- El snippet de Elementor carga `cdn.jsdelivr.net/gh/karenrebecag/at_forms@latest/loader.js` [repo:CLAUDE.md:13]
- El sitio destino es WordPress + Elementor Pro detras de Cloudflare y WP Engine [repo:CLAUDE.md:14]
- El script del snippet lleva `data-cfasync="false"` antes de `src` para que Rocket Loader no lo toque [repo:CLAUDE.md:34]
- La resolucion de `@latest` en jsDelivr tarda varios minutos en propagar aunque el purge responda 200 [repo:CLAUDE.md:118]
- La decision vigente es no fijar versiones en Elementor y esperar la propagacion de `@latest` [repo:CLAUDE.md:120] [KAREN:atfx-forms/CLAUDE.md hallazgo 6, linea 120]
- El loader fija la version inmutable en una variable que el CI reescribe con sed [repo:loader.js:5]
- El loader apunta a `cdn.jsdelivr.net/gh/karenrebecag/at_forms` como base [repo:loader.js:6]
- El loader inyecta `forms.css` como `link rel=stylesheet` sin atributo `integrity` [repo:loader.js:10]
- El loader inyecta `forms.js` como `script type=module` con `data-cfasync=false` y sin `integrity` [repo:loader.js:16]
- El workflow de release se dispara en cada push a `main` que toque `src/`, `loader.js`, `package.json` o `esbuild.config.mjs` [repo:.github/workflows/release.yml:4]
- El token del workflow tiene `contents: write` a nivel de workflow, activo tambien durante `npm ci` [repo:.github/workflows/release.yml:14]
- Las actions estan fijadas por tag mayor (`actions/checkout@v4`), no por SHA [repo:.github/workflows/release.yml:24]
- `actions/setup-node` corre con Node 20 [repo:.github/workflows/release.yml:30]
- El unico gate antes de taggear es `npm run typecheck` [repo:.github/workflows/release.yml:36]
- El CI calcula el siguiente tag patch automaticamente a partir del tag mas alto [repo:.github/workflows/release.yml:44]
- El CI commitea `dist/` y `loader.js`, empuja a `main` y empuja el tag desde el job [repo:.github/workflows/release.yml:68]
- El purge de jsDelivr se llama con `curl -s ... || true`, que oculta cualquier fallo [repo:.github/workflows/release.yml:73]
- `package.json` no tiene script `test` ni dependencias de test [repo:package.json:7]
- El unico test usa `node:test` y necesita Node 22.18 o superior para ejecutar TS sin transpilar [repo:test/lead-meta.test.ts:1]
- `tsconfig` solo incluye `src/`, asi que los tests fuera de `src/` no se typecheckean [repo:tsconfig.json:17]
- El build emite ESM con target es2019 [repo:esbuild.config.mjs:7]
- El build de release publica source map completo [repo:esbuild.config.mjs:16]
- El dev server sirve la raiz del repo, no `dist/` [repo:esbuild.config.mjs:35]
- El bundle detecta su version leyendo un `script[src*="at_forms@"]`, acoplado a la URL de jsDelivr [repo:src/index.ts:8]
- El widget renderiza el form dentro del mount con `replaceChildren`, sin altura reservada previa [repo:src/index.ts:75]
- El boot espera `DOMContentLoaded` si el documento aun carga [repo:src/index.ts:83]
- El unico `min-height` del CSS es el del slot de error, no el del mount [repo:src/styles/forms.css:384]
- El envio va a `/wp-admin/admin-ajax.php` por defecto [repo:src/core/submit-elementor.ts:3]
- El envio usa `FormData` (multipart) y `X-Requested-With: XMLHttpRequest`, requisito para que Elementor dispare la accion de Salesforce [repo:src/core/submit-elementor.ts:28]
- El popup de Zoom se abre dentro del gesto de submit, antes del fetch [repo:src/core/form-engine.ts:104]
- Una sesion de admin de WordPress silencia la accion de Salesforce aunque responda 200 [repo:CLAUDE.md:128]
- `admin-ajax` solo permite CORS desde `https://www.atfxlatam.com` [repo:CLAUDE.md:122]
- El deploy documentado es `git push origin main` y el bot commitea sobre `main` despues [repo:CLAUDE.md:182]
- Deploy y merge son de Karen, nunca de un agente [KAREN:~/.claude/CLAUDE.md bloque block y rules/common/development-workflow.md paso 5]
- El GitHub de Karen esta vinculado a dos cuentas Vercel, el deploy por git queda bloqueado con TEAM_ACCESS_REQUIRED y el workaround es el CLI logueado como miembro del team dueno [KAREN:~/.claude/CLAUDE.md bloque vercel]
- La regla de testing exige 80% de cobertura y TDD [KAREN:spec-driven-standards/config/rules/common/testing.md]
- El orden de entrega es research, plan, TDD, review con review-gate, y el commit/PR lo abre /ship [KAREN:spec-driven-standards/config/rules/common/development-workflow.md]

## 3. Fuentes primarias

- jsDelivr cachea los alias de version, incluido `latest`, 7 dias en su CDN, con purge por API como unico acelerador [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- jsDelivr cachea versiones estaticas y commits "efectivamente para siempre" en S3, sin forma de actualizar su contenido [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- jsDelivr marca cargar `@latest` u omitir la version como "not recommended for production usage" tanto en `/npm/` como en `/gh/` [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- jsDelivr dice que el acceso al purge se da tras pedirlo por email, que aplica rate limiting y que solo funciona con releases semver validos [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- Stripe pide cargar Stripe.js siempre desde `js.stripe.com`, nunca dentro de un bundle ni auto-hospedado [doc:https://docs.stripe.com/js/including@2026-10-01]
- Stripe explica que no usa SRI y cumple PCI DSS 6.4.3 con CSP y sistemas propietarios de gestion de scripts, porque la guia PCI admite varios mecanismos de integridad [doc:https://github.com/stripe/stripe-js/issues/167#issuecomment-2391990258@2024-10-03]
- Con SRI el navegador compara el hash antes de ejecutar y, si no coincide, rechaza el recurso con error de red [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- SRI entre origenes exige CORS: el servidor debe permitir el origen, y una peticion `no-cors` con integrity siempre falla [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- MDN documenta las cabeceras `Integrity-Policy` e `Integrity-Policy-Report-Only` para exigir integrity en los scripts que carga una pagina [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- `HTMLScriptElement.integrity` refleja el atributo `integrity` y esta disponible en navegadores desde abril de 2018, asi que un script creado por JS puede llevarlo [doc:https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement/integrity@2026-10-01]
- Los scripts de modulo exigen el protocolo CORS para cargarse desde otro origen [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script@2026-10-01]
- Un script anadido dinamicamente no bloquea el render salvo que lleve `blocking="render"` [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script@2026-10-01]
- Para URLs con huella o version que nunca cambian se recomienda `Cache-Control: max-age=31536000`, y para URLs sin version `no-cache` o un `max-age` corto [doc:https://web.dev/articles/http-cache@2026-10-01]
- En Vercel los archivos estaticos se cachean en la red global durante la vida del deployment, y un archivo sin cambios puede persistir entre deployments gracias al hash del nombre [doc:https://vercel.com/docs/caching/cdn-cache@2026-09-14]
- En Vercel las cabeceras `Cache-Control` se pueden definir por ruta en `vercel.json` [doc:https://vercel.com/docs/caching/cdn-cache@2026-09-14]
- El placeholder `[hash]` de esbuild es un hash del contenido del archivo de salida [doc:https://esbuild.github.io/api/@0.23]
- El `metafile` de esbuild describe que archivos salieron del build y cuanto pesa cada uno [doc:https://esbuild.github.io/api/@0.23]
- GitHub dice que fijar una action a un SHA completo es hoy la unica forma de usarla como release inmutable [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/content/actions/reference/security/secure-use.md@56fcfa8]
- GitHub recomienda que el permiso por defecto de `GITHUB_TOKEN` sea solo lectura de contenidos y subirlo por job cuando haga falta [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/content/actions/reference/security/secure-use.md@56fcfa8]
- GitHub recomienda Dependabot version updates para mantener las actions al dia [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/content/actions/reference/security/secure-use.md@56fcfa8]
- Los rulesets controlan como se interactua con ramas y tags, incluido quien puede borrar o renombrar un tag [doc:https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets@fpt]
- Rulesets estan disponibles en repos publicos con GitHub Free y en privados solo con Pro, Team o Enterprise Cloud [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/repo-rules.md@56fcfa8]
- Las ramas protegidas estan disponibles en repos publicos con GitHub Free y en privados solo con Pro, Team o Enterprise [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/protected-branches.md@56fcfa8]
- Environments con required reviewers estan disponibles en repos publicos en todos los planes actuales; en privados con Free/Pro/Team los reviewers no estan disponibles [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/environments.md@56fcfa8]
- Artifact attestations estan disponibles en repos publicos de todos los planes actuales; en privados exigen Enterprise Cloud [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/attestations.md@56fcfa8]
- Artifact attestations por si solas dan SLSA v1.0 Build Level 2 y no garantizan que el artefacto sea seguro [doc:https://docs.github.com/en/actions/concepts/security/artifact-attestations@fpt]
- SLSA Build L2 exige una plataforma de build hospedada, no la estacion de un individuo, con provenance firmada [doc:https://slsa.dev/spec/v1.0/levels@1.0]
- npm provenance requiere GitHub Actions o GitLab CI con runners de la nube y `id-token: write`, y no garantiza ausencia de codigo malicioso [doc:https://docs.npmjs.com/generating-provenance-statements@2026-10-01]
- OpenSSF Scorecard califica Branch-Protection, Code-Review, Token-Permissions y Dependency-Update-Tool como riesgo High, Pinned-Dependencies como Medium y CI-Tests como Low [doc:https://github.com/ossf/scorecard/blob/c42b791d24f1e5863600f3f3029141b15b932d4e/docs/checks.md@c42b791]
- CSP Evaluator de Google lista `//cdn.jsdelivr.net` como origen que permite saltarse una allowlist de CSP por host [doc:https://github.com/google/csp-evaluator/blob/ad530f3ae5473f9e03c8bf500ee0ada8d9e9b822/allowlist_bypasses/jsonp.ts@ad530f3]
- CSP Evaluator tambien lista rutas de AngularJS en `cdn.jsdelivr.net` como bypass de CSP por host [doc:https://github.com/google/csp-evaluator/blob/ad530f3ae5473f9e03c8bf500ee0ada8d9e9b822/allowlist_bypasses/angular.ts@ad530f3]
- Rocket Loader ignora un script con `data-cfasync="false"` y el atributo debe ir antes de `src`; las dependencias del script necesitan el mismo atributo [doc:https://developers.cloudflare.com/speed/optimization/content/rocket-loader/ignore-javascripts/@2026-10-01]
- Un buen CLS es 0.1 o menos medido en el percentil 75 [doc:https://web.dev/articles/cls@2026-10-01]
- Para contenido inyectado dinamicamente web.dev recomienda reservar espacio con `min-height` o `aspect-ratio` y no colapsar el hueco reservado [doc:https://web.dev/articles/optimize-cls@2026-10-01]
- `preconnect` solo conviene para dominios criticos usados pronto, porque el navegador cierra la conexion sin uso a los 10 segundos [doc:https://web.dev/articles/preconnect-and-dns-prefetch@2026-10-01]
- Playwright puede mockear endpoints con `page.route` y `route.fulfill`, y el ruteo a nivel de contexto aplica tambien a popups [doc:https://playwright.dev/docs/network@2026-10-01]
- Vitest ofrece los entornos `node`, `jsdom`, `happy-dom` y `edge-runtime`, elegibles por archivo con el comentario `@vitest-environment` [doc:https://vitest.dev/guide/environment@5.0.3]
- `coverage.thresholds` de Vitest hace fallar la corrida si no se alcanza el minimo de lineas, funciones, ramas o sentencias [doc:https://vitest.dev/config/coverage@5.0.3]

## 4. Implementaciones de referencia

- Typeform embed (org Typeform, SDK oficial, 321 estrellas, push 2026-09-30): el snippet carga `embed.typeform.com/next/embed.js` desde dominio propio con un alias sin version, y el CSS como `link` aparte [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/packages/embed/README.md@ffcede3]
- Typeform embed corre build, lint, `test:coverage` (jest) y tests funcionales Cypress en cada pull request a `main` [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/.github/workflows/pull-request.yml@ffcede3]
- Typeform embed tiene specs funcionales Cypress por modo de embed (widget, popup, slider, callbacks, reload) contra una demo local servida con `start-server-and-test` [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/packages/embed/package.json@ffcede3]
- Typeform embed libera con semantic-release en cada push a `main` con `contents: write` e `id-token: write` y actions fijadas por tag, no por SHA [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/.github/workflows/release.yml@ffcede3]
- Cal.com embeds (repo de 48.8k estrellas, mantenido por Cal.com): el snippet inyecta `WEBAPP_URL/embed/embed.js` desde su propio host, sin version en la URL y sin `integrity` [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-snippet/src/index.ts@54343aa]
- Cal.com prueba el embed con Playwright sobre una pagina playground que hace de host, verifica que ningun request quede bloqueado y completa un flujo real de reserva [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-core/playwright/tests/inline.e2e.ts@54343aa]
- HubSpot documenta su embed de forms con `//js.hsforms.net/forms/embed/v2.js`, un script de su dominio con version mayor en la ruta y sin hash [doc:https://developers.hubspot.com/docs/cms/start-building/building-blocks/modules/forms@2026-10-01]
- Plausible sirve su script desde `plausible.io` y documenta un proxy por el dominio del sitio para que el script sea una peticion de primera parte [doc:https://plausible.io/docs/proxy/introduction@2026-10-01]
- release-please mantiene un PR de release y solo taggea y genera el CHANGELOG cuando alguien lo mergea [ref:https://github.com/googleapis/release-please/blob/edce3d805ef3ac964d1ba2b29b0f42905f2fa412/README.md@edce3d8]

## 5. Opciones

D1 distribucion e integridad (D2 va atado al canal):

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. jsDelivr `/gh/` + loader `@latest` (hoy) | Gratis; tags inmutables en S3 sirven de rollback; el snippet de Elementor no cambia | Alias `@latest` cacheado 7 dias y purge que exige acceso por email y hoy falla en silencio; jsDelivr lo desaconseja en produccion; `cdn.jsdelivr.net` en una CSP es bypass conocido; `dist/` commiteado; cuenta personal | baja | No como destino |
| B. A endurecido: SRI en el loader, ruleset en `main` y `v*`, release por PR con environment, purge que falla en voz alta | Snippet sin cambios; cierra lo mas grave de CN-001 sin migrar | Sigue el alias de 7 dias y el bypass de CSP; el SRI lo genera el mismo pipeline que escribe el loader, asi que no frena una credencial comprometida | baja | Paso inmediato si la migracion espera |
| C. Host propio en Vercel (patron del fork): `/loader.js` `max-age=300` + `/assets/[hash]` inmutables + `integrity` generado en build | Frescura acotada a 5 min sin purge; sin `dist/` en git; rollback de Vercel; se puede quitar jsDelivr de la CSP | Cuenta personal; deploy por git bloqueado para Karen (TEAM_ACCESS_REQUIRED), por CLI = build en la laptop (pierde SLSA L2) salvo que lo despliegue CI; cambia el snippet de Elementor una vez | media | Recomendada, con deploy desde CI |
| D. Subdominio de ATFX (Cloudflare R2/Pages o Worker bajo atfxlatam.com) | Primera parte: misma zona Cloudflare, sin origen nuevo en la CSP, propiedad de la empresa | Depende de IT de ATFX y de acceso a su Cloudflare; mas piezas | media-alta | Mejor destino de largo plazo si ATFX lo da |
| E. npm + jsDelivr `/npm/@1` con provenance | Provenance npm (SLSA L2); rango mayor en vez de `@latest` | Mismo cache de alias de 7 dias; `/npm/` sigue siendo un host compartido; cuenta npm nueva; el bundle no es una libreria | media | No |

D3 testing:

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| vitest + jsdom para unidad y contrato del payload | Ya probado en el fork; thresholds de cobertura nativos | jsdom no carga modulos por `script type=module`, no abre popups reales ni aplica CSS | baja | Si |
| happy-dom en vez de jsdom | Mas rapido | Menos fiel; el fork ya usa jsdom | baja | No por ahora |
| Playwright E2E del loader en una pagina host con `admin-ajax` mockeado | Prueba la cadena real loader -> CSS -> modulo -> submit -> popup en un navegador | Navegadores en CI; minutos de mas | media | Si, como check requerido |
| Cypress (como Typeform) | Probado a escala | Segunda herramienta sin ventaja aqui | media | No |

D4 release:

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| Auto-tag en cada push (hoy) | Cero friccion | Ningun humano aprueba lo que llega a produccion; el bot escribe en `main` | baja | No |
| release-please (PR de release; mergearlo = desplegar) | El merge de Karen es la aprobacion; CHANGELOG automatico; Conventional Commits ya en uso | Exige squash-merge y Conventional Commits disciplinados | baja | Si |
| changesets | Bueno para monorepos con varios paquetes | Un solo artefacto; archivos changeset de mas | media | No |
| `workflow_dispatch` en environment con reviewer | Aprobacion explicita | Version manual | baja | Alternativa valida |

## 6. Evidencia en contra

- Contra C: el deploy por git a Vercel esta bloqueado para la cuenta de Karen y el workaround documentado es el CLI desde la sesion local, que convierte el build en uno de estacion de trabajo [KAREN:~/.claude/CLAUDE.md bloque vercel]
- Un build en la laptop no cumple SLSA Build L2, que exige plataforma hospedada; se resuelve si el deploy lo hace un job de GitHub Actions con `vercel deploy --prebuilt` y un token del team dueno, y si no se puede, se acepta y se documenta [doc:https://slsa.dev/spec/v1.0/levels@1.0]
- Contra C y B: el SRI que escribe el loader lo genera el mismo pipeline que publica el loader, asi que una credencial que publica codigo malicioso publica tambien su hash; el control que frena CN-001 es el ruleset con PR revisado y el environment con reviewer, no el SRI [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/repo-rules.md@56fcfa8]
- Stripe, el caso mas exigente de script de terceros en paginas con datos sensibles, no usa SRI y cubre la integridad con CSP mas monitoreo; el SRI en el loader se mantiene igual porque aqui el hash lo controla el mismo dueno del loader y no rompe actualizaciones [doc:https://github.com/stripe/stripe-js/issues/167#issuecomment-2391990258@2024-10-03]
- Contra C: la cuenta sigue siendo personal y Typeform, Cal.com y HubSpot sirven desde dominio de la empresa; se acepta para C y se resuelve con D cuando ATFX lo habilite [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-snippet/src/index.ts@54343aa]
- Contra dejar el repo privado al migrar: en GitHub Free un repo privado pierde ramas protegidas, rulesets y reviewers de environment, que son justo los controles de D4 [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/environments.md@56fcfa8]
- A favor de quedarse en A: los tags de jsDelivr son inmutables y permanentes, un rollback de version es un tag nuevo; pero el alias que lo resuelve sigue cacheado hasta 7 dias sin purge, y eso es justo el hallazgo 6 [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]

## 7. Ejemplares y anti-ejemplos

- Bien: unidad de frescura en el loader sin version y assets con hash y cache de un ano, la combinacion que web.dev describe para URLs con y sin version [doc:https://web.dev/articles/http-cache@2026-10-01]
- Bien: Cal.com inyecta un unico script desde su host y deja todo lo versionado detras de esa URL estable [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-snippet/src/index.ts@54343aa]
- Bien: el loader puede fijar `js.integrity = "sha384-..."` y `js.crossOrigin = "anonymous"` antes de `appendChild`, porque la propiedad refleja el atributo [doc:https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement/integrity@2026-10-01]
- Bien: el `link` del CSS inyectado tambien necesita `integrity` y `crossOrigin` si es de otro origen, o SRI no aplica [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- Bien: Typeform corre cobertura y E2E funcional como jobs de pull request antes de que algo llegue a `main` [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/.github/workflows/pull-request.yml@ffcede3]
- Bien: Cal.com levanta una pagina host propia y verifica que ningun request quede bloqueado antes de probar el flujo [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-core/playwright/tests/inline.e2e.ts@54343aa]
- Bien: el E2E del widget intercepta `**/wp-admin/admin-ajax.php` con `page.route`, valida el request y responde con `route.fulfill`, sin red ni Salesforce [doc:https://playwright.dev/docs/network@2026-10-01]
- Bien: `permissions: contents: read` por defecto y subir a `write` solo en el job final que taggea [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/content/actions/reference/security/secure-use.md@56fcfa8]
- Anti-ejemplo: el workflow actual da `contents: write` a todo el job, incluido `npm ci` [repo:.github/workflows/release.yml:14]
- Anti-ejemplo: `curl -s ... || true` en el purge esconde el fallo que explica el hallazgo 6 [repo:.github/workflows/release.yml:73]
- Anti-ejemplo: Typeform, aun siendo referencia, fija sus actions por tag (`actions/checkout@v6`), lo que Scorecard penaliza en Pinned-Dependencies [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/.github/workflows/release.yml@ffcede3]
- Anti-ejemplo: leer la version desde la URL del CDN acopla el bundle al canal de distribucion [repo:src/index.ts:8]

## 8. Trampas

- En la landing de produccion, SRI sobre assets de otro origen exige que ese origen mande cabeceras CORS; si no, el script no carga y el form desaparece [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- En la landing de produccion, `forms.js` es un modulo y ya se pide en modo CORS, asi que el host de assets debe responder `Access-Control-Allow-Origin` con o sin SRI [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script@2026-10-01]
- En la landing de produccion, cualquier script nuevo que inyecte el loader debe llevar `data-cfasync="false"`, o Rocket Loader lo reordena [doc:https://developers.cloudflare.com/speed/optimization/content/rocket-loader/ignore-javascripts/@2026-10-01]
- En la landing de produccion, el hash SRI debe calcularse sobre los bytes finales que sirve el host; una minificacion o reescritura posterior de un CDN rompe la coincidencia y bloquea el recurso [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- En la landing de produccion, el mount vacio crece de 0 al alto del form cuando llega el JS; reservar `min-height` en el CSS del propio widget no basta porque ese CSS tambien llega tarde [doc:https://web.dev/articles/optimize-cls@2026-10-01]
- En el editor/preview de Elementor con sesion de admin, un envio de prueba responde 200 sin crear lead; el E2E manual se hace en incognito [repo:CLAUDE.md:128]
- En el runner de CI, Dependabot no crea alertas para actions fijadas por SHA; las version updates si las mantienen, asi que hay que activar ambas [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/content/actions/reference/security/secure-use.md@56fcfa8]
- En el runner de CI, el test actual exige Node 22.18 o superior y el workflow usa Node 20, asi que agregar `npm test` sin cambiar runner o runtime de test falla [repo:test/lead-meta.test.ts:1]
- En el runner de CI, si el bot sigue commiteando a `main`, un ruleset que exige PR bloquea su push; con release-please el bot ya no escribe en `main` fuera del PR [ref:https://github.com/googleapis/release-please/blob/edce3d805ef3ac964d1ba2b29b0f42905f2fa412/README.md@edce3d8]
- En jsDelivr, los archivos de un tag quedan en S3 para siempre; un bundle con un secreto no se puede retirar, solo dejar de referenciar [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- En jsDelivr, la ruta `/gh/karenrebecag/at_forms` depende del nombre de la cuenta personal; renombrar la cuenta o el repo rompe todas las landings [repo:loader.js:6]
- En el dev server local, servir la raiz expone `src/` y `.git/` a la red [repo:esbuild.config.mjs:35]
- En el fork en Vercel, mover el repo a privado en plan Free elimina rulesets y reviewers de environment [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/repo-rules.md@56fcfa8]
- En la migracion de canal, la deteccion de version por `at_forms@` en la URL deja de funcionar y el banner cae a "dev" [repo:src/index.ts:8]
- En la migracion de canal, el snippet de Elementor cambia de URL una vez en cada landing; si alguna queda con la URL vieja, sigue sirviendo la ultima version de jsDelivr sin aviso [repo:CLAUDE.md:13]

## 9. Incertidumbre

- ASSUMPTION: la CSP real de www.atfxlatam.com no esta verificada (el audit tampoco la verifico); si existe y lista `cdn.jsdelivr.net`, mover el canal exige cambiarla. prueba: `curl -sI https://www.atfxlatam.com/` y leer `content-security-policy` y `content-security-policy-report-only`.
- ASSUMPTION: jsDelivr `/gh/` responde `Access-Control-Allow-Origin: *`, requisito para SRI en el escenario B. prueba: `curl -sI https://cdn.jsdelivr.net/gh/karenrebecag/at_forms@v1.0.12/dist/forms.js | grep -i access-control`.
- ASSUMPTION: el purge del CI falla porque jsDelivr exige acceso pedido por email. prueba: correr el `curl` del purge sin `-s` ni `|| true` en un run manual y leer el cuerpo y el status.
- ASSUMPTION: un job de GitHub Actions con `vercel deploy --prebuilt --prod` y un token del team dueno no pasa por el chequeo de membresia del autor del commit, igual que el CLI local. prueba: deploy de preview desde un workflow en un proyecto de prueba del mismo team.
- ASSUMPTION: el bundle actual pesa unos 49 KB en brotli (dato del encargo; aqui solo se midio 167 KB minificado sin comprimir). prueba: `npx esbuild-visualizer` o `brotli -c dist/forms.js | wc -c` en la spec.
- ASSUMPTION: `npm ci --ignore-scripts` sigue dejando esbuild operativo, porque su binario llega por optionalDependencies. prueba: `npm ci --ignore-scripts && npm run build` en un checkout limpio.
- ASSUMPTION: dos inclusiones del loader en la misma pagina ejecutan el modulo una sola vez (mismo URL en el module map) pero duplican el `link` de CSS. prueba: E2E de Playwright con dos `script` del loader y contar `link[href*="forms"]`.
- [NEEDS CLARIFICATION: puede ATFX dar un subdominio (por ejemplo bajo atfxlatam.com en su Cloudflare) para servir el widget, o la propiedad sigue en una cuenta personal de Karen?]
- [NEEDS CLARIFICATION: que plan de GitHub tiene la cuenta karenrebecag? Si es Free, el repo debe seguir publico para conservar rulesets y reviewers de environment.]
- [NEEDS CLARIFICATION: se acepta cambiar una vez la URL del loader en cada widget HTML de Elementor? Cuantas landings la usan hoy?]
- [NEEDS CLARIFICATION: cual es el presupuesto de tamano del bundle (KB brotli) y se conserva GSAP inlined?]
- No se recupero en esta corrida documentacion oficial de Google Tag ni de Fathom sobre su distribucion; no se usan como evidencia.
- Sospecha de inyeccion: ninguna detectada en las fuentes leidas.

## 10. Checklist de estandar

- [ ] La landing carga una sola URL sin version (el loader) y todo lo demas sale de URLs con hash de contenido.
- [ ] El loader se sirve con `Cache-Control` de vida corta (300 s o menos) y los assets con `max-age=31536000, immutable`; ambas cabeceras se comprueban con un test o un `curl -sI` documentado.
- [ ] Un release nuevo llega a una landing en 10 minutos o menos sin purge manual, medido en la verificacion de release.
- [ ] El loader fija `integrity` (sha384) y `crossOrigin="anonymous"` en el script y en el link que inyecta, calculados en el build sobre los bytes servidos.
- [ ] El origen de assets responde `Access-Control-Allow-Origin` y un E2E falla si el script o el CSS no cargan.
- [ ] Todo script inyectado lleva `data-cfasync="false"`.
- [ ] El bundle no lee su version de la URL; usa una constante inyectada en build.
- [ ] El build de release no publica source maps.
- [ ] Existe script `test` con vitest + jsdom y `coverage.thresholds` en 80 para lineas, funciones, ramas y sentencias.
- [ ] Hay un contract test que fija los nombres y valores del payload a `admin-ajax` (es, en, pt; con y sin `data-zoom-link`; `lead_source`; `referrer`; aceptacion) y falla ante cualquier cambio no intencional.
- [ ] Un E2E de Playwright monta el loader en una pagina host que imita el widget HTML de Elementor, intercepta `admin-ajax.php` con `page.route`, y comprueba multipart, `X-Requested-With: XMLHttpRequest`, thank-you y popup de Zoom, sin red externa.
- [ ] El E2E corre tambien con dos mounts en la misma pagina y con el loader incluido dos veces.
- [ ] Ningun workflow tiene permisos de escritura a nivel global; el job que taggea o despliega es el unico con `write`.
- [ ] Todas las actions estan fijadas por SHA completo con comentario de version, y Dependabot version updates esta activo para `github-actions` y `npm`, con Dependabot alerts encendidas.
- [ ] `main` y los tags `v*` estan protegidos por ruleset: PR obligatorio, checks requeridos (typecheck, test con cobertura, build, E2E), sin force-push ni borrado.
- [ ] El release ocurre al mergear un PR de release (release-please) o por `workflow_dispatch` en un environment con reviewer; ningun push directo publica.
- [ ] El paso de publicacion falla en voz alta: ningun `|| true` ni `curl -s` sin `-f`.
- [ ] El mount reserva altura antes de que llegue el JS (estilo en el snippet o CSS del sitio) y el CLS de la landing con el form es 0.1 o menos.
- [ ] Hay un presupuesto de tamano del bundle verificado en CI con el `metafile` de esbuild.
- [ ] El deploy y el merge los ejecuta Karen; ningun agente despliega.

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | jsDelivr README (Caching, Purge, GitHub) | jsDelivr | 4fe4dfc | 2026-10-01 | high |
| 2 | Including Stripe.js | Stripe | 2026-10-01 | 2026-10-01 | high |
| 3 | stripe-js issue 167, comentario de rado-stripe sobre SRI y PCI 6.4.3 | Stripe (contributor) | 2024-10-03 | 2026-10-01 | medium |
| 4 | Subresource Integrity | MDN | 2026-10-01 | 2026-10-01 | high |
| 5 | HTMLScriptElement.integrity | MDN | 2026-10-01 | 2026-10-01 | high |
| 6 | The script element | MDN | 2026-10-01 | 2026-10-01 | high |
| 7 | HTTP cache | web.dev | 2026-10-01 | 2026-10-01 | high |
| 8 | Vercel CDN Cache | Vercel | 2026-09-14 | 2026-10-01 | high |
| 9 | esbuild API (entry names, metafile) | esbuild | 0.23 | 2026-10-01 | high |
| 10 | Secure use reference (Actions) | GitHub docs source | 56fcfa8 | 2026-10-01 | high |
| 11 | About rulesets | GitHub | fpt | 2026-10-01 | high |
| 12 | Gated features: repo-rules, protected-branches, environments, attestations | GitHub docs source | 56fcfa8 | 2026-10-01 | high |
| 13 | Artifact attestations | GitHub | fpt | 2026-10-01 | high |
| 14 | SLSA Build levels | OpenSSF SLSA | 1.0 | 2026-10-01 | high |
| 15 | Generating provenance statements | npm | 2026-10-01 | 2026-10-01 | high |
| 16 | Scorecard checks | OpenSSF | c42b791 | 2026-10-01 | high |
| 17 | CSP Evaluator allowlist bypasses | Google | ad530f3 | 2026-10-01 | high |
| 18 | Rocket Loader, ignore scripts | Cloudflare | 2026-10-01 | 2026-10-01 | high |
| 19 | CLS | web.dev | 2026-10-01 | 2026-10-01 | high |
| 20 | Optimize CLS | web.dev | 2026-10-01 | 2026-10-01 | high |
| 21 | Preconnect and dns-prefetch | web.dev | 2026-10-01 | 2026-10-01 | high |
| 22 | Network (mocking) | Playwright | 2026-10-01 | 2026-10-01 | high |
| 23 | Test environment | Vitest | 5.0.3 | 2026-10-01 | high |
| 24 | Coverage config | Vitest | 5.0.3 | 2026-10-01 | high |
| 25 | Typeform embed (README, workflows, package.json) | Typeform | ffcede3 | 2026-10-01 | high |
| 26 | Cal.com embeds (snippet, Playwright tests) | Cal.com | 54343aa | 2026-10-01 | high |
| 27 | HubSpot forms module docs | HubSpot | 2026-10-01 | 2026-10-01 | medium |
| 28 | Plausible proxy introduction | Plausible | 2026-10-01 | 2026-10-01 | medium |
| 29 | release-please README | Google | edce3d8 | 2026-10-01 | high |
