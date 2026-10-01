# Reference Brief: distribucion del paquete nuevo (v2, greenfield) del widget de formularios de leads

Slug: forms-v2-distribution | Nivel: deep | Fecha: 2026-10-01 | Estado: ESCALADO
Versiones: esbuild=0.23, typescript=5.5, zod=3.23, gsap=3.15
Verificador: research-verifier 2026-10-01 ESCALATE

## 1. Pregunta y decisiones abiertas

Cual es la mejor forma de distribuir un widget de formularios de leads NUEVO, sin compatibilidad con los embeds actuales, que se instalara en todas las landings futuras de www.atfxlatam.com (WordPress + Elementor Pro detras de Cloudflare) y que tambien podria usarse en Webflow u otros hosts. El brief alimenta la spec del paquete v2; no decide.

Supera a `embed-form-distribution` (ESCALADO): aquel asumia conservar la URL del loader en las landings existentes. La restriccion nueva de Karen (sesion 2026-10-01) es un paquete greenfield; las landings anteriores quedan con el paquete viejo, deprecado de forma permanente. De aquel brief siguen vigentes, sin reinvestigar, los bloques de testing (vitest + Playwright con `admin-ajax` mockeado) y de CI (permisos minimos, actions por SHA, rulesets, release por PR); este brief rehace distribucion, integridad, control de version y gobernanza.

Las `Versiones:` son las del repo actual (`atfx-forms`); el paquete v2 todavia no tiene manifiesto, asi que la spec debe fijar las suyas y este brief caduca si cambian las de build.

Insumos leidos en esta corrida: `CLAUDE.md`, `loader.js`, `package.json`, `.github/workflows/release.yml`, `src/index.ts` y `src/core/submit-elementor.ts` del repo; el brief previo; el informe `~/Desktop/security-audit-atfx-forms-2026-10-01.md` (fuera del repo; sus IDs CN-xxx se mencionan como referencia, no como prueba); las memorias `feedback_webflow_front_only.md` y `reference_atom_webflow_ds_loader_pin.md`; y por `gh api` (GET) que `karenrebecag/at_forms` es publico, no archivado, con ultimo tag `v1.0.12`, y que la cuenta personal `karenrebecag` esta en plan GitHub Pro.

Correccion de encuadre. El encargo agrupa como opcion (c) "snippet con version fijada + SRI (patron Plausible/Fathom/Stripe/HubSpot/Typeform/Cal.com/Segment)". Lo leido en esta corrida no lo sostiene: Fathom, Typeform, Cal.com y Segment publican un script de su propio dominio sin version y sin `integrity`, y Stripe usa un nombre de version que recibe cambios continuos (secciones 3 y 4). El patron version exacta + SRI es el de librerias distribuidas por npm y jsDelivr (Bootstrap, htmx). Las dos familias responden a modelos de amenaza distintos, y la decision D1 es elegir entre ellas.

D1, canal y modelo de actualizacion. Evergreen (una URL estable que el dueno actualiza: Stripe, Typeform, Cal.com) frente a inmutable (la pagina fija bytes exactos con SRI: Bootstrap, htmx). Canales candidatos: (a) npm + jsDelivr `/npm/` con version exacta; (b) host propio con loader sin version y assets con hash (Vercel, Cloudflare Workers/R2, subdominio de ATFX); (c) host propio con rutas versionadas + SRI; (d) plugin de WordPress que encola desde el mismo origen; (e) iframe hospedado.

D2, integridad y procedencia. Que control frena una credencial comprometida (CN-001): SRI en la pagina, rulesets y reviewers, provenance npm o artifact attestations, y que nivel SLSA alcanza cada canal.

D3, donde vive el pin. Por landing (cada campana congela su version) o en un slot unico por sitio (Elementor Pro Custom Code, head de Webflow), con override por landing.

D4, gobernanza, costo y operacion. Cuenta personal o de organizacion (GitHub, npm, Vercel, Cloudflare), costo recurrente, y carga para una sola persona.

D5, el paquete viejo. Que hacer con `at_forms` para que "deprecado permanentemente" signifique congelado y no "sigue publicando en `@latest`".

## 2. Estado actual

