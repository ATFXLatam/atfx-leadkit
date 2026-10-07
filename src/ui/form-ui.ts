import type { MountAttrs } from "../contract/types";
import type { FieldKey, FormUi, UiState } from "../core/controller";
import type { Dict } from "../i18n/types";
import { readValues, setBusy, showFieldErrors } from "./render";
import { renderRejected, renderThankYou, renderUnknownResult } from "./states";

export interface FormUiTarget {
  readonly form: HTMLFormElement;
  readonly status: HTMLElement;
  readonly instanceId: string;
  readonly dict: Dict;
  readonly attrs: MountAttrs;
}

export function createFormUi(target: FormUiTarget): FormUi {
  const { form, instanceId } = target;
  return {
    readValues: () => readValues(form, instanceId),
    setBusy: (busy) => {
      setBusy(form, busy);
    },
    showFieldErrors: (errors) => {
      showFieldErrors(form, errors);
    },
    focusFirstInvalid: (field) => {
      focusField(form, field);
    },
    showState: (state) => {
      paintState(target, state);
    },
  };
}

function focusField(form: HTMLFormElement, field: FieldKey): void {
  const target =
    form.querySelector<HTMLElement>(`[data-atfx-control-for="${field}"]`) ??
    form.querySelector<HTMLElement>(`[data-atfx-field="${field}"]`);
  target?.focus();
}

// Renderers empty their parent, so they only ever receive the status region, never the host.
function paintState(target: FormUiTarget, state: UiState): void {
  const { form, status, dict, attrs } = target;
  // The status region sits outside the form, so it needs its own hook for the theme tokens.
  status.classList.add("atfx-leadkit-status");
  status.dataset.theme = attrs.theme;
  if (state.kind === "thank-you") {
    hideForm(form);
    renderThankYou(status, dict, state.zoomCta ? attrs.zoomLink : null);
    return;
  }
  if (state.kind === "closed") {
    hideForm(form);
    renderRejected(status, state.message);
    return;
  }
  if (state.kind === "unknown") {
    renderUnknownResult(status, state.message, state.onRetry, dict.errors.retry);
    return;
  }
  renderRejected(status, state.message);
}

function hideForm(form: HTMLFormElement): void {
  form.hidden = true;
  // The stylesheet sets display on the form, which beats the hidden attribute.
  form.style.display = "none";
}
