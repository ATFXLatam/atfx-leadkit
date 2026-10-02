# Arquitectura

Fuente: `research/embed-form-runtime.md` (vanilla TS en light DOM, sin Shadow DOM, sin framework,
carpetas por feature, un bundle por formulario), `research/embed-form-submit-privacy.md`
(validación, envío), `research/forms-v2-distribution.md` (archivo autocontenido por formulario) y
la auditoría de arquitectura del paquete viejo.

## Principios

1. **Funciones puras en el centro, DOM en el borde.** Atributos, payload, schema, caducidad y
   resultado del envío son funciones puras testeables sin DOM. El DOM solo vive en `ui/` y en el
   controlador.
2. **Un único punto de entrada para datos no confiables:** `core/attrs.ts` para atributos,
   `forms/*/schema.ts` para lo que escribe la persona, `core/response.ts` para lo que responde el
   servidor.
3. **El contrato es un módulo,** no una consecuencia del DOM.
4. **Sin estado global mutable** salvo el `WeakSet` de nodos montados.
5. **Un archivo autocontenido por formulario:** el CSS se empaqueta dentro del JS y se inyecta una
   sola vez como `<style>` por documento.

## Estructura

```
atfx-leadkit/
├── AGENTS.md
├── package.json  tsconfig.json  esbuild.config.mjs  vitest.config.ts  playwright.config.ts
├── src/
│   ├── contract/
│   │   ├── picklist.ts        # LeadSource válidos + resolveLeadSource
│   │   ├── payload.ts         # buildPayload: datos -> entradas exactas del contrato
│   │   └── payload.test.ts    # golden por variante
│   ├── core/
│   │   ├── attrs.ts           # parseMountAttrs (único punto de entrada de data-*)
│   │   ├── url.ts             # safeZoomLink
│   │   ├── time.ts            # parseIsoWithZone, scheduleState
│   │   ├── response.ts        # schema de la respuesta de admin-ajax
│   │   ├── submit.ts          # submitLead -> SubmitResult (sin reintentos)
│   │   ├── analytics.ts       # runIntegrations aisladas
│   │   ├── controller.ts      # une schema + payload + submit + UI de una instancia
│   │   └── mount.ts           # mountAll, observer, API pública
│   ├── data/
│   │   ├── countries.ts       # ISO3 + nombre es/en/pt
│   │   └── dialling.ts        # prefijos
│   ├── i18n/
│   │   ├── types.ts           # Dict
│   │   ├── es.ts  en.ts  pt.ts
│   │   └── index.ts           # resolveDict
│   ├── forms/
│   │   ├── lead/   config.ts  schema.ts  schema.test.ts
│   │   └── interest/ config.ts  schema.ts  schema.test.ts
│   ├── ui/
│   │   ├── fields.ts          # input, select nativo, checkbox, honeypot
│   │   ├── render.ts          # renderForm(instance) -> HTMLFormElement
│   │   ├── states.ts          # cerrado / no iniciado / resultado desconocido / errores
│   │   └── thank-you.ts
│   ├── styles/
│   │   ├── leadkit.css        # fuente CSS (importada como texto)
│   │   ├── css.d.ts           # declare module "*.css"
│   │   └── styles.ts          # injectStylesOnce(cssText)
│   └── entries/
│       ├── lead.ts            # registra el form lead + mountAll
│       └── interest.ts
├── e2e/
│   ├── host.html              # página que imita Elementor con CSS agresivo
│   └── *.spec.ts
└── docs/
```

Ningún archivo de `src/forms/<x>/` importa de otro formulario. `core/` no conoce formularios
concretos: recibe un `FormDefinition`.

## Tipos centrales

```ts
export type Lang = "es" | "en" | "pt";
export type FormKey = "lead" | "interest";

export interface MountAttrs {
  readonly form: FormKey;
  readonly lang: Lang;
  readonly theme: "light" | "dark";
  readonly zoomLink: string | null;     // ya validado por safeZoomLink
  readonly webinarTopic: string | null; // recortado a 120
  readonly webinarDate: string | null;  // YYYY-MM-DD HH:mm:ss o null
  readonly webinarTz: string | null;    // zona IANA para mostrar fecha del webinar
  readonly leadSource: string | null;   // crudo; lo resuelve contract/picklist
  readonly bdmOwner: string | null;     // ya validado o null
  readonly opensAt: number | null;      // epoch ms
  readonly closesAt: number | null;
  readonly closedUrl: string | null;    // https del mismo host o allowlist explícita
  readonly scheduleInvalid: boolean;    // fecha presente pero inválida -> fallar cerrado
  readonly country: string | null;      // ISO2 puesto por el servidor
}

export interface LeadValues {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly diallingCode: string;
  readonly phone: string;
  readonly country: string;   // ISO3
  readonly choice: string;    // valor de Trading_Experience__c
  readonly accepted: boolean;
}

export interface PageContext { readonly href: string; readonly title: string }

export type PayloadEntries = ReadonlyArray<readonly [string, string]>;

export type SubmitResult =
  | { readonly kind: "ok"; readonly aanumber?: string }
  | { readonly kind: "rejected"; readonly fieldErrors: Readonly<Record<string, string>>; readonly message?: string }
  | { readonly kind: "unknown"; readonly reason: "timeout" | "network" | "invalid-response" };

export type ScheduleState = "open" | "not-started" | "expired" | "invalid";

export interface FormDefinition {
  readonly key: FormKey;
  readonly choiceOptions: ReadonlyArray<{ readonly value: string; readonly labelKey: string }>;
  readonly createSchema: (dict: Dict) => import("zod").ZodType<LeadValues>;
}
```

## Flujo de una instancia

```
mount.ts  -> parseMountAttrs(dataset) -> scheduleState(attrs, now)
          -> si no "open": ui/states (cerrado/no iniciado) y fin
          -> controller.create(definition, attrs, dict) -> renderForm -> bind
submit    -> lock -> honeypot? -> schema.safeParse -> scheduleState otra vez
          -> abrir popup (si webinar) -> buildPayload -> submitLead
          -> ok: thank-you, foco, popup.location, runIntegrations
          -> rejected: errores por campo, cerrar popup
          -> unknown: estado "resultado desconocido" con reintento manual, cerrar popup
```

## Endpoint

Constante `/wp-admin/admin-ajax.php`. No se lee del DOM (el `action` del form no decide a dónde
se envía).
