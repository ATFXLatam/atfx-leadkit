// The native <select> stays in the DOM as the single source of truth: readValues, the
// Salesforce payload and the tests keep reading select.value. This layer only paints a
// searchable listbox (the at_forms look) on top and writes back through select.value.

export interface ComboboxOptions {
  readonly searchPlaceholder: string;
  // Display text for an option in the panel and trigger; the select keeps its own text.
  readonly display?: (option: HTMLOptionElement) => string;
}

interface Parts {
  readonly select: HTMLSelectElement;
  readonly wrapper: HTMLDivElement;
  readonly trigger: HTMLButtonElement;
  readonly value: HTMLSpanElement;
  readonly panel: HTMLDivElement;
  readonly search: HTMLInputElement;
  readonly list: HTMLUListElement;
  readonly display: (option: HTMLOptionElement) => string;
}

const CLOSE_MS = 140;

export function enhanceSelect(select: HTMLSelectElement, options: ComboboxOptions): HTMLDivElement {
  const parts = buildParts(select, options);
  hideNative(select);
  bindEvents(parts);
  syncTrigger(parts);
  return parts.wrapper;
}

export function triggerId(selectId: string): string {
  return `${selectId}-trigger`;
}

export function normalizeForSearch(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");
}

function buildParts(select: HTMLSelectElement, options: ComboboxOptions): Parts {
  const display = options.display ?? ((option: HTMLOptionElement) => option.textContent ?? "");
  const wrapper = document.createElement("div");
  wrapper.className = "atfx-leadkit__combobox";

  const value = document.createElement("span");
  value.className = "atfx-leadkit__combobox-value";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.id = triggerId(select.id);
  trigger.className = "atfx-leadkit__combobox-trigger";
  trigger.dataset.atfxControlFor = select.dataset.atfxField ?? "";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.append(value);

  const list = buildList(select, display);
  const search = buildSearch(list.id, options.searchPlaceholder);
  const panel = document.createElement("div");
  panel.className = "atfx-leadkit__combobox-panel";
  panel.append(search, list);
  trigger.setAttribute("aria-controls", list.id);

  wrapper.append(trigger, panel, select);
  return { select, wrapper, trigger, value, panel, search, list, display };
}

function buildSearch(listId: string, placeholder: string): HTMLInputElement {
  const search = document.createElement("input");
  search.type = "text";
  search.className = "atfx-leadkit__combobox-search";
  search.placeholder = placeholder;
  search.autocomplete = "off";
  search.setAttribute("aria-label", placeholder);
  search.setAttribute("role", "combobox");
  search.setAttribute("aria-autocomplete", "list");
  search.setAttribute("aria-expanded", "true");
  search.setAttribute("aria-controls", listId);
  return search;
}

function buildList(select: HTMLSelectElement, display: (option: HTMLOptionElement) => string): HTMLUListElement {
  const list = document.createElement("ul");
  list.id = `${select.id}-listbox`;
  list.className = "atfx-leadkit__combobox-list";
  list.setAttribute("role", "listbox");
  Array.from(select.options)
    .filter((option) => option.value !== "")
    .forEach((option, index) => {
      const item = document.createElement("li");
      item.id = `${list.id}-${index}`;
      item.className = "atfx-leadkit__combobox-option";
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", "false");
      item.dataset.value = option.value;
      item.textContent = display(option);
      list.append(item);
    });
  return list;
}

// aria-hidden + tabindex -1: assistive tech and Tab reach only the trigger, never two controls.
function hideNative(select: HTMLSelectElement): void {
  select.classList.add("atfx-leadkit__native-select");
  select.setAttribute("aria-hidden", "true");
  select.tabIndex = -1;
}

function bindEvents(parts: Parts): void {
  const { trigger, search, list, panel, wrapper, select } = parts;
  trigger.addEventListener("click", () => (isOpen(parts) ? close(parts) : open(parts)));
  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    open(parts);
  });
  search.addEventListener("input", () => filter(parts, search.value));
  search.addEventListener("keydown", (event) => onSearchKey(parts, event));
  // Keeps focus in the search while clicking an option, so focusout does not close first.
  panel.addEventListener("mousedown", (event) => event.preventDefault());
  list.addEventListener("click", (event) => {
    const item = (event.target as Element).closest<HTMLLIElement>(".atfx-leadkit__combobox-option");
    if (item && !item.hidden) choose(parts, item.dataset.value ?? "");
  });
  wrapper.addEventListener("focusout", (event) => {
    const next = event.relatedTarget as Node | null;
    if (next === null || !wrapper.contains(next)) close(parts);
  });
  select.addEventListener("change", () => syncTrigger(parts));
}

