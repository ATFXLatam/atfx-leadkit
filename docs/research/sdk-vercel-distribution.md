# Reference Brief: distribucion del widget como SDK embebible servido desde Vercel con archivos inmutables y SRI

Slug: sdk-vercel-distribution | Nivel: deep | Fecha: 2026-10-07 | Estado: ESCALADO
Versiones: esbuild=0.28.2, typescript=5.9.3, vitest=5.0.3, zod=3.25.76
Verificador: research-verifier 2026-10-07, ESCALATE unverified=1 contradictions=0 (headers de vercel.json bajo --prebuilt sin fuente; correcciones de opcion C, rollback y --signer-workflow aplicadas)

## 1. Pregunta y decisiones abiertas

Como servir los bundles de atfx-leadkit (un IIFE autocontenido por formulario) desde Vercel, con archivos con hash inmutables, cache larga, snippets fijados con SRI y deploy solo desde GitHub Actions; y que significa en concreto "construirlo como un SDK". El brief alimenta la reescritura de s14 y de D-13/D-29/D-30/D-31; no decide.

Supera, para el canal, a `forms-v2-distribution` (ESCALADO), que recomendaba npm + jsDelivr. Karen decidio Vercel (encargo de /research del 2026-10-07, relayado por el orquestador). De aquel brief siguen vigentes sin reinvestigar: el modelo de amenaza (SRI como defensa ante un host o credencial comprometidos) y la matriz de pin por sitio vs por campana. Lo de Elementor/Rocket Loader se re-verifica aqui con fuentes leidas hoy.

