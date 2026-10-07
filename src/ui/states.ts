import type { Dict } from "../i18n/types";

export function renderRejected(parent: HTMLElement, message: string): void {
  const paragraph = document.createElement("p");
  paragraph.className = "atfx-leadkit-state atfx-leadkit-state--rejected";
  paragraph.textContent = message;
  parent.replaceChildren(paragraph);
}

export function renderUnknownResult(
  parent: HTMLElement,
  message: string,
  onRetry: () => void,
  retryLabel: string,
): HTMLButtonElement {
  const panel = document.createElement("div");
  panel.className = "atfx-leadkit-state atfx-leadkit-state--unknown";
  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "atfx-leadkit-state__action";
  button.textContent = retryLabel;
  button.addEventListener("click", () => {
    onRetry();
  });
  panel.append(paragraph, button);
  parent.replaceChildren(panel);
  return button;
}

export function renderThankYou(parent: HTMLElement, dict: Dict, zoomLink: string | null): void {
  const panel = document.createElement("div");
  panel.className = "atfx-leadkit-state atfx-leadkit-state--thanks";
  const title = document.createElement("h2");
  title.className = "atfx-leadkit-state__title";
  title.textContent = dict.thankYou.title;
  const message = document.createElement("p");
  message.className = "atfx-leadkit-state__message";
  message.textContent = dict.thankYou.message;
  panel.append(title, message);
  if (zoomLink !== null) panel.append(zoomAnchor(zoomLink, dict.thankYou.zoomCta));
  parent.replaceChildren(panel);
}

function zoomAnchor(zoomLink: string, label: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = zoomLink;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "atfx-leadkit-state__action";
  link.textContent = label;
  return link;
}
