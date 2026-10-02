const STYLE_SELECTOR = 'style[data-atfx-leadkit-style="true"]';

export function injectStylesOnce(cssText: string): void {
  if (typeof document === "undefined") {
    return;
  }
  if (cssText.trim() === "") {
    return;
  }
  if (document.querySelector(STYLE_SELECTOR)) {
    return;
  }

  const style = document.createElement("style");
  style.setAttribute("data-atfx-leadkit-style", "true");
  style.textContent = cssText;
  document.head.append(style);
}
