import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDict } from "../i18n/index";
import { interestDefinition } from "../forms/interest/config";
import { leadDefinition } from "../forms/lead/config";
import type { FormDefinition } from "../ui/render";
import { scheduleState } from "./time";

type MountModule = typeof import("./mount");

const disconnectors: Array<() => void> = [];

// A fresh module has its own counter and WeakSet, like a second copy of the bundle.
async function loadMount(version = "1.0.0"): Promise<MountModule> {
  vi.resetModules();
  vi.stubGlobal("__LEADKIT_VERSION__", version);
  return import("./mount");
}

// The first bind throws after the host already holds children; later binds are the real ones.
async function loadMountFailingFirstBind(): Promise<MountModule> {
  vi.resetModules();
  vi.stubGlobal("__LEADKIT_VERSION__", "1.0.0");
  const actual = await vi.importActual<typeof import("./controller")>("./controller");
  const bind = vi.fn(actual.bindController).mockImplementationOnce(() => {
    throw new Error("bind boom");
  });
  vi.doMock("./controller", () => ({ ...actual, bindController: bind }));
  return import("./mount");
}

function lateHost(key: string, attrs: Readonly<Record<string, string>> = {}): HTMLElement {
  return host(key, attrs);
}

function host(key: string, attrs: Readonly<Record<string, string>> = {}): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("data-atfx-leadkit", key);
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  document.body.append(element);
  return element;
}

function track(disconnect: () => void): () => void {
  disconnectors.push(disconnect);
  return disconnect;
}

function ids(): string[] {
  return Array.from(document.querySelectorAll("[id]"), (element) => element.id);
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  delete window.atfxLeadkit;
  document.body.innerHTML = "";
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  for (const disconnect of disconnectors.splice(0)) disconnect();
  delete window.atfxLeadkit;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.doUnmock("./controller");
});

