import { afterEach, describe, expect, test } from "vitest";
import { enhanceSelect, normalizeForSearch, triggerId } from "./combobox";

afterEach(() => {
  document.body.innerHTML = "";
});

function nativeSelect(selected = ""): HTMLSelectElement {
  const select = document.createElement("select");
  select.id = "atfx-country-one";
  select.name = "country";
  select.dataset.atfxField = "country";
  for (const [value, label] of [
    ["", "Selecciona"],
    ["MEX", "México"],
    ["PER", "Perú"],
    ["COL", "Colombia"],
  ]) {
    const option = document.createElement("option");
    option.value = value ?? "";
    option.textContent = label ?? "";
    option.selected = value === selected;
    select.append(option);
  }
  return select;
}

function mount(selected = "") {
  const select = nativeSelect(selected);
  const wrapper = enhanceSelect(select, {
    searchPlaceholder: "Buscar...",
    display: (option) => `[${option.value}] ${option.textContent ?? ""}`,
  });
  document.body.append(wrapper);
  const trigger = document.getElementById(triggerId(select.id)) as HTMLButtonElement;
  const search = wrapper.querySelector<HTMLInputElement>(".atfx-leadkit__combobox-search")!;
  const option = (value: string) =>
    wrapper.querySelector<HTMLLIElement>(`.atfx-leadkit__combobox-option[data-value="${value}"]`)!;
  return { select, wrapper, trigger, search, option };
}

function key(target: HTMLElement, name: string): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
}

describe("enhanceSelect", () => {
  test("clicking an option writes the native select value and fires change", () => {
    const { select, trigger, option } = mount();
    const changes: string[] = [];
    select.addEventListener("change", () => changes.push(select.value));

    trigger.click();
    option("PER").click();

    expect(select.value).toBe("PER");
    expect(changes).toEqual(["PER"]);
    expect(trigger.textContent).toBe("[PER] Perú");
    expect(trigger.hasAttribute("data-placeholder")).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  test("search filters accent-insensitively and Enter picks the first match", () => {
    const { select, trigger, search, option } = mount();
    trigger.click();
    search.value = "peru";
    search.dispatchEvent(new Event("input"));

    expect(option("PER").hidden).toBe(false);
    expect(option("MEX").hidden).toBe(true);
    key(search, "Enter");
    expect(select.value).toBe("PER");
  });

  test("arrow keys move the active option and Escape closes without changing the value", () => {
    const { select, trigger, search, option } = mount();
    trigger.click();
    key(search, "ArrowDown");
    expect(search.getAttribute("aria-activedescendant")).toBe(option("PER").id);

    key(search, "Escape");
    expect(select.value).toBe("");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  test("a preselected value (geo default) shows on the trigger and marks the option", () => {
    const { trigger, option } = mount("COL");
    expect(trigger.textContent).toBe("[COL] Colombia");
    expect(option("COL").getAttribute("aria-selected")).toBe("true");
  });

  test("the native select is removed from tab order and assistive tech", () => {
    const { select, trigger } = mount();
    expect(select.tabIndex).toBe(-1);
    expect(select.getAttribute("aria-hidden")).toBe("true");
    expect(trigger.dataset.atfxControlFor).toBe("country");
  });

  test("a programmatic change on the select repaints the trigger", () => {
    const { select, trigger } = mount();
    select.value = "MEX";
    select.dispatchEvent(new Event("change"));
    expect(trigger.textContent).toBe("[MEX] México");
  });
});

describe("normalizeForSearch", () => {
  test("drops case and diacritics", () => {
    expect(normalizeForSearch("PERÚ Brasília")).toBe("peru brasilia");
  });
});
