# Reference Brief: cliente de envio s06 (POST unico, timeout, respuesta validada, resultado desconocido)

Slug: s06-envio-cliente | Nivel: quick | Fecha: 2026-10-01 | Estado: APROBADO
Versiones: zod=3.25.76, typescript=5.9.3, vitest=5.0.3, jsdom=30.1.1
Verificador: research-verifier 2026-10-01 ESCALATE

## 1. Pregunta y decisiones abiertas

Sesion s06 de atfx-leadkit: `submitLead` hace un solo POST de `FormData` a `/wp-admin/admin-ajax.php`
con `X-Requested-With: XMLHttpRequest`, corta a los 15 s con `AbortController`, no reintenta nunca
(D-07, aprobada por Karen) y valida con zod la respuesta de Elementor; timeout, red caida o respuesta
invalida dan `unknown` para no duplicar leads.

Reuso: `embed-form-submit-privacy` (bloque D2) ya fijo el "por que" (RFC 9110 9.2.2, ky, Stripe,
fetch no rechaza ante 5xx) y esas fuentes no dependen de versiones; se citan aqui sin reinvestigar.
Ese brief se escribio contra zod 3.23.8 / typescript 5.5.4 y otro repo (sus citas `[repo:]` apuntan
al paquete viejo), asi que todo lo que depende de las versiones instaladas (zod 3.25.76, typescript
5.9.3, vitest 5.0.3, jsdom 30.1.1) y del codigo actual de `src/core/` se reinvestigo en esta corrida.

Decisiones que quedan abiertas para la spec y la revision:
1. Mecanismo de timeout: `setTimeout` + `AbortController.abort()` (codigo actual) o `AbortSignal.timeout()`.
2. Alcance del timeout: solo hasta los headers (codigo actual) o hasta terminar de leer el cuerpo.
3. Forma del schema de respuesta: el codigo exige objetos en `data.errors` y `data.data`, pero
   Elementor Pro serializa arrays PHP vacios como `[]`.
4. Tipado de los mocks de `fetch` en vitest 5 (el typecheck de la rama falla hoy).
5. Como distinguir "timeout propio" de otros abortos sin depender de `instanceof DOMException`.

## 2. Estado actual

- El timeout se arma con `setTimeout` que llama `controller.abort()` sin razon [repo:src/core/submit.ts:39]
- El catch del fetch clasifica como timeout si `controller.signal.aborted` o el error se llama AbortError [repo:src/core/submit.ts:53]
- El timer se limpia en cuanto `fetch` resuelve, antes de leer el cuerpo [repo:src/core/submit.ts:59]
- El cuerpo se lee con `response.json()` sin ningun limite de tiempo propio [repo:src/core/submit.ts:63]
- El header enviado es exactamente `X-Requested-With: XMLHttpRequest` [repo:src/core/submit.ts:48]
- `fetchImpl` se guarda en una constante y se invoca sin receptor, no como metodo de `options` [repo:src/core/submit.ts:37]
- El tipo `ok` declara `aanumber: string | undefined` [repo:src/core/submit.ts:10]
- La arquitectura declara `ok` con `aanumber?: string` y `fieldErrors` como `Readonly<Record>` [repo:docs/specs/04-arquitectura.md:109]
- `tsconfig` tiene `exactOptionalPropertyTypes`, asi que `aanumber?: string` y `string | undefined` no son intercambiables [repo:tsconfig.json:5]
- El schema exige que `data.errors` sea un `z.record` (objeto) [repo:src/core/response.ts:3]
- El schema exige que `data.data` sea `z.object` cuando existe [repo:src/core/response.ts:10]
- El contrato del repo describe `errors` y `data` como objetos opcionales, sin el caso array vacio [repo:docs/specs/03-contrato-salesforce.md:81]
- El contrato dice que lo que no cumpla el schema es "resultado desconocido" [repo:docs/specs/03-contrato-salesforce.md:86]
- La spec s06 dice que el cliente nunca reintenta [repo:docs/specs/sessions/s06-envio.md:31]
- Los casos de respuesta invalida pedidos son 502 HTML, `0`, `-1` y JSON sin `success`; no incluye `errors: []` ni `data: []` [repo:docs/specs/sessions/s06-envio.md:43]
- Los tests tipan el mock con `vi.fn` y dos argumentos de tipo (tupla de parametros y retorno) [repo:src/core/submit.test.ts:25]
- El handoff de s06 registra que `npm run typecheck` falla con TS2558 en esos mocks [repo:docs/review/s06-handoff.md:39]
- El test de timeout avanza el reloj falso con `vi.advanceTimersByTimeAsync` [repo:src/core/submit.test.ts:64]
- Los tests corren en el entorno jsdom de vitest [repo:vitest.config.ts:5]
- RNF-02 exige Safari iOS 15+ y target `es2019` [repo:docs/specs/01-requisitos.md:107]
- D-07 (cero reintentos automaticos, desconocido con reintento manual) esta aprobada [KAREN:docs/specs/02-decisiones.md D-07 2026-10-01]
- D-19 (presupuesto 20 KB brotli por bundle) sigue PENDIENTE [repo:docs/specs/02-decisiones.md:27]
- El CLAUDE.md del repo prohibe llamar a www.atfxlatam.com o al admin-ajax real desde un agente [repo:CLAUDE.md:10]
Contextos: navegador en landings WordPress/Elementor de www.atfxlatam.com (mismo origen que admin-ajax), bundle esbuild target es2019, vitest 5 con entorno jsdom en pool forks (Node local v22.23.2), `tsc --noEmit` (typecheck), Playwright E2E de s13 (futuro), CI (no existe aun en el repo)

