# s8 — Controlador de una instancia

Estado: HECHA (PR #13). Depende de: s6, s7.

## Objetivo

Unir validación, payload, envío, popup y analítica para un formulario montado, sin duplicados
y sin que la analítica pueda romper un éxito (audit Q-02).

## Archivos

- `src/core/controller.ts`
- `src/core/analytics.ts`
- `src/ui/states.ts` (estado "resultado desconocido" con botón de reintento manual)
- `src/core/controller.test.ts`

## API

```ts
export interface ControllerDeps {
  readonly submit: typeof submitLead;
  readonly now: () => number;
  readonly openPopup: () => Window | null;          // envuelve window.open("about:blank","_blank")
  readonly page: () => PageContext;                  // href + title en el momento del envío
  readonly integrations: readonly IntegrationHook[];
}
export function bindController(form: HTMLFormElement, ctx: InstanceContext, deps: ControllerDeps): void;

export type IntegrationHook = (event: { readonly aanumber?: string; readonly form: FormKey }) => void;
export function runIntegrations(hooks: readonly IntegrationHook[], event: Parameters<IntegrationHook>[0]): void;
export const DEFAULT_INTEGRATIONS: readonly IntegrationHook[]; // gtag generate_lead, dataLayer atfx_lead, fbq Lead
```

Secuencia del submit (ver `04-arquitectura.md`):
1. Si hay envío en curso → ignorar (CA-11).
2. Honeypot lleno → mostrar thank-you sin `fetch` (CA-08).
3. Validar; errores → mostrar, mover foco al primer campo inválido, fin.
4. Recalcular `scheduleState(attrs, now())`; si no es `open` → estado cerrado, fin (CA-21).
5. Modo webinar: `openPopup()` **antes** de cualquier `await`; si devuelve ventana,
   `popup.opener = null`.
6. `buildPayload` con `page()` y `submit`.
7. `ok` → callback de éxito (s11 pone el thank-you; aquí uno mínimo), luego
   `popup.location.href = zoomLink`, luego `runIntegrations`.
8. `rejected` → errores por campo + mensaje, cerrar popup.
9. `unknown` → `ui/states` "puede que tu registro se haya enviado" con botón "Intentar de nuevo"
   que repite desde el paso 3 solo al pulsarlo; cerrar popup.
10. Siempre liberar el lock y `setBusy(false)`.

`runIntegrations` llama cada hook dentro de su propio `try/catch` y no espera promesas.

## Tests primero

CA-08, CA-11, CA-12 (con UI), CA-13 (con UI), CA-15, CA-16, CA-17, CA-21; y: el foco va al primer
campo inválido; `unknown` no dispara analítica; `rejected` no dispara analítica.

## Decisiones de Karen (2026-10-02, brief `s08-controlador`)

- Popup de Zoom: `window.open("about:blank", "_blank")` sin features, sincrónico en el handler
  de submit antes de cualquier `await`; `opener = null` de inmediato; se navega a `zoomLink`
  solo tras `ok` y se cierra en `rejected` / `unknown`. Se acepta que Zoom reciba el origen de la
  landing como Referer. El CTA de respaldo se muestra siempre en un éxito de webinar.
- Rechazo: la persona ve solo el mensaje del diccionario y los errores por campo; el `message`
  de Elementor no se muestra.
- `schedule()` se inyecta en las dependencias del controlador; s9 pasa una que siempre devuelve
  abierta hasta que s10 ponga la real.
- La UI llega como puerto inyectado (`setBusy`, `showFieldErrors`, `showState`), definido por
  s8; s9 lo conecta con el render de s7. Resuelve el `InstanceContext` sin definir.