describe("mountAll", () => {
  it("mounts one form and an empty status region per matching container", async () => {
    const { mountAll } = await loadMount();
    const a = host("lead");
    const b = host("lead");
    expect(mountAll(leadDefinition)).toBe(2);
    for (const element of [a, b]) {
      expect(element.querySelectorAll("form")).toHaveLength(1);
      expect(element.hasAttribute("data-atfx-mounted")).toBe(true);
      const status = element.querySelector('[role="status"]');
      expect(status).not.toBeNull();
      expect(status?.childNodes).toHaveLength(0);
      expect(status?.parentElement).toBe(element);
    }
  });

  it("CA-01: a second mountAll leaves a single form and mounts nothing", async () => {
    const { mountAll } = await loadMount();
    const element = host("lead");
    mountAll(leadDefinition);
    const first = element.querySelector("form");
    expect(mountAll(leadDefinition)).toBe(0);
    expect(element.querySelectorAll("form")).toHaveLength(1);
    expect(element.querySelector("form")).toBe(first);
  });

  it("CA-01: a second evaluation of the module (duplicate script) leaves a single form", async () => {
    const element = host("lead");
    const first = await loadMount();
    first.mountAll(leadDefinition);
    const form = element.querySelector("form");
    const second = await loadMount();
    expect(second.mountAll(leadDefinition)).toBe(0);
    expect(element.querySelectorAll("form")).toHaveLength(1);
    expect(element.querySelector("form")).toBe(form);
  });

  it("ignores an unknown container through mountAll, mount() and a late insert, silently", async () => {
    const { mountAll, observe } = await loadMount();
    const early = host("desconocido");
    expect(() => mountAll(leadDefinition)).not.toThrow();
    track(observe(leadDefinition));
    window.atfxLeadkit?.mount();
    const late = lateHost("desconocido");
    await flush();
    for (const element of [early, late]) {
      expect(element.childNodes).toHaveLength(0);
      expect(element.hasAttribute("data-atfx-mounted")).toBe(false);
    }
    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("ignores containers of another form key", async () => {
    const { mountAll } = await loadMount();
    const other = host("interest");
    expect(mountAll(leadDefinition)).toBe(0);
    expect(other.childNodes).toHaveLength(0);
  });

  it("treats a root that is itself a container as a match", async () => {
    const { mountAll } = await loadMount();
    const element = host("lead");
    expect(mountAll(leadDefinition, element)).toBe(1);
    expect(element.querySelectorAll("form")).toHaveLength(1);
  });

  it("marks the container before rendering and keeps mounting the rest when one throws", async () => {
    const { mountAll } = await loadMount();
    const broken = host("lead");
    Object.defineProperty(broken, "dataset", {
      get() {
        throw new Error("boom");
      },
    });
    const healthy = host("lead");
    expect(mountAll(leadDefinition)).toBe(1);
    expect(broken.hasAttribute("data-atfx-mounted")).toBe(true);
    expect(broken.querySelector("form")).toBeNull();
    expect(healthy.querySelectorAll("form")).toHaveLength(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("CA-03: two instances have no repeated ids and each label points into its own form", async () => {
    const { mountAll } = await loadMount();
    host("lead");
    host("lead");
    mountAll(leadDefinition);
    const all = ids();
    expect(new Set(all).size).toBe(all.length);
    for (const form of document.querySelectorAll("form")) {
      for (const label of form.querySelectorAll<HTMLLabelElement>("label[for]")) {
        expect(form.querySelector(`#${label.htmlFor}`)).not.toBeNull();
      }
    }
  });

  it("derives instance ids from a counter and the key", async () => {
    const { mountAll } = await loadMount();
    host("lead");
    host("lead");
    mountAll(leadDefinition);
    expect(ids()).toContain("atfx-firstName-lead-1");
    expect(ids()).toContain("atfx-firstName-lead-2");
  });

  it("skips ids already used by another copy of the bundle", async () => {
    const first = await loadMount();
    host("lead");
    first.mountAll(leadDefinition);
    const second = await loadMount();
    host("lead");
    expect(second.mountAll(leadDefinition)).toBe(1);
    const all = ids();
    expect(new Set(all).size).toBe(all.length);
    expect(all).toContain("atfx-firstName-lead-2");
  });

  it("remounts a clone of a mounted container so its form has a listener", async () => {
    const { mountAll } = await loadMount();
    const original = host("lead");
    mountAll(leadDefinition);
    const clone = original.cloneNode(true) as HTMLElement;
    document.body.append(clone);
    expect(mountAll(leadDefinition)).toBe(1);
    expect(clone.querySelectorAll("form")).toHaveLength(1);
    const submit = new Event("submit", { cancelable: true, bubbles: true });
    clone.querySelector("form")?.dispatchEvent(submit);
    expect(submit.defaultPrevented).toBe(true);
    const all = ids();
    expect(new Set(all).size).toBe(all.length);
  });

  it("does not remount a container mounted by another copy of the bundle", async () => {
    const element = host("lead");
    const first = await loadMount();
    first.mountAll(leadDefinition);
    const form = element.querySelector("form");
    const second = await loadMount();
    second.mountAll(leadDefinition);
    expect(element.querySelector("form")).toBe(form);
  });
});

describe("safeMount cleanup", () => {
  it("empties a host that already had children when mounting fails, and the next host still mounts", async () => {
    const { mountAll } = await loadMountFailingFirstBind();
    const broken = host("lead");
    broken.append(document.createElement("p"), document.createElement("form"));
    const healthy = host("lead");
    expect(mountAll(leadDefinition)).toBe(1);
    expect(broken.childNodes).toHaveLength(0);
    expect(healthy.querySelectorAll("form")).toHaveLength(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});

describe("existing window.atfxLeadkit of unexpected shape", () => {
  const WARNING = "[atfx-leadkit] unexpected window.atfxLeadkit; not mounting";

  function install(fake: unknown): void {
    (window as unknown as { atfxLeadkit: unknown }).atfxLeadkit = fake;
  }

  it("fails closed without forms: mountAll and observe mount nothing, do not throw, warn with fixed text", async () => {
    const register = vi.fn(() => true);
    install({ register, secret: "token-123" });
    const { mountAll, observe } = await loadMount();
    const early = host("lead");
    expect(() => mountAll(leadDefinition)).not.toThrow();
    const observeSpy = vi.spyOn(MutationObserver.prototype, "observe");
    expect(() => track(observe(leadDefinition))).not.toThrow();
    const late = lateHost("lead");
    await flush();
    expect(early.childNodes).toHaveLength(0);
    expect(late.childNodes).toHaveLength(0);
    expect(observeSpy).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(WARNING);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("fails closed when register is not a function", async () => {
    install({ forms: new WeakSet<HTMLFormElement>(), register: "nope" });
    const { mountAll } = await loadMount();
    const element = host("lead");
    expect(mountAll(leadDefinition)).toBe(0);
    expect(element.childNodes).toHaveLength(0);
    expect(console.warn).toHaveBeenCalledWith(WARNING);
  });

  it("fails closed when forms is not a WeakSet", async () => {
    install({ forms: { has: () => true, add: () => undefined }, register: () => true });
    const { mountAll } = await loadMount();
    const element = host("lead");
    expect(mountAll(leadDefinition)).toBe(0);
    expect(element.childNodes).toHaveLength(0);
  });

  it("a forms.has that always answers true cannot leave a clone with an unbound form", async () => {
    const { mountAll } = await loadMount();
    const original = host("lead");
    mountAll(leadDefinition);
    const forms = window.atfxLeadkit?.forms as WeakSet<HTMLFormElement>;
    forms.has = () => true;
    const clone = original.cloneNode(true) as HTMLElement;
    document.body.append(clone);
    mountAll(leadDefinition);
    const submit = new Event("submit", { cancelable: true, bubbles: true });
    for (const form of clone.querySelectorAll("form")) form.dispatchEvent(submit);
    expect(clone.querySelectorAll("form").length === 0 || submit.defaultPrevented).toBe(true);
  });

  it("a Proxy standing in for the WeakSet is rejected", async () => {
    install({ forms: new Proxy(new WeakSet<HTMLFormElement>(), {}), register: () => true });
    const { mountAll } = await loadMount();
    const element = host("lead");
    expect(() => mountAll(leadDefinition)).not.toThrow();
    expect(element.childNodes).toHaveLength(0);
  });
});

describe("closed placeholder", () => {
  it("renders no form and the dictionary text when the schedule is invalid", async () => {
    const { mountAll } = await loadMount();
    const element = host("lead", { "data-opens-at": "nonsense" });
    mountAll(leadDefinition);
    expect(element.querySelector("form")).toBeNull();
    const status = element.querySelector('[role="status"]');
    expect(status?.textContent).toBe(resolveDict("es").errors.generic);
    expect(element.hasAttribute("data-atfx-mounted")).toBe(true);
  });

  it("uses the language of the container", async () => {
    const { mountAll } = await loadMount();
    const element = host("lead", { "data-opens-at": "nonsense", "data-lang": "en" });
    mountAll(leadDefinition);
    expect(element.querySelector('[role="status"]')?.textContent).toBe(resolveDict("en").errors.generic);
  });

  it("does not remount a closed container on a second pass", async () => {
    const { mountAll } = await loadMount();
    host("lead", { "data-opens-at": "nonsense" });
    mountAll(leadDefinition);
    expect(mountAll(leadDefinition)).toBe(0);
  });
});

describe("scheduleState", () => {
  const base = { scheduleInvalid: false, opensAt: null, closesAt: null };

  it("is open when the dates parsed fine", () => {
    expect(scheduleState(base as never, 0)).toBe("open");
  });

  it("fails closed when a date was present but invalid", () => {
    expect(scheduleState({ ...base, scheduleInvalid: true } as never, 0)).toBe("invalid");
  });
});

describe("observe", () => {
  it("CA-02: a container inserted later is mounted after a microtask, without calling anything", async () => {
    const { observe } = await loadMount();
    track(observe(leadDefinition));
    const late = document.createElement("div");
    late.setAttribute("data-atfx-leadkit", "lead");
    document.body.append(late);
    await flush();
    expect(late.querySelectorAll("form")).toHaveLength(1);
  });

  it("mounts a container nested inside a node inserted later", async () => {
    const { observe } = await loadMount();
    track(observe(leadDefinition));
    const wrapper = document.createElement("div");
    const inner = document.createElement("section");
    const late = document.createElement("div");
    late.setAttribute("data-atfx-leadkit", "lead");
    inner.append(late);
    wrapper.append(inner);
    document.body.append(wrapper);
    await flush();
    expect(late.querySelectorAll("form")).toHaveLength(1);
  });

  it("mounts containers present at start and does not remount them on later mutations", async () => {
    const { observe } = await loadMount();
    const early = host("lead");
    track(observe(leadDefinition));
    expect(early.querySelectorAll("form")).toHaveLength(1);
    document.body.append(document.createElement("p"));
    await flush();
    expect(early.querySelectorAll("form")).toHaveLength(1);
  });

  it("a text node in the same tick as a live container raises no error and the container still mounts", async () => {
    const { observe } = await loadMount();
    track(observe(leadDefinition));
    // jsdom reports an observer callback exception as a window error event instead of throwing.
    const escaped = vi.fn();
    window.addEventListener("error", escaped);
    document.body.append(document.createTextNode("hola"));
    const live = document.createElement("div");
    live.setAttribute("data-atfx-leadkit", "lead");
    document.body.append(live);
    await flush();
    window.removeEventListener("error", escaped);
    expect(escaped).not.toHaveBeenCalled();
    expect(live.querySelectorAll("form")).toHaveLength(1);
  });

  it("does not mount a container removed before the callback runs", async () => {
    const { observe } = await loadMount();
    track(observe(leadDefinition));
    const gone = document.createElement("div");
    gone.setAttribute("data-atfx-leadkit", "lead");
    document.body.append(gone);
    gone.remove();
    await flush();
    expect(gone.childNodes).toHaveLength(0);
    expect(gone.hasAttribute("data-atfx-mounted")).toBe(false);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("CA-01: two live observers from duplicate scripts mount a late container once, with unique ids", async () => {
    const first = await loadMount();
    track(first.observe(leadDefinition));
    const second = await loadMount();
    track(second.observe(leadDefinition));
    const late = lateHost("lead");
    const render = vi.spyOn(late, "replaceChildren");
    await flush();
    expect(late.querySelectorAll("form")).toHaveLength(1);
    expect(render).toHaveBeenCalledTimes(1);
    const all = ids();
    expect(new Set(all).size).toBe(all.length);
  });

  it("CA-01: a duplicate script's initial scan does not remount a container the first one mounted", async () => {
    const early = host("lead");
    const first = await loadMount();
    track(first.observe(leadDefinition));
    const form = early.querySelector("form");
    const second = await loadMount();
    track(second.observe(leadDefinition));
    expect(early.querySelectorAll("form")).toHaveLength(1);
    expect(early.querySelector("form")).toBe(form);
    const all = ids();
    expect(new Set(all).size).toBe(all.length);
  });

  it("prints the version for a late container with data-debug", async () => {
    const { observe } = await loadMount("5.0.0");
    track(observe(leadDefinition));
    expect(console.info).not.toHaveBeenCalled();
    lateHost("lead", { "data-debug": "" });
    await flush();
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.info).mock.calls[0]?.join(" ")).toContain("5.0.0");
  });

  it("does not observe nor throw when the document has no body", async () => {
    const { observe } = await loadMount();
    const bodySpy = vi.spyOn(document, "body", "get").mockReturnValue(null as never);
    const observeSpy = vi.spyOn(MutationObserver.prototype, "observe");
    try {
      expect(() => track(observe(leadDefinition))).not.toThrow();
      expect(observeSpy).not.toHaveBeenCalled();
    } finally {
      // afterEach touches document.body, so the getter must be real again before it runs.
      bodySpy.mockRestore();
    }
  });

  it("remounts a clone inserted later", async () => {
    const { observe } = await loadMount();
    const original = host("lead");
    track(observe(leadDefinition));
    const clone = original.cloneNode(true) as HTMLElement;
    document.body.append(clone);
    await flush();
    const submit = new Event("submit", { cancelable: true, bubbles: true });
    clone.querySelector("form")?.dispatchEvent(submit);
    expect(clone.querySelectorAll("form")).toHaveLength(1);
    expect(submit.defaultPrevented).toBe(true);
  });

  it("registers the observer before the first scan and returns a disconnect", async () => {
    const { observe } = await loadMount();
    const element = host("lead");
    const seen: boolean[] = [];
    const real = MutationObserver.prototype.observe;
    const observeSpy = vi.spyOn(MutationObserver.prototype, "observe").mockImplementation(function (
      this: MutationObserver,
      target: Node,
      options?: MutationObserverInit,
    ) {
      seen.push(element.hasAttribute("data-atfx-mounted"));
      return real.call(this, target, options);
    });
    const disconnectSpy = vi.spyOn(MutationObserver.prototype, "disconnect");
    const stop = observe(leadDefinition);
    expect(observeSpy).toHaveBeenCalledWith(document.body, { childList: true, subtree: true });
    expect(seen).toEqual([false]);
    expect(element.querySelectorAll("form")).toHaveLength(1);
    stop();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("stops mounting after disconnect", async () => {
    const { observe } = await loadMount();
    const stop = observe(leadDefinition);
    stop();
    const late = host("lead");
    await flush();
    expect(late.querySelector("form")).toBeNull();
  });

  it("waits for DOMContentLoaded while the document is loading and never observes a null body", async () => {
    const { observe } = await loadMount();
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    const observeSpy = vi.spyOn(MutationObserver.prototype, "observe");
    const element = host("lead");
    track(observe(leadDefinition));
    expect(observeSpy).not.toHaveBeenCalled();
    expect(element.querySelector("form")).toBeNull();
    document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(observeSpy).toHaveBeenCalledTimes(1);
    expect(element.querySelectorAll("form")).toHaveLength(1);
  });

  it("a disconnect before DOMContentLoaded cancels the start", async () => {
    const { observe } = await loadMount();
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    const element = host("lead");
    observe(leadDefinition)();
    document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(element.querySelector("form")).toBeNull();
  });

  it("starts immediately when the document is already parsed", async () => {
    const { observe } = await loadMount();
    const element = host("lead");
    track(observe(leadDefinition));
    expect(element.querySelectorAll("form")).toHaveLength(1);
  });
});

describe("window.atfxLeadkit", () => {
  it("lead and interest share one global, each bundle mounts only its key, mount() mounts both", async () => {
    const leadBundle = await loadMount("1.0.0");
    track(leadBundle.observe(leadDefinition));
    const shared = window.atfxLeadkit;
    const interestBundle = await loadMount("2.0.0");
    track(interestBundle.observe(interestDefinition));
    expect(window.atfxLeadkit).toBe(shared);
    expect(window.atfxLeadkit?.versions).toEqual({ lead: "1.0.0", interest: "2.0.0" });

    const l = host("lead");
    const i = host("interest");
    await flush();
    expect(l.querySelectorAll("form")).toHaveLength(1);
    expect(i.querySelectorAll("form")).toHaveLength(1);

    const l2 = host("lead");
    const i2 = host("interest");
    window.atfxLeadkit?.mount();
    expect(l2.querySelectorAll("form")).toHaveLength(1);
    expect(i2.querySelectorAll("form")).toHaveLength(1);
  });

  it("mount(root) only scans the given subtree", async () => {
    const { observe } = await loadMount();
    observe(leadDefinition)();
    const outside = host("lead");
    const subtree = document.createElement("section");
    const inside = document.createElement("div");
    inside.setAttribute("data-atfx-leadkit", "lead");
    subtree.append(inside);
    document.body.append(subtree);
    window.atfxLeadkit?.mount(subtree);
    expect(inside.querySelectorAll("form")).toHaveLength(1);
    expect(outside.querySelector("form")).toBeNull();
  });

  it("re-running an entry keeps the same object and the first registration", async () => {
    const first = await loadMount("1.0.0");
    track(first.observe(leadDefinition));
    const shared = window.atfxLeadkit;
    const second = await loadMount("2.0.0");
    track(second.observe(leadDefinition));
    expect(window.atfxLeadkit).toBe(shared);
    expect(window.atfxLeadkit?.versions).toEqual({ lead: "1.0.0" });
  });

  it("falls back to a placeholder version when the build did not define one", async () => {
    vi.resetModules();
    vi.stubGlobal("__LEADKIT_VERSION__", undefined);
    const { observe } = await import("./mount");
    track(observe(leadDefinition));
    expect(window.atfxLeadkit?.versions.lead).toBe("dev");
  });
});

describe("debug", () => {
  it("prints the version only when a container has data-debug", async () => {
    const { mountAll } = await loadMount("3.1.4");
    host("lead");
    mountAll(leadDefinition);
    expect(console.info).not.toHaveBeenCalled();
    host("lead", { "data-debug": "" });
    mountAll(leadDefinition);
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.info).mock.calls[0]?.join(" ")).toContain("3.1.4");
  });
});

describe("definitions", () => {
  it("are keyed by form", () => {
    const keys = [leadDefinition, interestDefinition].map((definition: FormDefinition) => definition.key);
    expect(keys).toEqual(["lead", "interest"]);
  });
});