function onSearchKey(parts: Parts, event: KeyboardEvent): void {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveActive(parts, event.key === "ArrowDown" ? 1 : -1);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    const active = activeItem(parts);
    if (active) choose(parts, active.dataset.value ?? "");
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    close(parts);
    parts.trigger.focus();
  }
}

function isOpen(parts: Parts): boolean {
  return parts.wrapper.hasAttribute("data-open");
}

function open(parts: Parts): void {
  const { wrapper, panel, trigger, search } = parts;
  wrapper.setAttribute("data-open", "");
  panel.classList.remove("is-closing");
  panel.classList.add("is-open");
  trigger.setAttribute("aria-expanded", "true");
  search.value = "";
  filter(parts, "");
  setActive(parts, selectedItem(parts) ?? visibleItems(parts)[0] ?? null);
  search.focus();
}

function close(parts: Parts): void {
  if (!isOpen(parts)) return;
  const { wrapper, panel, trigger } = parts;
  wrapper.removeAttribute("data-open");
  panel.classList.remove("is-open");
  panel.classList.add("is-closing");
  trigger.setAttribute("aria-expanded", "false");
  setTimeout(() => panel.classList.remove("is-closing"), CLOSE_MS);
}

function choose(parts: Parts, value: string): void {
  parts.select.value = value;
  parts.select.dispatchEvent(new Event("change", { bubbles: true }));
  close(parts);
  parts.trigger.focus();
}

function filter(parts: Parts, query: string): void {
  const needle = normalizeForSearch(query.trim());
  for (const item of allItems(parts)) {
    item.hidden = needle !== "" && !normalizeForSearch(item.textContent ?? "").includes(needle);
  }
  const active = activeItem(parts);
  if (active === null || active.hidden) setActive(parts, visibleItems(parts)[0] ?? null);
}

function moveActive(parts: Parts, step: 1 | -1): void {
  const items = visibleItems(parts);
  if (items.length === 0) return;
  const current = activeItem(parts);
  const index = current === null ? -1 : items.indexOf(current);
  const next = items[Math.min(items.length - 1, Math.max(0, index + step))];
  setActive(parts, next ?? null);
}

function setActive(parts: Parts, item: HTMLLIElement | null): void {
  for (const other of allItems(parts)) other.classList.remove("is-active");
  if (item === null) {
    parts.search.removeAttribute("aria-activedescendant");
    return;
  }
  item.classList.add("is-active");
  parts.search.setAttribute("aria-activedescendant", item.id);
  // jsdom has no layout; scrollIntoView is missing there, present in every browser.
  item.scrollIntoView?.({ block: "nearest" });
}

function syncTrigger(parts: Parts): void {
  const { select, trigger, value, display } = parts;
  const option = select.selectedOptions[0];
  const empty = option === undefined || option.value === "";
  value.textContent = empty ? (select.options[0]?.textContent ?? "") : display(option);
  trigger.toggleAttribute("data-placeholder", empty);
  for (const item of allItems(parts)) {
    item.setAttribute("aria-selected", String(!empty && item.dataset.value === select.value));
  }
}

function allItems(parts: Parts): HTMLLIElement[] {
  return Array.from(parts.list.querySelectorAll<HTMLLIElement>(".atfx-leadkit__combobox-option"));
}

function visibleItems(parts: Parts): HTMLLIElement[] {
  return allItems(parts).filter((item) => !item.hidden);
}

function activeItem(parts: Parts): HTMLLIElement | null {
  return parts.list.querySelector<HTMLLIElement>(".atfx-leadkit__combobox-option.is-active");
}

function selectedItem(parts: Parts): HTMLLIElement | null {
  return parts.list.querySelector<HTMLLIElement>('.atfx-leadkit__combobox-option[aria-selected="true"]');
}
