import type { FormKey, MountAttrs } from "../contract/types";
import { resolveDict } from "../i18n/index";
import type { Dict } from "../i18n/types";
import { createFormUi } from "../ui/form-ui";
import { fieldId } from "../ui/fields";
import { renderForm, type FormDefinition } from "../ui/render";
import { renderRejected } from "../ui/states";
import { parseMountAttrs } from "./attrs";
import { DEFAULT_INTEGRATIONS, bindController, closedMessage, openAboutBlank } from "./controller";
import type { ControllerDeps } from "./controller";
import { submitLead } from "./submit";
import { scheduleState } from "./time";

declare const __LEADKIT_VERSION__: string;

type Mounter = (root: ParentNode) => number;

export interface LeadkitGlobal {
  readonly versions: Readonly<Partial<Record<FormKey, string>>>;
  // Shared across bundle copies: a form missing from here has no submit listener (a clone).
  readonly forms: WeakSet<HTMLFormElement>;
  register(key: FormKey, version: string, mounter: Mounter): boolean;
  mount(root?: ParentNode): void;
}

declare global {
  interface Window {
    atfxLeadkit?: LeadkitGlobal;
  }
}

const MOUNTED_ATTR = "data-atfx-mounted";
const DEBUG_ATTR = "data-debug";
const OBSERVE_OPTIONS: MutationObserverInit = { childList: true, subtree: true };

// Per bundle copy; the attribute and the global WeakSet cover the other copies.
const mountedHosts = new WeakSet<Element>();
let instanceCounter = 0;

function bundleVersion(): string {
  return typeof __LEADKIT_VERSION__ === "string" ? __LEADKIT_VERSION__ : "dev";
}

// Native methods, so a page-supplied forms object cannot answer "already mounted" for a form with no listener.
const weakHas = WeakSet.prototype.has;
const weakAdd = WeakSet.prototype.add;

function hasRealWeakSet(forms: unknown): forms is WeakSet<HTMLFormElement> {
  if (!(forms instanceof WeakSet)) return false;
  try {
    // Throws for a Proxy or any object that is not a genuine WeakSet.
    weakHas.call(forms, {});
    return true;
  } catch {
    return false;
  }
}

function isLeadkitGlobal(candidate: unknown): candidate is LeadkitGlobal {
  if (typeof candidate !== "object" || candidate === null) return false;
  const shape = candidate as { register?: unknown; forms?: unknown };
  return typeof shape.register === "function" && hasRealWeakSet(shape.forms);
}

// Undefined means the global was not ours: fail closed rather than mount with a registry we cannot trust.
function ensureGlobal(): LeadkitGlobal | undefined {
  const existing: unknown = window.atfxLeadkit;
  if (existing !== undefined) {
    if (isLeadkitGlobal(existing)) return existing;
    console.warn("[atfx-leadkit] unexpected window.atfxLeadkit; not mounting");
    return undefined;
  }
  const registry = new Map<FormKey, Mounter>();
  let versions: Readonly<Partial<Record<FormKey, string>>> = {};
  const created: LeadkitGlobal = {
    get versions() {
      return versions;
    },
    forms: new WeakSet<HTMLFormElement>(),
    register(key, version, mounter) {
      if (registry.has(key)) return false;
      registry.set(key, mounter);
      versions = { ...versions, [key]: version };
      return true;
    },
    mount(root = document) {
      for (const mounter of registry.values()) mounter(root);
    },
  };
  window.atfxLeadkit = created;
  return created;
}

function selectorFor(key: FormKey): string {
  return `[data-atfx-leadkit="${key}"]`;
}

function findHosts(key: FormKey, root: ParentNode): Element[] {
  const selector = selectorFor(key);
  const found = Array.from(root.querySelectorAll(selector));
  if (root instanceof Element && root.matches(selector)) return [root, ...found];
  return found;
}

function nextInstanceId(key: FormKey): string {
  instanceCounter += 1;
  // Another copy of the bundle restarts its counter, so the document is the source of truth.
  while (document.getElementById(fieldId("firstName", `${key}-${instanceCounter}`)) !== null) {
    instanceCounter += 1;
  }
  return `${key}-${instanceCounter}`;
}

function alreadyMounted(host: Element, api: LeadkitGlobal): boolean {
  if (!host.hasAttribute(MOUNTED_ATTR)) return false;
  if (mountedHosts.has(host)) return true;
  const form = Array.from(host.children).find((child): child is HTMLFormElement => child instanceof HTMLFormElement);
  // No form means a closed placeholder: nothing could submit, so there is no clone risk.
  return form === undefined || weakHas.call(api.forms, form);
}