Insumos leidos en esta corrida: `esbuild.config.mjs`, `src/core/mount.ts`, `src/styles/styles.ts`, `src/core/analytics.ts`, `src/entries/lead.ts`, `src/build.test.ts`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.gitignore`, `package.json`, `docs/specs/02-decisiones.md`, `docs/specs/sessions/s14-distribucion-ci.md`, `docs/specs/04-arquitectura.md` y el brief `forms-v2-distribution`. Por `gh api` (GET): el repo `ATFXLatam/atfx-leadkit` es publico, de organizacion y sin tags.

D1, superficie de SDK. Que patrones de SDK embebible (namespace global versionado, carga idempotente, stub/cola de comandos, config por atributos vs init en JS, eventos para el host, aislamiento de errores, presupuesto de peso) aplican a leadkit y cuales son exceso.

D2, almacen append-only. Cada deploy de produccion de Vercel reemplaza el conjunto de archivos que sirve el dominio. Donde viven los bytes de cada release para que un archivo publicado siga disponible para siempre: directorio `releases/` versionado en git, GitHub Releases inmutables como almacen con Vercel solo como capa de servicio, Vercel Blob, o deployments viejos de Vercel / Skew Protection.

D3, cabeceras y dominio. `Cache-Control`, CORS (sin `Access-Control-Allow-Origin` el SRI falla cerrado), `Cross-Origin-Resource-Policy`, `X-Content-Type-Options`, y dominio propio vs `*.vercel.app`.

D4, cadena de suministro. Actions por SHA, permisos minimos, environment con revisor para el `VERCEL_TOKEN`, alcance del token, artifact attestations y como verifica un tercero.

D5, versionado y release. Semver del embed, changelog, revocacion de una version, generacion de snippets con SRI desde el manifest, pin por sitio vs por campana.

D6, embebido en WordPress/Elementor. Custom Code vs widget HTML, CSP del host, Rocket Loader y plugins de retraso de JS (WP Rocket, WP Meteor).

## 2. Estado actual

Contextos: landing de produccion WordPress + Elementor Pro detras de Cloudflare (Rocket Loader y posibles plugins WP Rocket / WP Meteor), editor y preview de Elementor, Elementor Pro Custom Code como slot de sitio, vitest + jsdom (tests), servidor dev de esbuild en 127.0.0.1:8765, runner de GitHub Actions (CI y futuro release), CDN de Vercel (dominio de produccion, URLs generadas de deployment y previews), host futuro Webflow
- El build produce un IIFE por formulario [repo:esbuild.config.mjs:37]
- El target de esbuild es es2019 [repo:esbuild.config.mjs:38]
- Los nombres de salida llevan hash de contenido (`[name]-[hash]`) [repo:esbuild.config.mjs:39]
- El CSS entra al bundle como texto, sin archivo CSS aparte [repo:esbuild.config.mjs:41]
- La version del paquete se inyecta en el bundle como `__LEADKIT_VERSION__` desde `package.json` [repo:esbuild.config.mjs:47]
- La version actual de `package.json` es 0.0.0 [repo:package.json:3]
- El manifest guarda por formulario solo la ruta `js`, sin `integrity` ni version [repo:esbuild.config.mjs:20]
- Cada build CLI borra `dist` completo antes de construir, asi que un build solo contiene el release actual [repo:esbuild.config.mjs:65]
- `dist/` esta ignorado en git: hoy no hay registro versionado de bytes publicados [repo:.gitignore:2]
- El test de build exige un manifest `{js}` con ruta `assets/<form>-<HASH>.js` [repo:src/build.test.ts:36]
- La entrada de `lead` inyecta estilos una vez y arranca el observer [repo:src/entries/lead.ts:6]
- `injectStylesOnce` no inyecta si ya existe un `<style data-atfx-leadkit-style>` en el documento [repo:src/styles/styles.ts:10]
- El global `window.atfxLeadkit` expone `versions`, `forms` (WeakSet), `register` y `mount` [repo:src/core/mount.ts:18]
- Si `window.atfxLeadkit` existe y no es un registro genuino, el bundle avisa y no monta (falla cerrado) [repo:src/core/mount.ts:70]
- `register` devuelve false si la clave del formulario ya esta registrada [repo:src/core/mount.ts:81]
- `observe` ignora el resultado de `register` y arranca su propio observer igual [repo:src/core/mount.ts:227]
- El host se marca con `data-atfx-mounted` antes de renderizar para que otra copia del bundle lo salte [repo:src/core/mount.ts:176]
- El arranque espera `DOMContentLoaded` solo si `readyState` es `loading`; si no, monta en el acto [repo:src/core/mount.ts:238]
- Un fallo de montaje vacia el host y registra solo el nombre del error [repo:src/core/mount.ts:194]
- Las integraciones de analitica corren aisladas en try/catch y con `.catch` para promesas [repo:src/core/analytics.ts:13]
- El envio va a `/wp-admin/admin-ajax.php` relativo al origen de la pagina [repo:src/contract/payload.ts:4]
- El CI de verificacion tiene `permissions: {}` a nivel workflow [repo:.github/workflows/ci.yml:9]
- El CI fija `actions/checkout` por SHA completo [repo:.github/workflows/ci.yml:25]
- Dependabot solo actualiza GitHub Actions [repo:.github/dependabot.yml:5]
- D-13 vigente propone npm + jsDelivr `/npm/` y esta PENDIENTE [repo:docs/specs/02-decisiones.md:21]
- D-29 pregunta por el scope de npm y quien publica [repo:docs/specs/02-decisiones.md:37]
- D-30 deja pendiente el pin por sitio vs por campana [repo:docs/specs/02-decisiones.md:38]
- D-31 reserva una ruta o bucket en Cloudflare de ATFX para fase 2 [repo:docs/specs/02-decisiones.md:39]
- s14 esta BLOQUEADA por D-13, D-18, D-29, D-30, D-31 y D-32 [repo:docs/specs/sessions/s14-distribucion-ci.md:3]
- s14 publica a npm con `npm publish --provenance` [repo:docs/specs/sessions/s14-distribucion-ci.md:41]
- El snippet de s14 usa `type="module"` aunque el build es IIFE [repo:docs/specs/sessions/s14-distribucion-ci.md:54]
- Karen decidio distribuir desde Vercel con archivos inmutables con hash, cache larga, snippet fijado con SRI (`integrity` sha384, `crossorigin="anonymous"`, `data-cfasync="false"`), deploy solo desde GitHub Actions con `VERCEL_TOKEN`, y URL mutable "latest" solo para paginas de bajo riesgo, nunca para forms de leads [KAREN:encargo /research 2026-10-07 relayado por el orquestador]
- El deploy por git en Vercel esta bloqueado para la cuenta de Karen (GitHub vinculado a dos cuentas Vercel, TEAM_ACCESS_REQUIRED) y el camino es el CLI autenticado como miembro del team dueno [KAREN:~/.claude/CLAUDE.md bloque vercel]
- Deploy y publicacion son de Karen, no de un agente [KAREN:~/.claude/CLAUDE.md bloque block]

## 3. Fuentes primarias

### SRI y CORS

- SRI exige que las peticiones con integridad entre origenes usen CORS; la spec llama "logical error" a usarlo sin CORS [doc:https://www.w3.org/TR/SRI/@WD-sri-2-20260320]
- Los agentes deben soportar SHA-256, SHA-384 y SHA-512, y la spec da SHA-384 como linea base [doc:https://www.w3.org/TR/SRI/@WD-sri-2-20260320]
- Con varios hashes, el agente elige el algoritmo mas fuerte y acepta si coincide cualquiera de ese algoritmo [doc:https://www.w3.org/TR/SRI/@WD-sri-2-20260320]
- Un recurso que falla la integridad no se ejecuta, devuelve error de red y dispara `error` para permitir un fallback [doc:https://www.w3.org/TR/SRI/@WD-sri-2-20260320]
- Sin el atributo `crossorigin` la peticion va en modo `no-cors` y un `integrity` en ella "will always fail" [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-04-14]
- El servidor tiene que mandar `Access-Control-Allow-Origin`, y los CDN suelen usar `*` [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-04-14]
- Varios valores del mismo algoritmo permiten aceptar versiones alternativas de un recurso [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-04-14]
- MDN da el hash con `openssl dgst -sha384 -binary | openssl base64 -A` [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-04-14]
- `Integrity-Policy` (y su variante report-only) permite al host bloquear scripts sin `integrity`, con despliegue recomendado en report-only primero [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-04-14]
- `integrity` en `<script>` no se debe poner sin `src`, y `crossorigin` es lo que da a `window.onerror` el detalle de errores de scripts de otro dominio [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script@2026-05-09]
- `defer` ejecuta tras el parseo y antes de `DOMContentLoaded`, en orden de documento [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script@2026-05-09]

### Cabeceras HTTP

- `immutable` indica que el origen no cambiara la representacion durante la vida fresca y que el cliente no debe revalidar mientras este fresca [doc:https://www.rfc-editor.org/rfc/rfc8246.html@RFC8246]
- `X-Content-Type-Options: nosniff` bloquea una respuesta de destino `script` cuyo MIME no sea JavaScript [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options@2026-03-17]
- `Cross-Origin-Resource-Policy` bloquea peticiones `no-cors` entre origenes; el valor `cross-origin` permite cargar desde cualquier sitio [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Resource-Policy@2025-11-21]
- `script-src` admite un origen concreto (host-source) y tambien hashes que deben coincidir con todos los del `integrity` del script externo [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src@2026-08-12]
- Con `'strict-dynamic'` las listas de hosts se ignoran y la confianza se propaga desde un script con nonce o hash [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src@2026-08-12]
- Los estilos inline necesitan `'unsafe-inline'`, un nonce o un hash en `style-src` [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src@2025-12-15]

### Vercel

- `vercel.json` define cabeceras por `source` con pares key/value, y aplican a archivos estaticos [doc:https://vercel.com/docs/project-configuration/vercel-json@2026-08-14]
- El ejemplo oficial de `vercel.json` sirve `/assets/(.*)` con `public, max-age=31556952, immutable` [doc:https://vercel.com/docs/project-configuration/vercel-json@2026-08-14]
- El `Cache-Control` por defecto de Vercel es `public, max-age=0, must-revalidate` [doc:https://vercel.com/docs/caching/cache-control-headers@2026-09-14]
- Para assets con hash Vercel recomienda `max-age=31536000, immutable` [doc:https://vercel.com/docs/caching/cache-control-headers@2026-09-14]
- Con solo `Cache-Control`, Vercel quita `s-maxage` antes de enviarlo al cliente [doc:https://vercel.com/docs/caching/cache-control-headers@2026-09-14]
- Los archivos estaticos se cachean en la red de Vercel "for the lifetime of the deployment" tras la primera peticion [doc:https://vercel.com/docs/caching/cdn-cache@2026-09-14]
- Vercel no permite saltarse la cache para archivos estaticos, y la duracion de cache es best-effort: un asset poco pedido puede salir de la cache regional [doc:https://vercel.com/docs/caching/cdn-cache@2026-09-14]
- La doc de cabeceras de respuesta por defecto no lista `Access-Control-Allow-Origin` y fija HSTS de 2 anos [doc:https://vercel.com/docs/headers/response-headers@2026-08-11]
- Las URLs de produccion desactualizadas reciben `x-robots-tag: noindex` [doc:https://vercel.com/docs/headers/response-headers@2026-08-11]
- `vercel deploy --prebuilt` sube el resultado de `vercel build` en `.vercel/output`, y `stdout` es siempre la URL del deployment [doc:https://vercel.com/docs/cli/deploy@2026-09-18]
- `--prod` crea un deployment para el dominio de produccion y `--skip-domain` evita asignar los dominios para promover despues con `vercel promote` [doc:https://vercel.com/docs/cli/deploy@2026-09-18]
- La guia oficial de GitHub Actions usa `vercel pull --environment=production`, `vercel build --prod` y `vercel deploy --prebuilt --prod` con `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` [doc:https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel@2026-08-20]
- La misma guia pide `"git": { "deploymentEnabled": false }` para que la integracion Git no despliegue en paralelo [doc:https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel@2026-08-20]
- `git.deploymentEnabled: false` apaga los deploys automaticos de todas las ramas [doc:https://vercel.com/docs/project-configuration/git-configuration@2026-08-25]
- El Build Output API permite generar `.vercel/output` a mano sin framework [doc:https://vercel.com/docs/build-output-api@2026-08-11]
- Instant Rollback reapunta los dominios a un deployment anterior y apaga la auto-asignacion de dominios de produccion hasta deshacerlo [doc:https://vercel.com/docs/instant-rollback@2026-07-07]
- En Hobby solo se puede volver al deployment inmediatamente anterior; en Pro a cualquiera que haya sido produccion [doc:https://vercel.com/docs/instant-rollback@2026-07-07]
- La retencion por defecto de deployments de produccion es 1 ano en Pro y 30 dias en Hobby, con excepcion para el que tiene alias de produccion [doc:https://vercel.com/docs/deployment-retention@2026-09-16]
- Skew Protection ignora el id de deployment en peticiones cross-origin salvo dominios permitidos, y documenta que los assets fijados por otro sitio dan 404 al redesplegar porque los viejos "no longer exist" [doc:https://vercel.com/docs/skew-protection@2026-09-16]
- Skew Protection es solo Pro/Enterprise, su edad maxima no supera la retencion, y una nota de la doc dice que no esta disponible para deployments prebuilt [doc:https://vercel.com/docs/skew-protection@2026-09-16]
- Standard Protection protege todos los dominios salvo los de produccion, y restringe la URL generada del deployment de produccion [doc:https://vercel.com/docs/deployment-protection@2026-09-15]
- Los tokens de Vercel tienen alcance de cuenta completa, team o un solo proyecto; el de proyecto niega todo lo que no sea ese proyecto [doc:https://vercel.com/docs/accounts/access-tokens@2026-09-08]
- Vercel pide elegir el alcance mas estrecho y una expiracion al crear el token [doc:https://vercel.com/docs/accounts/access-tokens@2026-09-08]
- Los equipos Hobby son solo para uso personal no comercial; cobrar por crear o alojar el sitio cuenta como comercial [doc:https://vercel.com/docs/limits/fair-use-guidelines@2026-09-14]
- Un subdominio propio se configura con un CNAME unico por proyecto [doc:https://vercel.com/docs/domains/working-with-domains/add-a-domain@2026-09-16]
- Vercel no recomienda poner un proxy inverso (Cloudflare incluido) delante de Vercel, por cache, firewall y latencia [doc:https://vercel.com/kb/guide/cloudflare-with-vercel@2026-10-07]
- Vercel Blob lanza error por defecto si se sube dos veces el mismo pathname, salvo `allowOverwrite` [doc:https://vercel.com/docs/vercel-blob@2026-08-26]
- Vercel Blob cachea blobs hasta 1 mes por defecto y su URL publica vive en `*.public.blob.vercel-storage.com` [doc:https://vercel.com/docs/vercel-blob/using-blob-sdk@2026-08-26]
- Fuera de Vercel, Blob usa `BLOB_READ_WRITE_TOKEN`, un token estatico de larga vida [doc:https://vercel.com/docs/vercel-blob@2026-08-26]

### GitHub y SLSA

- Fijar una action por SHA completo es "the only way" de usarla como release inmutable [doc:https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions@fpt]
- GitHub pide dar al `GITHUB_TOKEN` el minimo de permisos, con lectura por defecto y escritura solo en el job que la necesite [doc:https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions@fpt]
- Un job no accede a los secretos de un environment hasta que un revisor aprueba [doc:https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions@fpt]
- Los environments admiten hasta 6 revisores, impedir la auto-aprobacion y restringir que ramas o tags pueden desplegar [doc:https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments@fpt]
- En planes Free/Pro/Team, los revisores requeridos de environments solo existen en repos publicos [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/environments.md@56fcfa8]
- En planes Free/Pro/Team, artifact attestations solo existen en repos publicos [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/attestations.md@56fcfa8]
- Generar una attestation pide `id-token: write`, `attestations: write` y `contents: read`, y se verifica con `gh attestation verify <archivo> -R <org>/<repo>` [doc:https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations@fpt]
- Artifact attestations da SLSA v1.0 Build L2 por si sola y L3 con reusable workflows, y no garantiza que el artefacto sea seguro [doc:https://docs.github.com/en/actions/concepts/security/artifact-attestations@fpt]
- En repos publicos la firma usa la instancia publica de Sigstore con log de transparencia legible [doc:https://docs.github.com/en/actions/concepts/security/artifact-attestations@fpt]
- `gh attestation verify` exige `--owner` o `--repo`, verifica por defecto el predicado SLSA provenance v1 y admite `--signer-workflow`, `--source-ref`, `--deny-self-hosted-runners` y `--bundle` offline [doc:https://cli.github.com/manual/gh_attestation_verify@2026-10-07]
- SLSA Build L2 pide build en plataforma hospedada con provenance firmada; L3 aisla el material de firma de los pasos del usuario [doc:https://slsa.dev/spec/v1.0/levels@1.0]
- Un release inmutable bloquea su tag a un commit y protege sus archivos contra modificacion o borrado; el flujo es borrador, adjuntar todo, publicar [doc:https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases@fpt]
- Un release inmutable genera una release attestation con tag, SHA y archivos [doc:https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases@fpt]
- Un release admite hasta 1000 archivos de menos de 2 GiB cada uno [doc:https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases@fpt]

### Build y versionado

- El `[hash]` de esbuild es el hash de contenido del archivo de salida y cambia si y solo si cambian sus entradas [doc:https://esbuild.github.io/api/#entry-names@0.28]
- SemVer 2.0.0: el contenido de una version publicada no se modifica [doc:https://semver.org/@2.0.0]
- SemVer: MAJOR ante cambios incompatibles de la API publica, MINOR al deprecar algo, y 0.y.z es desarrollo inicial donde todo puede cambiar [doc:https://semver.org/@2.0.0]
- SemVer: antes de quitar algo en un MAJOR debe haber al menos un MINOR con la deprecacion [doc:https://semver.org/@2.0.0]

### SDKs de terceros

- Stripe pide cargar Stripe.js siempre desde `js.stripe.com`, nunca empaquetado ni auto-hospedado, y admite `async`/`defer` con la condicion de llamar la API tras la ejecucion [doc:https://docs.stripe.com/js/including@2026-10-07]
- El snippet de Google tag carga `gtag.js` con `async` y define `dataLayer` y `gtag()` como cola antes de que llegue la libreria [doc:https://developers.google.com/tag-platform/gtagjs/install@2026-07-30]
- HubSpot expone eventos globales en `window` (`hs-form-event:on-ready`, `on-submission:success`, `on-submission:failed`) con `formId` e `instanceId` en `detail` [doc:https://developers.hubspot.com/docs/api-reference/latest/marketing/forms/global-form-events@2026-10-07]
- HubSpot pide registrar los listeners antes de que corra el embed para no perder `on-ready` [doc:https://developers.hubspot.com/docs/api-reference/latest/marketing/forms/global-form-events@2026-10-07]

### WordPress y CDN del host

- Rocket Loader ignora un script con `data-cfasync="false"`, que debe ir antes de `src`, y no funciona si se pone desde JavaScript [doc:https://developers.cloudflare.com/speed/optimization/content/rocket-loader/ignore-javascripts/@2026-04-17]
- WP Rocket "Delay JavaScript execution" retrasa todos los scripts hasta una interaccion, y se excluye por URL/palabra clave o con el atributo `nowprocket` [doc:https://docs.wp-rocket.me/article/1349-delay-javascript-execution@2026-03-11]
- WP Rocket no puede retrasar scripts insertados despues de la carga [doc:https://docs.wp-rocket.me/article/1349-delay-javascript-execution@2026-03-11]
- WP Meteor difiere scripts hasta el render y se excluye con `data-wpmeteor-nooptimize="true"`, con regex en su pestana Exclusions o con el filtro `wpmeteor_exclude` [doc:https://wordpress.org/plugins/wp-meteor/@3.4.19]
- Elementor Pro Custom Code agrega HTML/JS/CSS en head, inicio o fin de body, con prioridad 1-10 y condiciones de visualizacion [doc:https://elementor.com/help/custom-code-pro/@2026-10-07]

## 4. Implementaciones de referencia

- Stripe.js loader (`stripe/stripe-js`, mantenido por Stripe, push 2026-10-06): busca un `<script>` existente de su origen antes de inyectar otro, para cargar a lo sumo una vez [ref:https://github.com/stripe/stripe-js/blob/fba80159740a7e7f6f340f11d90006d72a2fab0b/src/shared.ts@fba8015]
- El mismo loader resuelve con el global ya presente sin reinyectar, y advierte si llegan parametros a un script ya cargado [ref:https://github.com/stripe/stripe-js/blob/fba80159740a7e7f6f340f11d90006d72a2fab0b/src/shared.ts@fba8015]
- El loader de Stripe fija un "release train" en la URL y avisa si la version cargada no es la esperada [ref:https://github.com/stripe/stripe-js/blob/fba80159740a7e7f6f340f11d90006d72a2fab0b/src/shared.ts@fba8015]
- El loader de Stripe resetea la promesa al fallar la carga para permitir un reintento [ref:https://github.com/stripe/stripe-js/blob/fba80159740a7e7f6f340f11d90006d72a2fab0b/src/shared.ts@fba8015]
- Snippet de Segment (`segmentio/snippet`, plantilla oficial del snippet de analytics.js): crea la cola sin pisar una existente y sale si la libreria real ya esta en la pagina [ref:https://github.com/segmentio/snippet/blob/9eda09f7811e9006176308f26d6da3cb1b49fc6b/template/snippet.js@9eda09f]
- El snippet de Segment marca `invoked` y registra "Segment snippet included twice" si se incluye dos veces [ref:https://github.com/segmentio/snippet/blob/9eda09f7811e9006176308f26d6da3cb1b49fc6b/template/snippet.js@9eda09f]
- El snippet de Segment genera stubs que encolan llamadas hasta que carga la libreria, y la inyecta con `async` [ref:https://github.com/segmentio/snippet/blob/9eda09f7811e9006176308f26d6da3cb1b49fc6b/template/snippet.js@9eda09f]
- El snippet de Segment publica `SNIPPET_VERSION` en el global para rastrear lo que hay instalado [ref:https://github.com/segmentio/snippet/blob/9eda09f7811e9006176308f26d6da3cb1b49fc6b/template/snippet.js@9eda09f]
- `actions/attest` (org actions de GitHub, push 2026-10-06, tag v4.2.2 = commit 1e69f48): sin predicado propio genera SLSA build provenance y pide `id-token: write` y `attestations: write` [ref:https://github.com/actions/attest/blob/7d8b1cacecb65f487779b3b98fd5296a018d1a1b/README.md@7d8b1ca]
- `actions/attest-build-provenance` (org actions, 1051 estrellas) liga cada archivo y su digest a un predicado SLSA firmado con Sigstore publico si el repo es publico [ref:https://github.com/actions/attest-build-provenance/blob/9d57eef8c06cd9d6b433effeeb7a6a77b3ff94ad/README.md@9d57eef]
- jsDelivr, como referencia de almacen append-only: guarda cada version exacta en S3 permanente sin forma de actualizarla y sigue sirviendola aunque el origen la borre [ref:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]

## 5. Opciones

D2, almacen append-only (la decision critica):

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Solo el build actual por deploy, confiando en la cache | Nada que construir | La doc de Vercel dice que un redeploy deja en 404 los assets viejos fijados por otro sitio; la cache es por deployment y best-effort; rompe toda landing con un pin anterior | baja | No |
| B. Deployments viejos de Vercel o Skew Protection | Nativo | Cross-origin cae en el ultimo deployment salvo dominios permitidos (12 max); acotado a la retencion (1 ano Pro); URLs generadas protegidas por Standard Protection | media | No |
| C. GitHub Releases inmutables como almacen; cada deploy de Vercel re-arma `releases/` completo desde todos los releases | Mientras el release exista, sus archivos no se pueden cambiar ni borrar y el tag queda fijo al commit (si se borra el release, el nombre del tag no se puede reusar; la doc no dice si los archivos sobreviven, asi que el limite append-only real es quien puede borrar releases); release attestation + artifact attestation (SLSA L2) por archivo; el dominio sirve siempre el conjunto completo; los mismos bytes sirven para la fase 2 en otro origen | Depende de activar immutable releases en la org; cada deploy descarga N releases; un release mal hecho no se corrige, se supera con otro | media | Si |
| D. Directorio `releases/` versionado en git (append-only por check de CI) | Simple; git es el registro; sin depender de una opcion de la org | Los bytes los construye CI pero entran por un PR (o un bot con `contents: write`); un admin puede reescribir historia; el control append-only es un check, no una garantia de plataforma | baja-media | Fallback si C no esta disponible |
| E. Vercel Blob publico como almacen y origen | `put` sin `allowOverwrite` falla si el path existe | Token estatico de larga vida en GitHub; dominio `*.public.blob.vercel-storage.com`; CORS y cabeceras de Blob no documentadas en lo leido; cache por defecto de 1 mes, no 1 ano | media | No, salvo prueba |

D1, superficie de SDK:

| Patron | Quien lo usa | Aplica a leadkit | Recomendacion |
|---|---|---|---|
| Un global con namespace propio y versiones | Segment (`SNIPPET_VERSION`), Stripe | Ya existe (`window.atfxLeadkit.versions`) | Mantener; documentarlo como API publica semver |
| Carga idempotente ante doble inclusion | Stripe (`findScript`), Segment (`invoked`) | Ya existe (`data-atfx-mounted` + WeakSet global) | Mantener; ver trampa de dos versiones en 8 |
| Stub y cola de comandos antes de cargar | Segment, Google tag | No: el host no llama metodos antes de cargar; la config va en `data-*` | Exceso |
| Loader sin version que inyecta el bundle real | Stripe, Segment | No: rompe el pin con SRI del archivo real (decision de Karen) | Exceso y contrario a la decision |
| Config declarativa por atributos `data-*` | leadkit (D-04) | Si | Mantener |
| Eventos DOM para el host (`ready`, `submit:success`, `submit:failed`) | HubSpot | No existen hoy; la analitica va directo a `gtag`/`dataLayer`/`fbq` | Opcional en un MINOR, no bloquea la distribucion |
| Aislamiento de errores | Stripe (reintento), leadkit (`isolate`, `safeMount`) | Ya existe | Mantener |
| Presupuesto de peso | D-19 (20 KB brotli) | Si | Verificarlo en el workflow de release |

Recomendacion (para que la spec la adopte o la rechace): opcion C, con D como fallback. "Construirlo como un SDK" significa aqui, en concreto: (1) una API publica con semver, formada por los atributos `data-*`, la forma de `window.atfxLeadkit`, el contrato de envio y, si se agregan, los eventos DOM; (2) archivos inmutables por version con SRI; (3) carga idempotente, como ya existe; (4) changelog y politica de revocacion. No significa una cola de comandos, ni un loader evergreen, ni un paquete npm para bundlers.

Arquitectura recomendada. Salida desplegada (Vercel `outputDirectory`), re-armada completa en cada deploy:

```
public/
  releases/
    1.0.0/
      lead-<HASH>.js
      interest-<HASH>.js
      release.json        { version, commit, files: { lead: { path, integrity }, interest: {...} } }
    1.0.1/
      ...
  releases.json           indice de versiones activas y revocadas (mutable, cache corta)