## 3. Fuentes primarias

- Reusado de embed-form-submit-privacy: RFC 9110 9.2.2 dice que un cliente SHOULD NOT reintentar automaticamente un metodo no idempotente salvo que sepa que el original no se aplico [doc:https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2@RFC9110]
- Reusado: fetch rechaza con TypeError ante error de red y con AbortError al abortar, y no rechaza ante 404 o 504 [doc:https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch@2026-10-01]
- Fetch Standard: abortar una llamada rechaza la promesa y, si ya hay respuesta, pone en error el stream del cuerpo con la razon del abort [doc:https://fetch.spec.whatwg.org/#abort-fetch@2026-09-21]
- Fetch Standard (nota ABORT-DUPLICATION del fuente): la operacion de red subyacente puede no haberse abortado cuando JavaScript recibe la senal, asi que un abort no prueba que el servidor no proceso el POST [ref:https://github.com/whatwg/fetch/blob/357bd98924d94b81fbe8608192a2ee1f123b82f4/fetch.bs#L9672-L9681@357bd98]
- Fetch Standard: una respuesta que es network error rechaza la promesa con TypeError [ref:https://github.com/whatwg/fetch/blob/357bd98924d94b81fbe8608192a2ee1f123b82f4/fetch.bs#L9707@357bd98]
- MDN `AbortController.abort()`: aborta el fetch y tambien el consumo del cuerpo de la respuesta; sin razon, la razon es un DOMException AbortError [doc:https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort@2026-10-01]
- MDN `Response.json()`: rechaza con AbortError si se aborto, TypeError si el cuerpo esta bloqueado o mal codificado, y SyntaxError si no es JSON [doc:https://developer.mozilla.org/en-US/docs/Web/API/Response/json@2026-10-01]
- MDN `AbortSignal.timeout()`: aborta con TimeoutError (no AbortError) y el reloj cuenta tiempo activo, pausado en bfcache [doc:https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static@2026-10-01]
- browser-compat-data: `AbortSignal.timeout` llega en Safari 16 (iOS espejo), y Chrome 103-123 abortaba con AbortError en vez de TimeoutError [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/api/AbortSignal.json@852a2f6]
- browser-compat-data: `AbortController` que si aborta fetch existe desde Safari 12.1 (11.1 lo definia sin abortar) [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/api/AbortController.json@852a2f6]
- WordPress 7.1.2 admin-ajax responde `0` con status 400 si no hay handler para la accion, y `0` con 200 por defecto al final [ref:https://github.com/WordPress/wordpress-develop/blob/0a106cde38df869e196a83eb4975ba38a4e5837b/src/wp-admin/admin-ajax.php#L177-L211@0a106cd]
- WordPress 7.1.2 admin-ajax fija `Content-Type: text/html` antes de despachar la accion [ref:https://github.com/WordPress/wordpress-develop/blob/0a106cde38df869e196a83eb4975ba38a4e5837b/src/wp-admin/admin-ajax.php#L27@0a106cd]
- WordPress 7.1.2 `check_ajax_referer` fallido termina con `-1` y 403 [ref:https://github.com/WordPress/wordpress-develop/blob/0a106cde38df869e196a83eb4975ba38a4e5837b/src/wp-includes/pluggable.php#L1451-L1453@0a106cd]
- WordPress 7.1.2 `wp_send_json` cambia a `application/json` y solo fija status si se pasa uno; `wp_send_json_error` no lo pasa por defecto, asi que el rechazo sale con 200 [ref:https://github.com/WordPress/wordpress-develop/blob/0a106cde38df869e196a83eb4975ba38a4e5837b/src/wp-includes/functions.php#L4601-L4609@0a106cd]
- WordPress 7.1.2 `wp_send_json` serializa con `$flags = 0` por defecto, sin `JSON_FORCE_OBJECT` [ref:https://github.com/WordPress/wordpress-develop/blob/0a106cde38df869e196a83eb4975ba38a4e5837b/src/wp-includes/functions.php#L4587@0a106cd]
- PHP manual: `json_encode(array())` produce `[]`, y solo `JSON_FORCE_OBJECT` lo convierte en `{}` [doc:https://www.php.net/manual/en/function.json-encode.php@php8]
- Zod v3 (docs del paquete en el tag 3.25.76): los schemas de objeto eliminan claves desconocidas por defecto [doc:https://github.com/colinhacks/zod/blob/7baee4e17f86f4017e09e12b0acdee36a5b1c087/packages/docs/content/packages/v3.mdx#L1050@3.25.76]
- Zod v3 (docs del tag 3.25.76): `safeParse` devuelve `{ success: true, data }` o `{ success: false, error }` sin lanzar [doc:https://github.com/colinhacks/zod/blob/7baee4e17f86f4017e09e12b0acdee36a5b1c087/packages/docs/content/packages/v3.mdx#L198-L199@3.25.76]
- Zod 3.25.76 fuente: `getParsedType` clasifica un array como `array`, no como `object` [ref:https://github.com/colinhacks/zod/blob/7baee4e17f86f4017e09e12b0acdee36a5b1c087/packages/zod/src/v3/helpers/util.ts#L201-L203@7baee4e]
- Zod 3.25.76 fuente: `ZodObject` rechaza todo input cuyo tipo parseado no sea `object` [ref:https://github.com/colinhacks/zod/blob/7baee4e17f86f4017e09e12b0acdee36a5b1c087/packages/zod/src/v3/types.ts#L2469@7baee4e]
- Zod 3.25.76 fuente: `ZodRecord` rechaza todo input cuyo tipo parseado no sea `object` [ref:https://github.com/colinhacks/zod/blob/7baee4e17f86f4017e09e12b0acdee36a5b1c087/packages/zod/src/v3/types.ts#L3514@7baee4e]
- Vitest 5.0.3 fuente: `vi.fn` acepta un solo argumento de tipo, el tipo de la funcion (`fn<T extends Procedure | Constructable>`) [ref:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/packages/spy/src/index.ts#L275@33cadea]
- Vitest 5.0.3 docs: `fakeTimers.toFake` cubre setTimeout, Date, performance, rAF y similares; `AbortSignal` no esta en la lista [doc:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/docs/config/faketimers.md#L19-L22@5.0.3]
- Vitest 5.0.3 docs: `vi.advanceTimersByTimeAsync` ejecuta tambien los timers creados de forma asincrona [doc:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/docs/api/vi.md#L967-L973@5.0.3]
- Vitest 5.0.3 docs: el pool por defecto es `forks` [doc:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/docs/config/pool.md#L8-L9@5.0.3]
- Vitest 5.0.3 fuente: en pool no-VM el entorno jsdom copia al global las claves de jsdom con `populateGlobal` [ref:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/packages/vitest/src/integrations/env/jsdom.ts#L224-L226@33cadea]
- Vitest 5.0.3 fuente: `Headers`, `AbortController` y `AbortSignal` estan comentados en esa lista por conflicto con Node, asi que quedan los de Node [ref:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/packages/vitest/src/integrations/env/jsdom-keys.ts#L182-L187@33cadea]
- Vitest 5.0.3 fuente: `DOMException` si se copia desde jsdom al global [ref:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/packages/vitest/src/integrations/env/jsdom-keys.ts#L4@33cadea]
- Vitest 5.0.3 fuente: `FormData` y `Blob` tambien se copian desde jsdom al global [ref:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/packages/vitest/src/integrations/env/jsdom-keys.ts#L138-L139@33cadea]
- Vitest 5.0.3 fuente: el entorno jsdom provee la Fetch API de Node (`fetch`, `Response`), no una de jsdom [ref:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/packages/vitest/src/integrations/env/jsdom.ts#L145-L152@33cadea]
- jsdom 30.1.1 implementa AbortSignal con `timeout`, `abort` y `any` estaticos [ref:https://github.com/jsdom/jsdom/blob/0a117f4581b067800fdb3287e22e7cec82221a3c/lib/jsdom/living/aborting/AbortSignal.webidl#L4@0a117f4]
- Node 22.23.2 `AbortSignal.timeout` usa el `setTimeout` del modulo interno `timers`, capturado al cargar, no el `globalThis.setTimeout` [ref:https://github.com/nodejs/node/blob/aa4c77582be995286fc6e00aaf530dc7ade102a9/lib/internal/abort_controller.js#L62-L65@aa4c775]

## 4. Implementaciones de referencia

- Elementor Pro (redistribucion GPL `proelements/proelements`, 1.7k estrellas, push 2026-09-28; Elementor Pro no publica repo propio): el handler inicializa `$data = []` y `$errors = []` [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/ajax-handler.php#L20-L21@84c616b]
- Elementor Pro: el exito envia `wp_send_json_success` con `message` y `data => $this->data` [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/ajax-handler.php#L273-L278@84c616b]
- Elementor Pro: el rechazo envia `message`, `errors` y `data`, y el mensaje une errores con `<br>` y puede incluir un `div` de errores de admin [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/ajax-handler.php#L287-L297@84c616b]
- ky (sindresorhus; reusado y releido en el mismo sha): el timeout es `setTimeout` propio que llama `abortController.abort()` y se limpia en `finally` [ref:https://github.com/sindresorhus/ky/blob/0d59458a0a58e1c3d7c6db0ab17ed5c7cd671e47/source/utils/timeout.ts#L16-L35@0d59458]
- ky: invoca `fetch` sin receptor porque un `window.fetch` nativo llamado como metodo lanza "Illegal invocation" [ref:https://github.com/sindresorhus/ky/blob/0d59458a0a58e1c3d7c6db0ab17ed5c7cd671e47/source/utils/timeout.ts#L28-L31@0d59458]
- ky: el readme dice que los metodos atajo usan el mismo `timeout` como limite separado para leer el cuerpo [ref:https://github.com/sindresorhus/ky/blob/0d59458a0a58e1c3d7c6db0ab17ed5c7cd671e47/readme.md#L402@0d59458]
- ky (reusado): POST no esta en los metodos que reintenta por defecto [ref:https://github.com/sindresorhus/ky/blob/0d59458a0a58e1c3d7c6db0ab17ed5c7cd671e47/source/utils/normalize.ts#L16@0d59458]
- ofetch (unjs, 5.3k estrellas, push 2026-10-01): los metodos con payload (POST, PUT, PATCH, DELETE) tienen 0 reintentos por defecto [ref:https://github.com/unjs/ofetch/blob/1dbc37fd1ceab832fc7c90cad81b1091c95ba563/src/fetch.ts#L49-L55@1dbc37f]
- ofetch: usa `AbortSignal.timeout` combinado con `AbortSignal.any`, la alternativa que aqui no aplica por iOS 15 [ref:https://github.com/unjs/ofetch/blob/1dbc37fd1ceab832fc7c90cad81b1091c95ba563/src/fetch.ts#L171-L178@1dbc37f]

## 5. Opciones

Decision 1 y 2 (timeout):

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. `setTimeout` + `abort()`, limpiado tras headers (actual) | Funciona en iOS 15 y con fake timers [repo:src/core/submit.ts:39] | Lectura del cuerpo sin limite: un cuerpo colgado deja el form en "enviando" [repo:src/core/submit.ts:59] | baja | No tal cual |
| B. `setTimeout` + `abort()`, limpiado en `finally` despues de `json()` | Acota todo el envio a 15 s; el abort pone en error el cuerpo [doc:https://fetch.spec.whatwg.org/#abort-fetch@2026-09-21] | Un abort en `json()` debe mapearse a timeout, no a invalid-response [doc:https://developer.mozilla.org/en-US/docs/Web/API/Response/json@2026-10-01] | baja | Si |
| C. `AbortSignal.timeout(15000)` | Una linea, TimeoutError distinguible [doc:https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static@2026-10-01] | No existe en Safari/iOS 15 (llega en 16) y viola RNF-02 [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/api/AbortSignal.json@852a2f6] | baja | No |

Decision 3 (schema de respuesta):

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Objetos estrictos (actual) | Simple [repo:src/core/response.ts:3] | Si Elementor manda `errors: []` o `data: []`, un exito real cae en `unknown` [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/ajax-handler.php#L20-L21@84c616b] | baja | No |
| B. Aceptar array vacio como objeto vacio en `errors` y `data.data` (preprocess o union con array de longitud 0) | Tolera la serializacion PHP de arrays vacios [doc:https://www.php.net/manual/en/function.json-encode.php@php8] | Cambia el contrato escrito en 03; requiere test por cada forma [repo:docs/specs/03-contrato-salesforce.md:81] | baja | Si, sujeto a la captura real y a Karen |
| C. Validar solo `success` y leer lo demas de forma laxa | Nunca falla por forma | Pierde la garantia "lo que no cumple el schema es desconocido" [repo:docs/specs/03-contrato-salesforce.md:86] | baja | No |

Decision 4 (mock tipado): `vi.fn<typeof fetch>(impl)` es la forma que acepta la firma de vitest 5 [ref:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/packages/spy/src/index.ts#L275@33cadea]

Decision 5 (clasificar timeout): una bandera propia `timedOut` puesta en el callback del timer, en vez de `instanceof DOMException`, porque en tests el DOMException global es el de jsdom y el abort lo produce el AbortController de Node [ref:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/packages/vitest/src/integrations/env/jsdom-keys.ts#L182-L187@33cadea]

## 6. Evidencia en contra

- Contra cero reintentos (reusado y ya decidido): en movil un POST sin reintento puede perder leads; se acepta porque RFC 9110 lo desaconseja sin saber si el original se aplico, y D-07 deja reintento manual [doc:https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2@RFC9110]
- Contra extender el timeout al cuerpo: un cuerpo lento pero valido despues de 15 s se reporta como desconocido aunque el lead entro; se acepta porque desconocido ya promete "puede haberse registrado" y no dispara reenvio [repo:docs/specs/01-requisitos.md:137]
- Contra el schema tolerante a `[]`: aceptar formas no escritas en el contrato podria ocultar un cambio real de Elementor; se resuelve aceptando solo array de longitud 0 (no cualquier array) y con test por forma [ref:https://github.com/colinhacks/zod/blob/7baee4e17f86f4017e09e12b0acdee36a5b1c087/packages/zod/src/v3/types.ts#L3514@7baee4e]
- Contra el schema tolerante a `[]`: la redistribucion GPL puede no ser identica a la version de Elementor Pro instalada en atfxlatam.com; no resuelto, la seccion 9 lo deja como supuesto con su prueba [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/ajax-handler.php#L273-L278@84c616b]
- Contra `setTimeout` frente a `AbortSignal.timeout`: el timer manual sigue corriendo con la pestana en bfcache, mientras que `AbortSignal.timeout` se pausa; se acepta porque iOS 15 no tiene la alternativa [doc:https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static@2026-10-01]

## 7. Ejemplares y anti-ejemplos

- Bien: timer propio que aborta y se limpia en `finally`, como ky, envolviendo tambien la lectura del cuerpo [ref:https://github.com/sindresorhus/ky/blob/0d59458a0a58e1c3d7c6db0ab17ed5c7cd671e47/source/utils/timeout.ts#L16-L35@0d59458]

```ts
let timedOut = false;
const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
try {
  const response = await fetchImpl(ENDPOINT, init);
  const body: unknown = await response.json();
  // parse...
} catch {
  return { kind: "unknown", reason: timedOut ? "timeout" : /* network o invalid-response segun la fase */ "network" };
} finally {
  clearTimeout(timer);
}
```

- Bien: mock tipado con la firma de vitest 5, que deja `mock.calls[0]` como los parametros de `fetch` [ref:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/packages/spy/src/index.ts#L275@33cadea]

```ts
const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ success: true, data: { message: "ok", data: [] } }));
```

- Anti-ejemplo: limpiar el timer antes de `response.json()` deja la lectura del cuerpo sin limite [repo:src/core/submit.ts:59]
- Anti-ejemplo: `vi.fn` con tupla de parametros y retorno, firma de versiones viejas de vitest, rompe `tsc` en vitest 5 [repo:src/core/submit.test.ts:25]
- Anti-ejemplo: `options.fetchImpl(...)` como metodo llamaria al fetch nativo con `this = options` (Illegal invocation); el codigo actual lo evita al copiarlo a una constante [ref:https://github.com/sindresorhus/ky/blob/0d59458a0a58e1c3d7c6db0ab17ed5c7cd671e47/source/utils/timeout.ts#L28-L31@0d59458]

## 8. Trampas

- Elementor serializa `$data = []` y `$errors = []` con `wp_json_encode` sin `JSON_FORCE_OBJECT`, asi que el JSON trae `[]`; con el schema actual un exito sin datos extra seria `unknown` [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/ajax-handler.php#L20-L21@84c616b]
- Los cuerpos `0` y `-1` de admin-ajax son JSON valido (numeros): `json()` no falla y es el schema el que debe rechazarlos [ref:https://github.com/WordPress/wordpress-develop/blob/0a106cde38df869e196a83eb4975ba38a4e5837b/src/wp-admin/admin-ajax.php#L177-L211@0a106cd]
- El rechazo de Elementor sale con status 200, asi que no se puede usar `response.ok` para separar exito de rechazo; manda `success` [ref:https://github.com/WordPress/wordpress-develop/blob/0a106cde38df869e196a83eb4975ba38a4e5837b/src/wp-includes/functions.php#L4601-L4609@0a106cd]
- `admin-ajax` responde `0` con 400 cuando no hay handler: un 4xx tampoco debe leerse como rechazo de negocio sin pasar por el schema [ref:https://github.com/WordPress/wordpress-develop/blob/0a106cde38df869e196a83eb4975ba38a4e5837b/src/wp-admin/admin-ajax.php#L177-L181@0a106cd]
- El `message` de rechazo trae HTML (`<br>`, `div` de admin): s08 debe pintarlo como texto (CA-14), y vera las etiquetas literales [ref:https://github.com/proelements/proelements/blob/84c616b5a7599398af32ad9655739c0a3c0d27d0/modules/forms/classes/ajax-handler.php#L287-L290@84c616b]
- `AbortSignal.timeout` no existe en Safari/iOS 15, que RNF-02 exige soportar; la llamada lanzaria TypeError ahi [ref:https://github.com/mdn/browser-compat-data/blob/852a2f6fa49037e644a4554c38fc720d5b1bd24d/api/AbortSignal.json@852a2f6]
- Contexto tests: con fake timers, `AbortSignal.timeout` de Node probablemente no avanza con `advanceTimersByTimeAsync` porque usa el `setTimeout` interno capturado al cargar (ver supuesto en la seccion 9) [ref:https://github.com/nodejs/node/blob/aa4c77582be995286fc6e00aaf530dc7ade102a9/lib/internal/abort_controller.js#L62-L65@aa4c775]
- Contexto tests: el abort del AbortController de Node produce un DOMException de Node, y el `DOMException` global en jsdom es otro, asi que `instanceof DOMException` no es fiable [ref:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/packages/vitest/src/integrations/env/jsdom-keys.ts#L4@33cadea]
- Contexto tests: `Response` en vitest+jsdom es el de Node, y un `fetchImpl` mockeado no conecta la senal al cuerpo; para probar el timeout del cuerpo hay que construir un `ReadableStream` que falle al recibir el abort [ref:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/packages/vitest/src/integrations/env/jsdom.ts#L145-L152@33cadea]
- Contexto tests: `FormData` del test es el de jsdom; el mock lo recibe sin pasar por undici, asi que la inspeccion de `entries()` es valida pero no prueba el multipart real [ref:https://github.com/vitest-dev/vitest/blob/33cadea62e8763c455c7fca38d9ab1dda87c5f75/packages/vitest/src/integrations/env/jsdom-keys.ts#L138-L139@33cadea]
- Contexto typecheck: `aanumber: string | undefined` (codigo) y `aanumber?: string` (arquitectura) no son el mismo tipo con `exactOptionalPropertyTypes`; s08 y s11 consumen el de la arquitectura [repo:tsconfig.json:5]
- Contexto navegador: un abort no garantiza que el servidor no proceso el POST, por eso el timeout es `unknown` y nunca `rejected` [ref:https://github.com/whatwg/fetch/blob/357bd98924d94b81fbe8608192a2ee1f123b82f4/fetch.bs#L9672-L9681@357bd98]
- Contexto navegador: `success:true` es "encolado", no lead creado en Salesforce; el resultado `ok` no debe prometer mas [repo:docs/specs/03-contrato-salesforce.md:84]
- Contexto bundle: `response.ts` importa `zod` (API clasica v3); D-19 (20 KB) sigue pendiente y D-02 menciona `zod/v4/mini` como opcion, asi que el import puede cambiar en s05/s13 [repo:docs/specs/02-decisiones.md:10]
- Contexto Playwright E2E y CI: no hay script de E2E ni workflow todavia; nada de lo anterior se verifico ahi [repo:package.json:5]

## 9. Incertidumbre

- ASSUMPTION: la version de Elementor Pro en www.atfxlatam.com responde con `data: []` y/o `errors: []` cuando estan vacios, igual que la redistribucion GPL leida. prueba: Karen o IT (no un agente: el CLAUDE.md del repo prohibe llamar al admin-ajax real) copia desde DevTools > Network el cuerpo de un envio real exitoso y de uno rechazado, y se guardan como fixtures del test
- ASSUMPTION: alguna accion del form (Salesforce/middleware) agrega `aanumber` con `add_response_data`, asi que en exito `data.data` es objeto; si no lo agrega, viene `[]`. prueba: la misma captura de arriba, revisando si `data.data.aanumber` llega siempre
- ASSUMPTION: los fake timers de vitest 5 no parchean las referencias a `timers` ya capturadas por Node, asi que `AbortSignal.timeout` no se acelera en tests. prueba: test de 3 lineas con `vi.useFakeTimers()`, `AbortSignal.timeout(1000)` y `await vi.advanceTimersByTimeAsync(1000)`, comprobar `signal.aborted`
- ASSUMPTION: el peso de zod v3 clasico en el bundle es relevante para D-19. prueba: `esbuild --bundle --metafile` del entry `lead` y medir con brotli lo que aporta `node_modules/zod`
- [NEEDS CLARIFICATION: aceptar `[]` en `errors` y `data.data` toca el contrato escrito en `03-contrato-salesforce.md`; Karen decide si se actualiza el contrato ya (riesgo: exito real reportado como desconocido) o se espera a la captura real]

## 10. Checklist de estandar

- [ ] Un solo `fetch` por llamada a `submitLead` en todos los caminos (exito, rechazo, timeout, red, invalido); asercion `toHaveBeenCalledTimes(1)` en cada test
- [ ] El timeout usa `setTimeout` + `AbortController` (no `AbortSignal.timeout`) por Safari/iOS 15
- [ ] El timer cubre `fetch` y `response.json()`, y se limpia en `finally`; test con un cuerpo que nunca termina devuelve `unknown/timeout` a los 15 s
- [ ] La clasificacion `timeout` sale de una bandera propia del timer, no de `instanceof DOMException`
- [ ] `fetch` que rechaza sin timeout da `unknown/network`; cuerpo no JSON, `0`, `-1` o JSON sin `success` dan `unknown/invalid-response`
- [ ] Fixtures de respuesta con `data: []` y `errors: []` (exito y rechazo) tienen un resultado definido y probado, segun decida Karen sobre el contrato
- [ ] El rechazo se decide por `success: false` del cuerpo, nunca por `response.ok` o el status
- [ ] Los mocks usan `vi.fn<typeof fetch>` y `npm run typecheck` pasa sin errores
- [ ] El tipo `SubmitResult` coincide con `docs/specs/04-arquitectura.md` (incluido `aanumber?:` y `Readonly` en `fieldErrors`) o la arquitectura se actualiza en la misma rama
- [ ] Ningun `console.*` en `src/core/` con datos del payload o de la respuesta
- [ ] Headers exactos `{ "X-Requested-With": "XMLHttpRequest" }`, sin `Content-Type` manual, cuerpo `FormData`

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | RFC 9110 HTTP Semantics, 9.2.2 (reusado de embed-form-submit-privacy) | IETF | RFC 9110 | 2026-10-01 | high |
| 2 | Fetch Standard, abort a fetch() call (fetch.bs) | WHATWG | 2026-09-21, commit 357bd98 | 2026-10-01 | high |
| 3 | MDN AbortController.abort, AbortSignal.timeout, Response.json, fetch | Mozilla | 2026-10-01 | 2026-10-01 | high |
| 4 | browser-compat-data AbortSignal.json y AbortController.json | MDN | commit 852a2f6 | 2026-10-01 | high |
| 5 | wordpress-develop admin-ajax.php, functions.php, pluggable.php | WordPress | 7.1.2 | 2026-10-01 | high |
| 6 | PHP manual json_encode | PHP Group | PHP 8 | 2026-10-01 | high |
| 7 | Zod v3 docs y fuente | colinhacks/zod | 3.25.76 (7baee4e) | 2026-10-01 | high |
| 8 | Vitest docs y fuente (spy, jsdom env, faketimers, pool) | vitest-dev | 5.0.3 (33cadea) | 2026-10-01 | high |
| 9 | jsdom AbortSignal.webidl y arbol de fuentes | jsdom | 30.1.1 (0a117f4) | 2026-10-01 | high |
| 10 | Node lib/internal/abort_controller.js | Node.js | 22.23.2 (aa4c775) | 2026-10-01 | high |
| 11 | Elementor Pro ajax-handler.php (redistribucion GPL proelements) | proelements | commit 84c616b | 2026-10-01 | medium |
| 12 | ky timeout.ts, normalize.ts, readme | sindresorhus | commit 0d59458 | 2026-10-01 | high |
| 13 | ofetch fetch.ts | unjs | commit 1dbc37f | 2026-10-01 | high |