function createStatusRegion(): HTMLElement {
  const status = document.createElement("div");
  // Present and empty from the start so screen readers register it before the first message.
  status.setAttribute("role", "status");
  return status;
}

function controllerDeps(ui: ControllerDeps["ui"]): ControllerDeps {
  return {
    submit: submitLead,
    now: () => Date.now(),
    openPopup: openAboutBlank,
    page: () => ({ href: window.location.href, title: document.title }),
    integrations: DEFAULT_INTEGRATIONS,
    schedule: scheduleState,
    ui,
  };
}

function parseHostAttrs(host: HTMLElement): MountAttrs {
  return parseMountAttrs(
    host.dataset,
    { pageUrl: window.location.href, closedUrlAllowlist: [] },
    (message) => {
      console.warn(message);
    },
  );
}

// A clone carries the attribute but no listener; replaceChildren in the mount functions drops its stale form.
function mountClosed(host: Element, dict: Dict, schedule: Exclude<ReturnType<typeof scheduleState>, "open">): void {
  const status = createStatusRegion();
  renderRejected(status, closedMessage(dict, schedule));
  host.replaceChildren(status);
}

function mountForm(
  definition: FormDefinition,
  host: Element,
  api: LeadkitGlobal,
  attrs: MountAttrs,
  dict: Dict,
): void {
  const instanceId = nextInstanceId(definition.key);
  const form = renderForm({ definition, attrs, dict, instanceId });
  const status = createStatusRegion();
  // Bound before insertion: a failure here leaves the host empty, never an unbound form.
  bindController(form, { attrs, dict }, controllerDeps(createFormUi({ form, status, instanceId, dict, attrs })));
  host.replaceChildren(form, status);
  weakAdd.call(api.forms, form);
}

function mountHost(definition: FormDefinition, host: HTMLElement, api: LeadkitGlobal): void {
  // Set before rendering so an overlapping pass or another bundle copy skips this host.
  host.setAttribute(MOUNTED_ATTR, "");
  mountedHosts.add(host);
  const attrs = parseHostAttrs(host);
  const dict = resolveDict(attrs.lang);
  const schedule = scheduleState(attrs, Date.now());
  if (schedule !== "open") {
    mountClosed(host, dict, schedule);
    return;
  }
  mountForm(definition, host, api, attrs, dict);
}

function safeMount(definition: FormDefinition, host: HTMLElement, api: LeadkitGlobal): boolean {
  try {
    mountHost(definition, host, api);
    return true;
  } catch (error) {
    host.replaceChildren();
    console.error("[atfx-leadkit] mount failed", error instanceof Error ? error.name : "unknown");
    return false;
  }
}

export function mountAll(definition: FormDefinition, root: ParentNode = document): number {
  const api = ensureGlobal();
  if (api === undefined) return 0;
  const pending = findHosts(definition.key, root).filter(
    (host): host is HTMLElement => host instanceof HTMLElement && !alreadyMounted(host, api),
  );
  let mounted = 0;
  for (const host of pending) {
    if (safeMount(definition, host, api)) mounted += 1;
  }
  if (pending.some((host) => host.hasAttribute(DEBUG_ATTR))) {
    console.info(`[atfx-leadkit] ${definition.key} v${bundleVersion()}`);
  }
  return mounted;
}

function handleRecords(definition: FormDefinition, records: readonly MutationRecord[]): void {
  for (const record of records) {
    for (const node of Array.from(record.addedNodes)) {
      if (node.nodeType !== Node.ELEMENT_NODE || !node.isConnected) continue;
      mountAll(definition, node as Element);
    }
  }
}

export function observe(definition: FormDefinition): () => void {
  const api = ensureGlobal();
  if (api === undefined) return () => undefined;
  api.register(definition.key, bundleVersion(), (root) => mountAll(definition, root));
  const observer = new MutationObserver((records) => {
    handleRecords(definition, records);
  });
  let stopped = false;
  const begin = (): void => {
    if (stopped || !document.body) return;
    // Observer first, scan second: a node inserted between the two would otherwise be missed.
    observer.observe(document.body, OBSERVE_OPTIONS);
    mountAll(definition, document);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", begin, { once: true });
  } else {
    begin();
  }
  return () => {
    stopped = true;
    document.removeEventListener("DOMContentLoaded", begin);
    observer.disconnect();
  };
}