vercel.json               (raiz del proyecto, fuera de public/)
```

Cabeceras (`vercel.json`):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": { "deploymentEnabled": false },
  "outputDirectory": "public",
  "headers": [
    {
      "source": "/releases/:version/(.*)\\.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Cross-Origin-Resource-Policy", "value": "cross-origin" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    },
    {
      "source": "/(releases\\.json|releases/:version/release\\.json)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=300" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

Workflow `release.yml` (dos jobs, actions por SHA, `permissions: {}` arriba):

```
on: push de tag v* (tag protegido por ruleset)  +  workflow_dispatch (solo redeploy)

job build      permissions: contents: write, id-token: write, attestations: write
  checkout (persist-credentials: false) -> setup-node -> npm ci --ignore-scripts
  typecheck -> test:cov -> build -> presupuesto de peso (D-19)
  falla si el tag != "v" + package.json version
  copia dist/assets a releases/X.Y.Z/, calcula sha384 por archivo, escribe release.json
  actions/attest (subject-path: releases/X.Y.Z/*.js)
  gh release create vX.Y.Z --draft  -> sube .js + release.json  -> publica (inmutable)

job deploy     needs: build   environment: production (revisor Karen, solo tags v*)
               permissions: contents: read
  gh release download de TODOS los releases publicados
  por archivo: sha384 == release.json, y gh attestation verify --repo ATFXLatam/atfx-leadkit
               --signer-workflow ATFXLatam/atfx-leadkit/.github/workflows/release.yml
  omite lo listado como revocado; falla si falta un release o si dos releases chocan en ruta
  arma public/ + releases.json
  npm i -g vercel@<version exacta>
  vercel pull --yes --environment=production ; vercel build --prod ; vercel deploy --prebuilt --prod
  smoke: por cada archivo, GET al dominio de produccion, sha384 igual, cabeceras ACAO/Cache-Control/nosniff/Content-Type
```

Snippet por formulario (lo genera `scripts/release-snippet.mjs` desde `release.json`):

```html
<div data-atfx-leadkit="lead" data-lang="es"></div>
<script data-cfasync="false" defer nowprocket data-wpmeteor-nooptimize="true"
  src="https://<dominio-de-produccion>/releases/1.0.0/lead-<HASH>.js"
  integrity="sha384-<base64>"
  crossorigin="anonymous"></script>
```

Que cambia en specs (propuesta, la decide Karen):
- D-13: "Vercel como capa de servicio + GitHub Releases inmutables como almacen append-only; snippet a ruta `/releases/X.Y.Z/<form>-<HASH>.js` con `integrity` sha384, `crossorigin="anonymous"` y `data-cfasync="false"` antes de `src`; sin npm ni jsDelivr; sin URL mutable para forms de leads".
- D-29: pasa de "scope de npm" a "team de Vercel (plan Pro por uso comercial), dueno del proyecto, quien guarda el `VERCEL_TOKEN` y quien es revisor del environment `production`".
- D-30: regla adicional: una sola fuente de pin por pagina y por formulario (ver trampa en 8).
- D-31: pasa de "bucket Cloudflare fase 2" a "dominio de produccion: subdominio de ATFX con CNAME a Vercel sin proxy de Cloudflare, o `*.vercel.app`"; la fase 2 queda como re-hospedar los mismos bytes del almacen en otro origen.
- D-18: agrega ruleset de tags `v*` y immutable releases en la org.
- s14: quita npm, `npm publish --provenance` y `type="module"`; agrega los dos jobs de arriba, el environment, el `vercel.json`, el ensamblado del almacen y sus tests (snippet: `integrity`, `crossorigin`, `data-cfasync` antes de `src`, ruta con version exacta; workflow: actions por SHA, permisos solo por job, `environment` en deploy, `vercel deploy` solo con `--prebuilt`; almacen: falla si falta un release, si un hash no coincide o si una ruta se repite).

## 6. Evidencia en contra

- La razon mas fuerte en contra: npm + jsDelivr ya daba gratis un almacen permanente, un CDN y provenance sin operar nada, y Vercel obliga a construir y operar el almacen append-only a mano; se acepta porque es decision de Karen, y C la mitiga con una proteccion de plataforma (immutable releases protege los archivos mientras el release exista; borrar releases debe quedar restringido) en vez de un script [ref:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- Un error de cabeceras (falta `Access-Control-Allow-Origin`) apaga todos los forms a la vez, porque con `crossorigin` sin CORS el SRI siempre falla; se resuelve con el smoke test de cabeceras despues del deploy y, si se adopta, deploy con `--skip-domain` y `vercel promote` solo tras el smoke [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-04-14]
- Disponibilidad: si el proyecto o el team de Vercel desaparece o deja de pagar, toda landing pierde el form; el SRI protege integridad, no disponibilidad; se acepta porque los bytes del almacen se pueden re-hospedar con el mismo SRI cambiando solo el dominio del snippet [doc:https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases@fpt]
- Un `VERCEL_TOKEN` en GitHub es un secreto de larga vida (en lo leido no aparece OIDC desde GitHub para desplegar en Vercel); se mitiga con token de proyecto, expiracion, environment con revisor y restriccion a tags, y el SRI hace que un deploy malicioso no ejecute en landings ya fijadas [doc:https://vercel.com/docs/accounts/access-tokens@2026-09-08]
- Instant Rollback es la herramienta natural de Vercel y aqui es peligrosa: reapunta los dominios a un deployment anterior, y de ahi se infiere (la doc no lo dice textual) que dejaria de servir los archivos de releases posteriores; se mitiga como regla de proceso (corregir con un redeploy del almacen completo), no tecnicamente: quien tenga permiso de rollback puede hacerlo igual [doc:https://vercel.com/docs/instant-rollback@2026-07-07]

## 7. Ejemplares y anti-ejemplos

- Bien hecho, carga idempotente: Stripe busca un script de su origen y reutiliza el global antes de inyectar [ref:https://github.com/stripe/stripe-js/blob/fba80159740a7e7f6f340f11d90006d72a2fab0b/src/shared.ts@fba8015]
- Bien hecho, doble inclusion visible: Segment marca `invoked` y avisa por consola en vez de cargar dos veces [ref:https://github.com/segmentio/snippet/blob/9eda09f7811e9006176308f26d6da3cb1b49fc6b/template/snippet.js@9eda09f]
- Bien hecho, cabecera inmutable en Vercel: `/assets/(.*)` con `public, max-age=31556952, immutable` en `vercel.json` [doc:https://vercel.com/docs/project-configuration/vercel-json@2026-08-14]
- Bien hecho, snippet SRI cross-origin: `integrity="sha384-..."` mas `crossorigin="anonymous"` en el mismo tag [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src@2026-08-12]
- Anti-ejemplo: `<script src=... integrity=...>` sin `crossorigin` falla siempre [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-04-14]
- Anti-ejemplo: poner `data-cfasync` desde JavaScript o despues de `src`; Rocket Loader no lo respeta [doc:https://developers.cloudflare.com/speed/optimization/content/rocket-loader/ignore-javascripts/@2026-04-17]
- Anti-ejemplo: el snippet de s14 con `type="module"` para un bundle IIFE; el build no es un modulo [repo:docs/specs/sessions/s14-distribucion-ci.md:54]
- Anti-ejemplo: un loader evergreen que inyecta el archivo real; la pagina no puede fijar con SRI lo que cambia [ref:https://github.com/segmentio/snippet/blob/9eda09f7811e9006176308f26d6da3cb1b49fc6b/template/snippet.js@9eda09f]

## 8. Trampas

- Dos versiones del mismo form en una pagina (pin de sitio + pin de campana): la segunda copia ignora que `register` fallo y sigue montando hosts [repo:src/core/mount.ts:227]
- En ese caso el CSS que queda es el de la primera copia que inyecto estilos, aunque monte la otra version: desfase CSS/JS [repo:src/styles/styles.ts:10]
- Rebuild de tags viejos para re-armar el almacen: el `[hash]` depende de las entradas y del algoritmo de esbuild, asi que los bytes y el SRI no se garantizan reproducibles; por eso se guardan bytes, no se reconstruyen [doc:https://esbuild.github.io/api/#entry-names@0.28]
- El build borra `dist` entero: sin un almacen aparte, el siguiente deploy ya no contiene los archivos del release anterior [repo:esbuild.config.mjs:65]
- Instant Rollback a un deployment viejo deja la auto-asignacion de dominios apagada [doc:https://vercel.com/docs/instant-rollback@2026-07-07] y, por inferencia, deja de servir los archivos de releases posteriores; prohibirlo es una regla de proceso, no un control tecnico
- Con Standard Protection la URL generada del deployment de produccion queda restringida: el snippet debe usar el dominio de produccion, nunca una URL generada de deployment [doc:https://vercel.com/docs/deployment-protection@2026-09-15]
- Vercel cachea estaticos por la vida del deployment y sin bypass: si un archivo con hash ya publicado cambiara, el SRI lo bloquearia; el almacen nunca debe reescribir una ruta [doc:https://vercel.com/docs/caching/cdn-cache@2026-09-14]
- Revocar una version no alcanza a navegadores que ya tienen la copia `immutable` fresca; la revocacion solo frena descargas nuevas [doc:https://www.rfc-editor.org/rfc/rfc8246.html@RFC8246]
- Un proyecto en un team Hobby para ATFX viola la politica de uso comercial [doc:https://vercel.com/docs/limits/fair-use-guidelines@2026-09-14]
- Con la integracion Git conectada, Vercel desplegaria en paralelo al workflow; hay que apagarla con `git.deploymentEnabled: false` o no conectar el repo [doc:https://vercel.com/docs/project-configuration/git-configuration@2026-08-25]
- Si el host tiene CSP, necesita `script-src` con el dominio de produccion (o el hash sha384) y algo que permita el `<style>` que inyecta el bundle [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src@2025-12-15]
- Si el host usa `'strict-dynamic'`, la lista de hosts se ignora y el script necesita nonce o hash [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src@2026-08-12]
- Con WP Rocket o WP Meteor sin exclusion, el form no aparece hasta que la persona interactua [doc:https://docs.wp-rocket.me/article/1349-delay-javascript-execution@2026-03-11]
- Poner Cloudflare como proxy delante del dominio de Vercel va contra la recomendacion de Vercel (cache y firewall) [doc:https://vercel.com/kb/guide/cloudflare-with-vercel@2026-10-07]
- Un release inmutable no admite cambios de archivos despues de publicarse: hay que crear borrador, adjuntar todo y recien entonces publicar [doc:https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases@fpt]
- Con "prevent self-review" y Karen como unica revisora, un tag que ella misma empuja no se puede aprobar [doc:https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments@fpt]
- Por contexto: en la landing, el script corre con `defer` o retrasado y `observe` cubre ambos casos por `readyState` [repo:src/core/mount.ts:238]
- Por contexto: en vitest/jsdom no hay red ni SRI; los tests de distribucion deben probar el generador de snippets y el ensamblado del almacen, no la carga en navegador [repo:src/build.test.ts:36]
- Por contexto: en el servidor dev de esbuild no hay `integrity` ni cabeceras de Vercel; un QA con el snippet real debe hacerse contra un preview de Vercel [repo:esbuild.config.mjs:69]
- Por contexto: en el runner de GitHub, el job de deploy es el unico con el token y solo tras la aprobacion del environment [doc:https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments@fpt]
- Por contexto: en Webflow futuro el snippet es el mismo; `data-cfasync` solo tiene efecto si el sitio pasa por Rocket Loader [doc:https://developers.cloudflare.com/speed/optimization/content/rocket-loader/ignore-javascripts/@2026-04-17]

## 9. Incertidumbre

- ASSUMPTION: Vercel no agrega `Access-Control-Allow-Origin` a estaticos por defecto (la doc de cabeceras no lo lista), asi que hay que declararlo. prueba: `curl -sI` a un `.js` de un preview sin la regla y con la regla
- ASSUMPTION: las cabeceras de `vercel.json` se aplican igual en el camino `vercel build` + `deploy --prebuilt` para un proyecto sin framework. prueba: deploy de preview y `curl -sI` a un `.js` bajo `/releases/`
- ASSUMPTION: Vercel sirve `.js` con un `Content-Type` JavaScript, compatible con `nosniff`. prueba: mismo `curl -sI`
- ASSUMPTION: un token de Vercel con alcance de proyecto sirve para `vercel pull`/`build`/`deploy` por CLI (la doc de alcance habla de la API). prueba: workflow_dispatch contra un proyecto de prueba con token de proyecto
- ASSUMPTION: immutable releases esta disponible y se puede activar en la org ATFXLatam con su plan actual (la doc leida no dice planes). prueba: Settings de la org o del repo, opcion de releases inmutables, y crear un release de prueba
- ASSUMPTION: un `<style>` creado por script cae bajo `style-src` igual que uno en el HTML (MDN no lo dice explicito). prueba: pagina de prueba con `Content-Security-Policy: style-src 'self'` y el bundle; mirar la consola
- ASSUMPTION: Skew Protection no sirve con `--prebuilt` (la doc lo dice en una nota, pero su lista de changelog enlaza "Skew Protection now supports prebuilt deployments"); no cambia la recomendacion porque B se descarta por cross-origin y retencion. prueba: no hace falta salvo que se reconsidere B
- ASSUMPTION: en el editor y preview de Elementor el snippet de Custom Code carga igual que en la landing y el SRI no cambia nada respecto de s09. prueba: abrir el editor con el snippet real apuntando a un preview de Vercel y revisar consola y red
- ASSUMPTION: el dominio `<proyecto>.vercel.app` cuenta como dominio de produccion y queda publico con Standard Protection. prueba: abrir la URL en ventana privada tras el primer deploy
- ASSUMPTION: Vercel Blob publico manda CORS y permite cache de 1 ano. prueba: subir un archivo con `cacheControlMaxAge: 31536000` y `curl -sI`; solo si se reconsidera E
- [NEEDS CLARIFICATION: que team de Vercel es dueno del proyecto y con que plan; ATFX es uso comercial y Hobby no lo permite]
- [NEEDS CLARIFICATION: dominio de produccion: subdominio de atfxlatam.com (lo configura IT en Cloudflare, sin proxy) o `*.vercel.app`]
- [NEEDS CLARIFICATION: almacen C (immutable releases) o D (directorio `releases/` en git por PR)]
- [NEEDS CLARIFICATION: quien es revisor del environment `production` ademas de Karen, y si se activa "prevent self-review"]
- [NEEDS CLARIFICATION: si existe la URL "latest" de bajo riesgo, para que paginas y bajo que ruta; este brief no la incluye en la salida desplegada]
- [NEEDS CLARIFICATION: si se agregan eventos DOM para el host en v1.0.0 o despues en un MINOR]
- [NEEDS CLARIFICATION: si el sitio WordPress tiene CSP hoy; si la tiene, IT debe agregar el dominio en `script-src` y resolver el `<style>` inline]

## 10. Checklist de estandar

- [ ] Cada archivo servido bajo `/releases/` responde `Cache-Control: public, max-age=31536000, immutable`, `Access-Control-Allow-Origin: *`, `X-Content-Type-Options: nosniff` y un `Content-Type` JavaScript (smoke en el workflow)
- [ ] El sha384 de cada archivo servido en produccion coincide con el de su `release.json` (smoke en el workflow)
- [ ] Cada deploy contiene todos los releases publicados no revocados; el ensamblado falla si falta uno, si un hash no coincide o si una ruta se repite
- [ ] Ninguna ruta bajo `/releases/X.Y.Z/` se escribe dos veces; los bytes vienen del almacen, nunca de un rebuild de un tag viejo
- [ ] El snippet generado lleva `data-cfasync="false"` antes de `src`, `integrity="sha384-..."`, `crossorigin="anonymous"`, ruta con version exacta y sin `type="module"`
- [ ] El snippet excluye el script de WP Rocket (`nowprocket`) y de WP Meteor (`data-wpmeteor-nooptimize="true"`)
- [ ] Todas las actions estan fijadas por SHA completo; `permissions: {}` a nivel workflow y permisos por job
- [ ] Solo el job `deploy` usa `VERCEL_TOKEN`, desde un environment `production` con revisor requerido y restringido a tags `v*`
- [ ] El token de Vercel tiene el alcance mas estrecho que funcione y expiracion
- [ ] Cada archivo de release tiene artifact attestation y el deploy la verifica con `gh attestation verify --repo ATFXLatam/atfx-leadkit --signer-workflow ATFXLatam/atfx-leadkit/.github/workflows/release.yml`
- [ ] `vercel.json` tiene `git.deploymentEnabled: false` y el proyecto no usa Instant Rollback (correccion = redeploy)
- [ ] El tag del release es igual a `v` + version de `package.json`, y la primera version publica es 1.0.0
- [ ] Un formulario de leads nunca se carga desde una URL mutable
- [ ] Cada pagina tiene una sola fuente de pin por formulario
- [ ] El peso de cada bundle cumple D-19 en el workflow de release

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | Subresource Integrity (WD) | W3C | WD-sri-2-20260320 | 2026-10-07 | high |
| 2 | Subresource Integrity | MDN | 2026-04-14 | 2026-10-07 | high |
| 3 | script element | MDN | 2026-05-09 | 2026-10-07 | high |
| 4 | RFC 8246 HTTP Immutable Responses | IETF | RFC 8246 | 2026-10-07 | high |
| 5 | X-Content-Type-Options | MDN | 2026-03-17 | 2026-10-07 | high |
| 6 | Cross-Origin-Resource-Policy | MDN | 2025-11-21 | 2026-10-07 | high |
| 7 | CSP script-src | MDN | 2026-08-12 | 2026-10-07 | high |
| 8 | CSP style-src | MDN | 2025-12-15 | 2026-10-07 | high |
| 9 | Static Configuration with vercel.json | Vercel | 2026-08-14 | 2026-10-07 | high |
| 10 | Cache-Control headers | Vercel | 2026-09-14 | 2026-10-07 | high |
| 11 | Vercel CDN Cache | Vercel | 2026-09-14 | 2026-10-07 | high |
| 12 | Response headers | Vercel | 2026-08-11 | 2026-10-07 | high |
| 13 | vercel deploy | Vercel | 2026-09-18 | 2026-10-07 | high |
| 14 | How can I use GitHub Actions with Vercel | Vercel | 2026-08-20 | 2026-10-07 | high |
| 15 | Git Configuration | Vercel | 2026-08-25 | 2026-10-07 | high |
| 16 | Build Output API | Vercel | 2026-08-11 | 2026-10-07 | high |
| 17 | Instant Rollback | Vercel | 2026-07-07 | 2026-10-07 | high |
| 18 | Deployment Retention | Vercel | 2026-09-16 | 2026-10-07 | high |
| 19 | Skew Protection | Vercel | 2026-09-16 | 2026-10-07 | medium (nota sobre prebuilt contradice un changelog enlazado) |
| 20 | Deployment Protection | Vercel | 2026-09-15 | 2026-10-07 | high |
| 21 | Access tokens | Vercel | 2026-09-08 | 2026-10-07 | high |
| 22 | Fair Use Guidelines | Vercel | 2026-09-14 | 2026-10-07 | high |
| 23 | Adding a Custom Domain | Vercel | 2026-09-16 | 2026-10-07 | high |
| 24 | Cloudflare with Vercel | Vercel | 2026-10-07 | 2026-10-07 | medium |
| 25 | Vercel Blob / SDK | Vercel | 2026-08-26 | 2026-10-07 | high |
| 26 | Security hardening for GitHub Actions | GitHub | fpt | 2026-10-07 | high |
| 27 | Managing environments for deployment | GitHub | fpt | 2026-10-07 | high |
| 28 | Gated features: environments, attestations | GitHub (github/docs) | 56fcfa8 | 2026-10-07 | high |
| 29 | Using artifact attestations | GitHub | fpt | 2026-10-07 | high |
| 30 | Artifact attestations (concepto) | GitHub | fpt | 2026-10-07 | high |
| 31 | gh attestation verify | GitHub CLI | 2026-10-07 | 2026-10-07 | high |
| 32 | Immutable releases | GitHub | fpt | 2026-10-07 | high |
| 33 | About releases | GitHub | fpt | 2026-10-07 | high |
| 34 | SLSA levels | OpenSSF SLSA | 1.0 | 2026-10-07 | high |
| 35 | esbuild API, entry names | esbuild | 0.28 | 2026-10-07 | high |
| 36 | Semantic Versioning | semver.org | 2.0.0 | 2026-10-07 | high |
| 37 | Including Stripe.js | Stripe | 2026-10-07 | 2026-10-07 | high |
| 38 | Google tag install | Google | 2026-07-30 | 2026-10-07 | high |
| 39 | HubSpot global form events | HubSpot | latest | 2026-10-07 | high |
| 40 | Rocket Loader ignore JavaScripts | Cloudflare | 2026-04-17 | 2026-10-07 | high |
| 41 | WP Rocket delay JavaScript execution | WP Media | 2026-03-11 | 2026-10-07 | high |
| 42 | WP Meteor | wordpress.org | 3.4.19 | 2026-10-07 | medium |
| 43 | Elementor Pro Custom Code | Elementor | sin fecha | 2026-10-07 | medium |
| 44 | stripe/stripe-js src/shared.ts | Stripe | fba8015 | 2026-10-07 | high |
| 45 | segmentio/snippet template/snippet.js | Segment | 9eda09f | 2026-10-07 | high |
| 46 | actions/attest README | GitHub | 7d8b1ca | 2026-10-07 | high |
| 47 | actions/attest-build-provenance README | GitHub | 9d57eef | 2026-10-07 | high |
| 48 | jsDelivr README | jsDelivr | 4fe4dfc | 2026-10-07 | high |
