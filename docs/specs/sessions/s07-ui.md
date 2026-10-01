# s7 — Render de UI, CSS y honeypot

Estado: BLOQUEADA (D-05, D-10). Depende de: s3, s4, s5.

## Objetivo

Renderizar el formulario en light DOM, accesible, aislado del CSS del host y sin ids repetidos.

## Archivos

- `src/ui/fields.ts`
- `src/ui/render.ts`
- `src/styles/leadkit.css`
- `src/ui/render.test.ts`

## API

```ts
export interface RenderInput {
  readonly definition: FormDefinition;
  readonly attrs: MountAttrs;
  readonly dict: Dict;
  readonly instanceId: string;          // sufijo único, lo genera s9
}
export function renderForm(input: RenderInput): HTMLFormElement;
export function readValues(form: HTMLFormElement, instanceId: string): Record<string, unknown>;
export function showFieldErrors(form: HTMLFormElement, errors: Readonly<Record<string, string>>): void;
export function setBusy(form: HTMLFormElement, busy: boolean): void;
```

Reglas:
- Raíz: `<form class="atfx-leadkit" data-theme="light|dark" novalidate>`; sin `action` ni `id` fijo.
- Todo `id` = `atfx-<campo>-<instanceId>`; cada `<label for>` apunta al suyo (CA-03).
- País y prefijo: `<select>` nativo (D-10) con `autocomplete="country"` y
  `autocomplete="tel-country-code"`; nombre, apellido, email, teléfono con `given-name`,
  `family-name`, `email`, `tel-national`; `inputmode` adecuado.
- Preselección: si `attrs.country` existe, preseleccionar país y prefijo (sin red; D-11).
- Error por campo: `<p id="atfx-<campo>-error-<instanceId>">` + `aria-describedby` + `aria-invalid`.
- Checkbox de aceptación: único control obligatorio, `checked` según D-05. El texto del
  consentimiento viene del diccionario y el enlace de privacidad se renderiza fuera del `label`
  (estructura definida en s12).
- Honeypot: un input `name="atfx_hp_<instanceId>"`, fuera de la vista con CSS (no `display:none`),
  `tabindex="-1"`, `autocomplete="off"`, `aria-hidden="true"`. `readValues` lo devuelve como `honeypot`.
- Textos del servidor y del editor siempre con `textContent`; `innerHTML` solo para SVG constantes.
- CSS: todo bajo `.atfx-leadkit`; variables `--atfx-*` definidas en `.atfx-leadkit` y en
  `.atfx-leadkit[data-theme="dark"]`, nunca en `:root`; reset local de `box-sizing`, márgenes,
  fuentes y `appearance` de inputs para resistir el CSS del tema de Elementor; animación de
  entrada con `@keyframes` y `@media (prefers-reduced-motion: reduce)`; foco visible con
  contraste ≥ 3:1; `[data-atfx-leadkit]` con `min-height` reservada (RNF-05).

## Tests primero

- Dos renders con `instanceId` distintos en el mismo documento: ningún id repetido; cada label
  apunta a un input de su form (CA-03).
- Atributos `autocomplete` correctos.
- Preselección de país con `attrs.country = "CO"`.
- `showFieldErrors` con mensaje `<img src=x onerror=alert(1)>` deja texto literal (CA-14, parte UI).
- Estado inicial del checkbox según D-05.
- El enlace de privacidad existe por idioma y está fuera del `label` de consentimiento.
- `setBusy(true)` deshabilita el botón y pone `aria-busy`.