Contextos: landing de produccion WordPress + Elementor Pro detras de Cloudflare con Rocket Loader (www.atfxlatam.com), editor y preview de Elementor con sesion de admin, slot de sitio Elementor Pro Custom Code, Webflow como host futuro (custom code de sitio o de pagina), CDN jsDelivr, registro npm, runner de GitHub Actions que publica, dev server local de esbuild, landings viejas que siguen cargando `at_forms@latest`
- El repo actual es publico por requisito de jsDelivr `/gh/` y vive en la cuenta personal `karenrebecag` [repo:CLAUDE.md:11]
- El snippet actual de Elementor carga `cdn.jsdelivr.net/gh/karenrebecag/at_forms@latest/loader.js` [repo:CLAUDE.md:13]
- El sitio destino es WordPress + Elementor Pro detras de Cloudflare y WP Engine [repo:CLAUDE.md:14]
- El script del snippet lleva `data-cfasync="false"` antes de `src` para que Rocket Loader no lo toque [repo:CLAUDE.md:34]
- La atribucion del lead sale del campo `referrer` del POST, que el motor llena con `location.href` de la landing [repo:CLAUDE.md:110]
- jsDelivr tarda varios minutos en propagar `@latest` aunque el purge responda 200 [repo:CLAUDE.md:118]
- La decision vigente para el paquete viejo es no fijar versiones y esperar la propagacion de `@latest` [repo:CLAUDE.md:120] [KAREN:atfx-forms/CLAUDE.md hallazgo 6, linea 120]
- `admin-ajax` solo permite CORS desde `https://www.atfxlatam.com` [repo:CLAUDE.md:122]
- El deploy documentado del paquete viejo es `git push origin main` y el bot commitea sobre `main` despues [repo:CLAUDE.md:182]
- El loader viejo fija la version en una variable que el CI reescribe con sed [repo:loader.js:5]
- El loader viejo apunta a `cdn.jsdelivr.net/gh/karenrebecag/at_forms` como base [repo:loader.js:6]
- El loader viejo inyecta `forms.css` como `link` sin `integrity` [repo:loader.js:10]
- El loader viejo inyecta `forms.js` como modulo con `data-cfasync=false` puesto desde JS y sin `integrity` [repo:loader.js:16]
- El workflow viejo publica en cada push a `main` que toque `src/`, `loader.js`, `package.json` o `esbuild.config.mjs` [repo:.github/workflows/release.yml:6]
- El token del workflow viejo tiene `contents: write` en todo el job [repo:.github/workflows/release.yml:14]
- El workflow viejo corre Node 20 [repo:.github/workflows/release.yml:30]
- El purge de jsDelivr del workflow viejo oculta cualquier fallo con `|| true` [repo:.github/workflows/release.yml:73]
- El bundle viejo lee su version de un `script[src*="at_forms@"]`, acoplado a la URL de jsDelivr [repo:src/index.ts:8]
- El envio va a `/wp-admin/admin-ajax.php` relativo al origen de la pagina [repo:src/core/submit-elementor.ts:3]
- El envio manda la cabecera `X-Requested-With: XMLHttpRequest`, requisito para que Elementor dispare la accion de Salesforce [repo:src/core/submit-elementor.ts:28]
- Karen pidio un paquete nuevo, distinto, para todas las paginas desde ahora, con las anteriores en paquetes deprecados permanentemente [KAREN:sesion 2026-10-01, mensaje "trabajemos sobre un nuevo paquete, totalmente distinto para ponerlo en todas las paginas a partir de ahora. Todas las anteriores quedan con los paquetes deprecados permanentemente"]
- Deploy y merge son de Karen, nunca de un agente [KAREN:~/.claude/CLAUDE.md bloque block y rules/common/development-workflow.md paso 5]
- El GitHub de Karen esta vinculado a dos cuentas Vercel, el deploy por git queda bloqueado con TEAM_ACCESS_REQUIRED y el workaround es el CLI logueado como miembro del team dueno [KAREN:~/.claude/CLAUDE.md bloque vercel]
- En Webflow, el sitio es solo front y CMS y la data viaja siempre a un endpoint propio desacoplado [KAREN:memoria feedback_webflow_front_only.md]
- En otro proyecto suyo (DS de Atom en Webflow) quedo registrado cerrar un loader `@latest` fijandolo a un tag con `integrity` sha384 y `data-cfasync="false"`, por ser vector de cadena de suministro [KAREN:memoria reference_atom_webflow_ds_loader_pin.md, precedente 2026-09-21]

## 3. Fuentes primarias

- jsDelivr sirve paquetes npm en `/npm/package@version/file` y una version nueva publicada en npm queda disponible sin mantenimiento [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- jsDelivr marca cargar `@latest` u omitir la version como "not recommended for production usage" [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- jsDelivr cachea versiones exactas "effectively forever" (cabecera de 1 ano y copia permanente en S3, sin forma de actualizar el contenido) y los alias de version, incluido `latest`, 7 dias [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- jsDelivr sigue sirviendo un archivo desde su almacenamiento permanente aunque el paquete se borre de npm [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- jsDelivr genera una version minificada si se pide `.min` de un archivo que no existe, y el archivo por defecto (sin ruta) siempre sale minificado [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- jsDelivr hace version fallback: si un archivo no existe en la version pedida, sirve el de una version anterior en vez de un 404 [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- En npm, una vez usado `package@version` no se puede volver a usar nunca, aunque se despublique [doc:https://docs.npmjs.com/policies/unpublish@2026-10-01]
- npm trusted publishing publica desde CI por OIDC sin tokens de larga vida, y desde GitHub Actions genera provenance por defecto [doc:https://docs.npmjs.com/trusted-publishers@2026-10-01]
- npm trusted publishing exige npm CLI 11.5.1 o superior, Node 22.14.0 o superior, runners hospedados y `id-token: write` [doc:https://docs.npmjs.com/trusted-publishers@2026-10-01]
- npm no genera provenance desde repositorios privados, aunque el paquete sea publico [doc:https://docs.npmjs.com/trusted-publishers@2026-10-01]
- npm recomienda, con trusted publishing configurado, la opcion "Require two-factor authentication and disallow tokens" [doc:https://docs.npmjs.com/trusted-publishers@2026-10-01]
- Con "Require two-factor authentication and disallow tokens" ningun token granular puede publicar [doc:https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification@2026-10-01]
- npm dice que provenance no garantiza ausencia de codigo malicioso; da un enlace verificable a la fuente y al build, comprobable con `npm audit signatures` [doc:https://docs.npmjs.com/generating-provenance-statements@2026-10-01]
- Las organizaciones de npm tienen un plan gratuito "Unlimited public packages" [doc:https://docs.npmjs.com/creating-an-organization@2026-10-01]
- SLSA Build L2 exige una plataforma de build hospedada, no la estacion de un individuo, con provenance firmada; L3 exige aislar el material de firma de los pasos del usuario [doc:https://slsa.dev/spec/v1.0/levels@1.0]
- Artifact attestations dan SLSA v1.0 Build L2 por si solas y L3 con reusable workflows, y no garantizan que el artefacto sea seguro [doc:https://docs.github.com/en/actions/concepts/security/artifact-attestations@fpt]
- En planes Free, Pro y Team, artifact attestations solo estan disponibles para repos publicos [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/attestations.md@56fcfa8]
- Rulesets estan disponibles en repos publicos y privados con GitHub Pro [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/repo-rules.md@56fcfa8]
- En planes Free, Pro y Team, los required reviewers de environments solo estan disponibles en repos publicos [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/environments.md@56fcfa8]
- Un repo archivado deja codigo, releases, tags y ramas en solo lectura, y se puede desarchivar [doc:https://docs.github.com/en/repositories/archiving-a-github-repository/archiving-repositories@fpt]
- SRI es la defensa contra un tercero (por ejemplo un CDN) que inyecta o reemplaza el contenido de un archivo [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- SRI entre origenes exige CORS y el atributo `crossorigin` [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- Las cabeceras `Integrity-Policy` e `Integrity-Policy-Report-Only` permiten exigir `integrity` en los scripts de una pagina [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- Los scripts de modulo usan CORS para cargarse desde otro origen, y los scripts insertados por JS se comportan como `async` [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script@2026-10-01]
- Una peticion con cabeceras fuera de la lista CORS-safelisted (como `X-Requested-With`) dispara un preflight `OPTIONS`; `multipart/form-data` si es un Content-Type permitido [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS@2026-10-01]
- Para URLs con version que nunca cambian se recomienda `max-age=31536000`, y para URLs sin version `no-cache` o un `max-age` corto con validacion [doc:https://web.dev/articles/http-cache@2026-10-01]
- `preconnect` adelanta DNS, conexion y TLS; necesita `crossorigin` para recursos CORS y el navegador cierra la conexion sin uso a los 10 segundos [doc:https://web.dev/articles/preconnect-and-dns-prefetch@2026-10-01]
- Para contenido inyectado, web.dev recomienda reservar espacio con `min-height` y no colapsar el hueco reservado [doc:https://web.dev/articles/optimize-cls@2026-10-01]
- Rocket Loader ignora un script con `data-cfasync="false"` puesto antes de `src`; el atributo no se puede agregar dinamicamente desde JS y debe estar en el HTML original [doc:https://developers.cloudflare.com/speed/optimization/content/rocket-loader/ignore-javascripts/@2026-10-01]
- Una ruta de Workers mapea un patron de URL de una zona proxied por Cloudflare a un Worker, y exige la zona en la cuenta [doc:https://developers.cloudflare.com/workers/configuration/routing/routes/@2026-10-01]
- En Workers, las peticiones a static assets son gratis e ilimitadas y el plan Free incluye 100,000 peticiones diarias al Worker [doc:https://developers.cloudflare.com/workers/platform/pricing/@2026-10-01]
- Un dominio propio para un bucket R2 publico debe ser una zona de la misma cuenta, y `r2.dev` es solo para desarrollo [doc:https://developers.cloudflare.com/r2/buckets/public-buckets/@2026-10-01]
- Los equipos Hobby de Vercel estan restringidos a uso personal no comercial, y cobrar por crear o alojar el sitio cuenta como uso comercial [doc:https://vercel.com/docs/limits/fair-use-guidelines@2026-09-14]
- `wp_enqueue_script` agrega `$ver` como query string para romper cache y desde WP 6.3 acepta `strategy` defer o async; no tiene soporte nativo de `integrity` [doc:https://developer.wordpress.org/reference/functions/wp_enqueue_script/@6.3]
- Las guias del directorio de plugins de WordPress.org prohiben enviar codigo ejecutable por terceros y exigen incluir localmente todo JS y CSS que no sea de un servicio [doc:https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/@2026-10-01]
- `unfiltered_html` permite pegar JavaScript en paginas y widgets; lo tienen Administrator y Editor en sitio simple y solo Super Admin en Multisite [doc:https://wordpress.org/documentation/article/roles-and-capabilities/@2026-09-02]
- Elementor Pro Custom Code agrega codigo en head, inicio o final de body, con prioridad y con condiciones de visualizacion como cualquier parte del sitio [doc:https://elementor.com/blog/introducing-pro-3-1/@3.1]
- Stripe pide cargar Stripe.js siempre desde `js.stripe.com`, nunca dentro de un bundle ni auto-hospedado [doc:https://docs.stripe.com/js/including@2026-10-01]
- Stripe.js usa un modelo evergreen: cada version con nombre en la URL recibe sin cambio de URL optimizaciones y fixes de seguridad, y los cambios rotundos llegan con un nombre nuevo dos veces al ano [doc:https://docs.stripe.com/sdks/stripejs-versioning@2026-10-01]
- Fathom documenta su snippet como `cdn.usefathom.com/script.js` con `data-site`, sin version ni `integrity` [doc:https://usefathom.com/docs/script/embed@2026-10-01]
- Segment carga `cdn.segment.com/analytics.js/v1/` mas la write key, sin version de la libreria en la URL [doc:https://www.twilio.com/docs/segment/connections/sources/catalog/libraries/website/javascript/quickstart@2026-10-01]
- Bootstrap documenta su CDN como jsDelivr `/npm/bootstrap@5.3.8/...` con `integrity` sha384 y `crossorigin="anonymous"` [doc:https://getbootstrap.com/docs/5.3/getting-started/introduction/@5.3.8]
- htmx documenta jsDelivr `/npm/htmx.org@2.0.11/...` con `integrity` y `crossorigin`, y aconseja considerar no usar CDNs en produccion [doc:https://htmx.org/docs/@2.0.11]

## 4. Implementaciones de referencia

- Bootstrap (twbs, 175k estrellas, push 2026-10-01): su config de docs fija cada archivo del CDN a una version exacta de jsDelivr `/npm/` con su hash sha384 al lado [ref:https://github.com/twbs/bootstrap/blob/c1f9b9db4dd14d5353e34462ec589cdf8c7270d3/config.yml@c1f9b9d]
- Bootstrap genera los hashes con un script que calcula sha384 sobre los mismos archivos de `dist/` que sirve el CDN, y advierte que si no son los mismos archivos los hashes no coinciden [ref:https://github.com/twbs/bootstrap/blob/c1f9b9db4dd14d5353e34462ec589cdf8c7270d3/build/generate-sri.mjs@c1f9b9d]
- htmx (bigskysoftware, 49.5k estrellas, push 2026-09-22): la doc de instalacion usa version exacta + `integrity` + `crossorigin` en jsDelivr y ofrece descargar el mismo archivo para auto-hospedarlo [ref:https://github.com/bigskysoftware/htmx/blob/fa978b24e75fb03c137bf2cdae4fef0e711cf8a1/www/content/docs.md@fa978b2]
- Plugin oficial de Plausible para WordPress (org plausible, push 2026-10-01): registra el script con `wp_register_script` y version `null`, es decir, el plugin envuelve un script remoto en vez de empaquetar la libreria [ref:https://github.com/plausible/wordpress/blob/6df5f4edc157438a498fdbebeadbfe596da3c993/src/Assets.php@6df5f4e]
- El mismo plugin apunta al script hospedado por Plausible (`/js/` mas nombre) o, con proxy activado, a una copia cacheada en el dominio del sitio [ref:https://github.com/plausible/wordpress/blob/6df5f4edc157438a498fdbebeadbfe596da3c993/src/Helpers.php@6df5f4e]
- Cal.com embeds (repo de Cal.com): el snippet inyecta `embed.js` desde su propio host, sin version en la URL y sin `integrity` [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-snippet/src/index.ts@54343aa]
- Typeform embed (SDK oficial): el snippet carga `embed.typeform.com/next/embed.js` y su CSS desde dominio propio con el alias `next`, sin version exacta ni `integrity` [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/packages/embed/README.md@ffcede3]
- Typeform publica con `id-token: write` y `contents: write` en el job de release, y actions fijadas por tag mayor [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/.github/workflows/release.yml@ffcede3]

## 5. Opciones

D1, canal y modelo de actualizacion:

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. npm publico + jsDelivr `/npm/` con version exacta + SRI en el snippet | Bytes inmutables por politica de npm y por la cache permanente de jsDelivr; un host o una cuenta comprometidos no cambian una landing ya publicada (falla cerrado); provenance automatica con trusted publishing (SLSA L2) sin tokens; gratis; sirve igual en WordPress, Webflow u otro host; sin `dist/` en git; sin Vercel | Origen tercero (conexion extra, `cdn.jsdelivr.net` es bypass conocido en una CSP por host); cada actualizacion exige editar el pin; repo publico obligatorio para provenance; servicio nuevo (cuenta u org npm) | media | Recomendada |
| B. Host propio evergreen: loader sin version `max-age` corto + assets con hash inmutables (Vercel, Cloudflare Workers, subdominio ATFX) | Un fix llega a todas las landings en minutos sin tocar paginas; patron de Stripe, Typeform, Cal.com | El loader cambia, asi que la pagina no puede fijarlo con SRI: quien controle el host o el pipeline controla todas las landings (CN-001 sigue abierto, solo mitigado); Vercel Hobby no admite uso comercial y el deploy por git de Karen esta bloqueado; operar un origen | media | No como canal principal |
| C. Host propio con rutas versionadas + SRI (A sin npm) | Mismo modelo de integridad que A; si el host es una ruta de Worker en la zona de atfxlatam.com, es primera parte y sin conexion extra | Hay que garantizar inmutabilidad a mano (nada impide reescribir una ruta); sin provenance npm (requiere attestations propias); depende de acceso a la cuenta Cloudflare de ATFX | media-alta | Fase 2: espejo de primera parte de los mismos bytes de A |
| D. Plugin de WordPress que encola el bundle desde el mismo origen | Primera parte, CSP trivial, sin terceros, `strategy` defer nativo | Una sola version por sitio (no por campana); solo WordPress, no Webflow; exige instalar plugins en el WP de ATFX en WP Engine; ciclo de release por el admin de WP; PHP que mantener; sin `integrity` nativo; los plugins de vendors son envoltorios de un script remoto, no el canal | media-alta | No |
| E. iframe hospedado | Aislamiento total de estilos y JS | Desde otro origen no puede postear a `admin-ajax` (CORS solo www.atfxlatam.com y `X-Requested-With` dispara preflight); `location.href` del iframe rompe la atribucion por `referrer`; altura desconocida = CLS y postMessage para redimensionar; exige endpoint propio | alta | No |

D3, donde vive el pin (aplica a A y C):

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| Pin en cada landing (widget HTML) | Cada campana congela su version; regresiones de una version nueva no tocan campanas vivas | Un fix de seguridad exige editar N landings; riesgo de landings olvidadas en versiones viejas | baja | Para campanas que deban congelarse |
| Pin unico por sitio (Elementor Pro Custom Code con condiciones; head en Webflow) y la landing solo pone el mount | Una edicion y un hash por release cubren todo el sitio; mismo patron que Karen ya uso en el DS de Atom | Hay que mantener las condiciones (o cargar en todo el sitio); una landing con su propio pin ademas del global carga dos copias | baja | Default, sujeto a aclaracion de Karen |

Matriz de criterios (D1):

| Criterio | A npm + jsDelivr pin+SRI | B host propio evergreen | C host propio pin+SRI | D plugin WP | E iframe |
|---|---|---|---|---|---|
| Integridad ante credencial comprometida | Fuerte: landings vivas intactas | Debil: todas cambian | Fuerte | Media: quien publica el plugin cambia todo el sitio | Debil: igual que B |
| CSP del host | Origen tercero en `script-src` | Origen propio nuevo | Ninguno si es la zona de ATFX | Ninguno | Solo `frame-src` |
| Latencia | Conexion extra a jsDelivr | Conexion extra salvo subdominio en la zona | Sin conexion extra en la zona | Sin conexion extra | Documento completo extra |
| Cache y rollback | Cache de 1 ano; rollback = cambiar el pin | Rollback = redeploy, frescura acotada al TTL del loader | Igual que A | Rollback = version anterior del plugin | Igual que B |
| Control por landing | Si | No | Si | No | No |
| Gobernanza | Org npm + repo publico | Cuenta del host | Cuenta Cloudflare de ATFX | Admin del WP de ATFX | Cuenta del host |
| Costo | 0 | Vercel Pro si es comercial; Workers casi 0 | Casi 0 | 0 | Host + endpoint |
| Mantenimiento por 1 persona | Bajo: publicar + actualizar pin | Medio: operar un origen | Medio | Alto: PHP + WP | Alto |
| SLSA | L2 con trusted publishing | L2 solo si despliega CI con attestations | L2 con attestations | L2 posible para el zip, instalacion manual | Igual que B |

Recomendacion (para que la spec la adopte o la rechace). A + pin unico por sitio. El paquete v2 se publica en npm bajo un scope de organizacion, solo desde GitHub Actions con trusted publishing y la opcion "disallow tokens". Cada release es un unico archivo autocontenido (JS con el CSS dentro) que no carga nada mas. El snippet es un `script` estatico con `data-cfasync="false"` antes de `src`, la URL de jsDelivr `/npm/` con version exacta y la ruta del archivo tal como esta en el tarball, `integrity` sha384 y `crossorigin="anonymous"`. El pin vive por defecto en un slot unico por sitio; una landing que deba congelar su version se excluye del slot global y lleva su propio snippet. Fase 2, si ATFX da una ruta en su zona de Cloudflare: el mismo archivo servido por un Worker en www.atfxlatam.com, con el mismo hash, para quitar el tercero sin cambiar la integridad. El paquete viejo se congela archivando su repo cuando el v2 este vivo.

## 6. Evidencia en contra

- Contra A, el argumento mas fuerte: los vendors que embeben widgets a escala (Stripe, Typeform, Cal.com, Fathom, Segment) eligen evergreen sin SRI para que un fix de seguridad llegue sin tocar paginas [doc:https://docs.stripe.com/sdks/stripejs-versioning@2026-10-01]
- Se acepta con una razon: esos vendors operan su propio dominio y su pipeline de release con monitoreo; aqui hay una sola persona, una cuenta personal y un hallazgo High (CN-001) sobre exactamente ese riesgo, y el pin unico por sitio reduce un fix a una edicion [KAREN:memoria reference_atom_webflow_ds_loader_pin.md, precedente 2026-09-21]
- Contra A: la decision registrada para el paquete viejo fue no fijar versiones [repo:CLAUDE.md:120]
- No se resuelve aqui: es una preferencia de Karen sobre un canal que ella misma pide reemplazar, y queda como aclaracion en la seccion 9; con pin por sitio, "todas a la ultima" se conserva con una edicion por release y sin esperar la propagacion de un alias [KAREN:sesion 2026-10-01, mensaje "trabajemos sobre un nuevo paquete, totalmente distinto para ponerlo en todas las paginas a partir de ahora. Todas las anteriores quedan con los paquetes deprecados permanentemente"]
- Contra A: SRI falla cerrado, asi que cualquier byte distinto (un CDN que reescribe, un nombre `.min` generado, un fallback de version) hace desaparecer el form y se pierden leads en silencio [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- Se resuelve con el checklist: ruta exacta del tarball, verificacion post-publicacion del hash contra lo que sirve jsDelivr y un E2E en la landing; perder disponibilidad se prefiere a servir codigo alterado en un sitio de broker [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- Contra A: htmx, que distribuye asi, aconseja considerar no usar CDNs en produccion [ref:https://github.com/bigskysoftware/htmx/blob/fa978b24e75fb03c137bf2cdae4fef0e711cf8a1/www/content/docs.md@fa978b2]
- Se acepta para la fase 1 y se resuelve en fase 2: el hash SRI depende solo de los bytes, asi que el mismo archivo servido desde la zona de ATFX conserva el mismo `integrity` [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- Contra A: si ATFX agrega una CSP por host, permitir `cdn.jsdelivr.net` abre un bypass conocido [doc:https://github.com/google/csp-evaluator/blob/ad530f3ae5473f9e03c8bf500ee0ada8d9e9b822/allowlist_bypasses/jsonp.ts@ad530f3]
- Se acepta: la CSP real no esta verificada (seccion 9) y la fase 2 elimina el origen tercero; con `Integrity-Policy` el sitio puede ademas exigir `integrity` en todo script [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- Contra A: provenance exige repo publico, asi que el codigo del widget sigue siendo publico [doc:https://docs.npmjs.com/trusted-publishers@2026-10-01]
- Se acepta: el bundle ya es publico en el navegador y el repo actual ya es publico; mantenerlo publico conserva tambien attestations y reviewers de environment en plan Pro [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/environments.md@56fcfa8]
- Contra A: provenance no prueba que el codigo sea benigno; una credencial de GitHub comprometida puede publicar una version maliciosa con provenance valida [doc:https://docs.npmjs.com/generating-provenance-statements@2026-10-01]
- Se acepta y se acota: esa version nueva no llega a ninguna landing hasta que alguien cambie el pin y el hash, y el ruleset con PR revisado del brief previo sigue siendo el control de entrada [doc:https://github.com/github/docs/blob/56fcfa816f27bca239e5d39fff0d4f74f77ec995/data/reusables/gated-features/repo-rules.md@56fcfa8]
- A favor de D, honesto: un plugin es la forma nativa de WordPress de servir assets de primera parte, y el directorio exige incluir JS y CSS localmente [doc:https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/@2026-10-01]
- Se descarta como canal porque esa guia regula plugins publicados en WordPress.org, no un widget multi-host, y los plugins de vendors como Plausible envuelven un script remoto en vez de ser el canal [ref:https://github.com/plausible/wordpress/blob/6df5f4edc157438a498fdbebeadbfe596da3c993/src/Assets.php@6df5f4e]
- Contra el pin por sitio: Elementor Custom Code con condiciones exige permisos de sitio en el WP de ATFX que no estan confirmados [doc:https://elementor.com/blog/introducing-pro-3-1/@3.1]
- Se acepta como aclaracion; si no hay acceso, el pin por landing es el fallback sin cambiar el canal [doc:https://wordpress.org/documentation/article/roles-and-capabilities/@2026-09-02]

## 7. Ejemplares y anti-ejemplos

- Bien: fijar version exacta de jsDelivr `/npm/` con su sha384 al lado, como en la config de Bootstrap [ref:https://github.com/twbs/bootstrap/blob/c1f9b9db4dd14d5353e34462ec589cdf8c7270d3/config.yml@c1f9b9d]
- Bien: calcular el hash en el build con `crypto.createHash('sha384')` sobre el mismo archivo que sirve el CDN [ref:https://github.com/twbs/bootstrap/blob/c1f9b9db4dd14d5353e34462ec589cdf8c7270d3/build/generate-sri.mjs@c1f9b9d]
- Bien: snippet de una linea con version exacta, `integrity` y `crossorigin="anonymous"`, como el de htmx [ref:https://github.com/bigskysoftware/htmx/blob/fa978b24e75fb03c137bf2cdae4fef0e711cf8a1/www/content/docs.md@fa978b2]
- Bien: `data-cfasync="false"` escrito en el HTML antes de `src`, porque Rocket Loader no lo respeta si se agrega desde JS [doc:https://developers.cloudflare.com/speed/optimization/content/rocket-loader/ignore-javascripts/@2026-10-01]
- Bien: `preconnect` a `https://cdn.jsdelivr.net` con `crossorigin` cuando el form esta arriba del pliegue [doc:https://web.dev/articles/preconnect-and-dns-prefetch@2026-10-01]
- Bien: el mount reserva altura con `min-height` en el propio snippet o en el CSS del sitio, no en el CSS del widget que llega tarde [doc:https://web.dev/articles/optimize-cls@2026-10-01]
- Forma del snippet que la spec puede adoptar (el nombre del paquete, la version y el hash los fija el release) [ref:https://github.com/bigskysoftware/htmx/blob/fa978b24e75fb03c137bf2cdae4fef0e711cf8a1/www/content/docs.md@fa978b2]

```html
<div data-atfx-form-mount="lead" data-lang="es" style="min-height:560px"></div>
<script data-cfasync="false" type="module"
  src="https://cdn.jsdelivr.net/npm/SCOPE/PAQUETE@2.0.0/dist/forms.js"
  integrity="sha384-HASH_DEL_RELEASE" crossorigin="anonymous"></script>
```

- Contraste evergreen: Cal.com inyecta `embed.js` sin version desde su host, valido para un SaaS que opera su origen pero sin SRI posible [ref:https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/packages/embeds/embed-snippet/src/index.ts@54343aa]
- Anti-ejemplo: el loader viejo usa `@latest`, que jsDelivr desaconseja en produccion y que cachea 7 dias [repo:CLAUDE.md:13]
- Anti-ejemplo: el loader viejo inyecta JS y CSS sin `integrity` [repo:loader.js:16]
- Anti-ejemplo: `curl -s ... || true` esconde el fallo de publicacion [repo:.github/workflows/release.yml:73]
- Anti-ejemplo: leer la version de la URL del CDN acopla el bundle al canal [repo:src/index.ts:8]
- Anti-ejemplo: Typeform, aun siendo referencia, publica con actions fijadas por tag mayor y no por SHA [ref:https://github.com/typeform/embed/blob/ffcede3890bed380cdfd53249026d23282cd3f48/.github/workflows/release.yml@ffcede3]

## 8. Trampas

- En la landing de produccion, pedir `forms.min.js` cuando el tarball trae `forms.js` hace que jsDelivr genere un minificado propio y el hash no coincide [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- En la landing de produccion, omitir la ruta del archivo devuelve el archivo por defecto siempre minificado por jsDelivr, con otro hash [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- En la landing de produccion, si un archivo falta en la version pedida jsDelivr sirve el de una version anterior; con SRI falla cerrado, sin SRI corre codigo viejo sin aviso [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- En la landing de produccion, si el widget inyecta otro recurso (CSS aparte, chunk), ese recurso no queda cubierto por el `integrity` del snippet; el bundle debe ser un unico archivo o fijar `integrity` en lo que inyecta [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- En la landing de produccion, sin `data-cfasync="false"` antes de `src` Rocket Loader reescribe el tag; el atributo no sirve si se pone desde JS [doc:https://developers.cloudflare.com/speed/optimization/content/rocket-loader/ignore-javascripts/@2026-10-01]
- En la landing de produccion, un script de otro origen con `integrity` necesita que el host responda CORS; sin eso no carga [doc:https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity@2026-10-01]
- En la landing de produccion, un snippet global por sitio mas un snippet propio en la landing cargan dos copias; el bundle necesita una guarda de arranque unico [doc:https://elementor.com/blog/introducing-pro-3-1/@3.1]
- En el editor de Elementor, solo Administrator o Editor con `unfiltered_html` pueden pegar el `script`; en Multisite solo Super Admin [doc:https://wordpress.org/documentation/article/roles-and-capabilities/@2026-09-02]
- En el editor de Elementor con sesion de admin, un envio de prueba responde 200 sin crear lead; el E2E manual va en incognito [repo:CLAUDE.md:128]
- En Webflow u otro host, el submit a `admin-ajax` falla: CORS solo admite www.atfxlatam.com [repo:CLAUDE.md:122]
- En Webflow u otro host, la cabecera `X-Requested-With` convierte el POST en una peticion con preflight, asi que ni un form multipart evita CORS [doc:https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS@2026-10-01]
- En Webflow, la data debe ir a un endpoint propio desacoplado, que es otra decision (brief de submit), no de distribucion [KAREN:memoria feedback_webflow_front_only.md]
- En un iframe, el `location.href` del documento es el del iframe y la atribucion por `referrer` deja de identificar la landing [repo:CLAUDE.md:110]
- En el runner de CI, trusted publishing exige Node 22.14 o superior y npm 11.5.1 o superior; el workflow viejo corre Node 20 [repo:.github/workflows/release.yml:30]
- En el runner de CI, el nombre del archivo de workflow debe coincidir exacto, con `.yml`, con lo configurado en npmjs.com [doc:https://docs.npmjs.com/trusted-publishers@2026-10-01]
- En el runner de CI, un repo privado no genera provenance aunque el paquete sea publico [doc:https://docs.npmjs.com/trusted-publishers@2026-10-01]
- En el registro npm, una version publicada con un error no se puede reemplazar: hay que publicar otra [doc:https://docs.npmjs.com/policies/unpublish@2026-10-01]
- En jsDelivr, todo archivo pedido una vez queda en S3 para siempre aunque se despublique de npm; un secreto publicado no se puede retirar [doc:https://github.com/jsdelivr/jsdelivr/blob/4fe4dfc6221a39782e7c1feb85a601676e8355de/README.md@4fe4dfc]
- En las landings viejas, "deprecado" no es "congelado": cualquier push a `main` del repo viejo sigue publicando a `@latest` [repo:.github/workflows/release.yml:6]
- En las landings viejas, archivar el repo viejo deja tags y ramas en solo lectura, asi que `@latest` deja de moverse; jsDelivr sigue sirviendo lo ya publicado [doc:https://docs.github.com/en/repositories/archiving-a-github-repository/archiving-repositories@fpt]
- En el host propio (B o C) en Vercel, la cuenta Hobby no admite uso comercial, y un sitio de broker por el que se cobra lo es [doc:https://vercel.com/docs/limits/fair-use-guidelines@2026-09-14]
- En el host propio en Vercel desde la laptop, el deploy por CLI es un build de estacion de trabajo y pierde SLSA Build L2 [KAREN:~/.claude/CLAUDE.md bloque vercel]
- En la fase 2 en Cloudflare, la ruta del Worker y un dominio de R2 exigen que la zona atfxlatam.com este en la cuenta donde vive el Worker o el bucket [doc:https://developers.cloudflare.com/r2/buckets/public-buckets/@2026-10-01]
- En la migracion, la deteccion de version por `at_forms@` en la URL no existe en el v2; la version debe entrar como constante de build [repo:src/index.ts:8]

## 9. Incertidumbre

- ASSUMPTION: www.atfxlatam.com no envia hoy CSP ni `Integrity-Policy` (no verificado aqui ni en el audit). prueba: `curl -sI https://www.atfxlatam.com/` y leer `content-security-policy`, `content-security-policy-report-only` e `integrity-policy`.
- ASSUMPTION: jsDelivr `/npm/` responde `Access-Control-Allow-Origin: *`; lo sugieren los snippets oficiales de Bootstrap y htmx con `crossorigin`, pero no se leyo la cabecera. prueba: `curl -sI https://cdn.jsdelivr.net/npm/htmx.org@2.0.11/dist/htmx.min.js` y buscar `access-control-allow-origin`.
- ASSUMPTION: Rocket Loader y demas optimizaciones de la zona de ATFX no alteran los bytes de un JS servido por jsDelivr (solo reescriben el HTML). prueba: E2E en una landing de staging con el snippet pinneado y comprobar en la consola que no hay error de integridad.
- ASSUMPTION: Elementor Pro Custom Code conserva `integrity`, `crossorigin` y `data-cfasync` sin sanearlos. prueba: crear un Custom Code en borrador con el snippet de htmx y comparar el HTML servido.
- ASSUMPTION: la latencia extra de un origen tercero frente a primera parte es relevante para la conversion; no hay medicion. prueba: WebPageTest en movil 4G de una landing con el snippet de jsDelivr contra la misma con el archivo servido desde la zona, comparando LCP e INP.
- ASSUMPTION: el bundle v2 cabe en un unico archivo razonable con el CSS dentro (el viejo pesa 167 KB minificado sin comprimir segun el brief previo). prueba: `brotli -c` sobre el build del v2 y fijar presupuesto en CI.
- ASSUMPTION: Cloudflare (Auto Minify u otra transformacion) no modifica un JS servido desde la propia zona en la fase 2. prueba: comparar el sha384 del archivo servido por el Worker con el del tarball de npm.
- No se investigo unpkg en esta corrida; no se usa como evidencia ni como respaldo de jsDelivr.
- No se leyo la documentacion actual del embed de HubSpot ni de Plausible (su pagina de script no muestra el snippet); no se usan como evidencia.
- [NEEDS CLARIFICATION: el pin vive en un slot unico por sitio (una edicion por release, todas las landings a la misma version) o cada campana congela su version? La decision vieja era no fijar versiones (CLAUDE.md linea 120).]
- [NEEDS CLARIFICATION: tienes rol Administrator en el WordPress de ATFX, con acceso a Elementor Pro Custom Code y permiso para instalar plugins en WP Engine?]
- [NEEDS CLARIFICATION: el paquete npm y el repo v2 van en una organizacion (de ATFX o tuya) o en tu cuenta personal? Quien mas, ademas de ti, debe poder publicar o aprobar?]
- [NEEDS CLARIFICATION: el repo v2 puede ser publico? Es requisito para provenance de npm y para attestations en plan Pro.]
- [NEEDS CLARIFICATION: puede ATFX dar una ruta de Workers o un bucket R2 en su zona de Cloudflare para la fase 2 de primera parte?]
- [NEEDS CLARIFICATION: cuantas landings con form estaran vivas a la vez y quien las edita (tu o marketing)? Define cuanto cuesta el pin por landing.]
- [NEEDS CLARIFICATION: el uso en Webflow es real a corto plazo? Si lo es, el submit necesita un endpoint propio y eso abre otra spec.]
- [NEEDS CLARIFICATION: cuando el v2 este vivo, se archiva el repo `karenrebecag/at_forms` para congelar `@latest` en las landings viejas?]
- [NEEDS CLARIFICATION: si se elige la opcion B en Vercel, el team `karenrebecags-projects` esta en plan Pro? Hobby no admite uso comercial.]
- Sospecha de inyeccion: ninguna detectada en las fuentes leidas.

## 10. Checklist de estandar

- [ ] El paquete v2 se publica en npm solo desde un workflow de GitHub Actions con trusted publishing (OIDC), `id-token: write` solo en ese job, y la opcion "Require two-factor authentication and disallow tokens" activa en el paquete.
- [ ] El workflow de publicacion usa Node 22.14 o superior y npm 11.5.1 o superior, y `npm view` muestra provenance para cada version publicada.
- [ ] Cada version publica un unico archivo autocontenido (JS con CSS dentro) que no inyecta otros scripts ni hojas de estilo.
- [ ] El release calcula sha384 sobre el archivo exacto del tarball y emite el snippet completo (URL `/npm/` con version exacta y ruta real del archivo, `integrity`, `crossorigin="anonymous"`, `data-cfasync="false"` antes de `src`).
- [ ] Tras publicar, un paso de CI descarga el archivo desde jsDelivr y falla si su sha384 no coincide con el del snippet.
- [ ] Ningun snippet ni documentacion usa `@latest`, rangos, tags de npm, `.min` generado por jsDelivr ni URLs sin ruta de archivo.
- [ ] El bundle trae su version como constante de build y no la lee de la URL.
- [ ] El bundle arranca una sola vez aunque el snippet aparezca dos veces en la pagina, y un E2E lo comprueba.
- [ ] El mount reserva altura en el snippet o en el CSS del sitio y el CLS de la landing con el form es 0.1 o menos.
- [ ] Un E2E de Playwright carga el snippet pinneado con `integrity` en una pagina host que imita el widget HTML de Elementor y falla si el script no ejecuta o si la consola reporta error de integridad.
- [ ] La spec documenta donde vive el pin (slot de sitio o landing) y el procedimiento de actualizacion en una sola pagina, con el comando que genera el snippet.
- [ ] Existe un inventario de landings con form y la version que cargan, actualizado en cada release.
- [ ] El repo v2 es publico, con ruleset en `main` y tags `v*` (PR obligatorio, checks requeridos, sin force-push ni borrado).
- [ ] Al quedar vivo el v2, el repo viejo deja de publicar (workflow desactivado o repo archivado) y la decision queda registrada.
- [ ] El paquete no contiene secretos ni source maps con `sourcesContent`, porque jsDelivr conserva para siempre todo archivo servido.
- [ ] La publicacion y el cambio de pin en produccion los ejecuta Karen; ningun agente despliega.

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | jsDelivr README (npm, caching, fallback, minify) | jsDelivr | 4fe4dfc | 2026-10-01 | high |
| 2 | Unpublish policy | npm | 2026-10-01 | 2026-10-01 | high |
| 3 | Trusted publishing for npm packages | npm | 2026-10-01 | 2026-10-01 | high |
| 4 | Requiring 2FA for package publishing | npm | 2026-10-01 | 2026-10-01 | high |
| 5 | Generating provenance statements | npm | 2026-10-01 | 2026-10-01 | high |
| 6 | Creating an organization | npm | 2026-10-01 | 2026-10-01 | high |
| 7 | SLSA Build levels | OpenSSF SLSA | 1.0 | 2026-10-01 | high |
| 8 | Artifact attestations | GitHub | fpt | 2026-10-01 | high |
| 9 | Gated features: attestations, repo-rules, environments | GitHub docs source | 56fcfa8 | 2026-10-01 | high |
| 10 | Archiving repositories | GitHub | fpt | 2026-10-01 | high |
| 11 | Subresource Integrity | MDN | 2026-10-01 | 2026-10-01 | high |
| 12 | The script element | MDN | 2026-10-01 | 2026-10-01 | high |
| 13 | CORS guide | MDN | 2026-10-01 | 2026-10-01 | high |
| 14 | HTTP cache | web.dev | 2026-10-01 | 2026-10-01 | high |
| 15 | Preconnect and dns-prefetch | web.dev | 2026-10-01 | 2026-10-01 | high |
| 16 | Optimize CLS | web.dev | 2026-10-01 | 2026-10-01 | high |
| 17 | Rocket Loader, ignore scripts | Cloudflare | 2026-10-01 | 2026-10-01 | high |
| 18 | Workers routes | Cloudflare | 2026-10-01 | 2026-10-01 | high |
| 19 | Workers pricing | Cloudflare | 2026-10-01 | 2026-10-01 | high |
| 20 | R2 public buckets | Cloudflare | 2026-10-01 | 2026-10-01 | high |
| 21 | Fair use guidelines | Vercel | 2026-09-14 | 2026-10-01 | high |
| 22 | wp_enqueue_script | WordPress | 6.3 | 2026-10-01 | high |
| 23 | Detailed plugin guidelines | WordPress.org | 2026-10-01 | 2026-10-01 | high |
| 24 | Roles and capabilities | WordPress.org | 2026-09-02 | 2026-10-01 | high |
| 25 | Introducing Elementor Pro 3.1 (Custom Code) | Elementor | 3.1 | 2026-10-01 | medium |
| 26 | Including Stripe.js | Stripe | 2026-10-01 | 2026-10-01 | high |
| 27 | Stripe.js versioning and support policy | Stripe | 2026-10-01 | 2026-10-01 | high |
| 28 | Fathom embed code | Fathom | 2026-10-01 | 2026-10-01 | high |
| 29 | Segment Analytics.js quickstart | Twilio Segment | 2026-10-01 | 2026-10-01 | medium |
| 30 | Bootstrap introduction (CDN) | Bootstrap | 5.3.8 | 2026-10-01 | high |
| 31 | htmx docs (installation) | htmx | 2.0.11 | 2026-10-01 | high |
| 32 | CSP Evaluator allowlist bypasses | Google | ad530f3 | 2026-10-01 | high |
| 33 | Bootstrap config.yml y generate-sri.mjs | twbs | c1f9b9d | 2026-10-01 | high |
| 34 | htmx www/content/docs.md | bigskysoftware | fa978b2 | 2026-10-01 | high |
| 35 | Plausible WordPress plugin (Assets.php, Helpers.php) | Plausible | 6df5f4e | 2026-10-01 | high |
| 36 | Cal.com embed snippet | Cal.com | 54343aa | 2026-10-01 | high |
| 37 | Typeform embed (README, release workflow) | Typeform | ffcede3 | 2026-10-01 | high |
