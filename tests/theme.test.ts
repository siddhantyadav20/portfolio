import { describe, expect, it } from "vitest";
import { CHROME, CHROME_ID, THEME_ATTR, THEME_EVENT, THEME_KEY, THEME_SCRIPT, storedChoice } from "@/lib/theme";

describe("storedChoice", () => {
  it("remembers a choice that differs from the device", () => {
    expect(storedChoice("light", "dark")).toBe("light");
    expect(storedChoice("dark", "light")).toBe("dark");
  });

  it("remembers nothing when the choice is what the device asks for, so the site follows it again", () => {
    expect(storedChoice("dark", "dark")).toBeNull();
    expect(storedChoice("light", "light")).toBeNull();
  });
});

/**
 * The pre-paint script, run for real against a page, storage and a device
 * that are just enough to watch it work. It is minified by hand, so this is
 * the only thing that reads it the way a browser does.
 */
function boot({ stored = null, dark = false, storageThrows = false }: { stored?: string | null; dark?: boolean; storageThrows?: boolean }) {
  const attrs: Record<string, string> = {};
  const head: { id?: string; content?: string; remove: () => void }[] = [];
  const store = new Map<string, string>(stored ? [[THEME_KEY, stored]] : []);
  const listeners: ((e: { matches: boolean }) => void)[] = [];
  const events: string[] = [];

  const document = {
    documentElement: { setAttribute: (k: string, v: string) => void (attrs[k] = v) },
    getElementById: (id: string) => head.find((n) => n.id === id) ?? null,
    createElement: () => {
      const node = { id: undefined as string | undefined, content: undefined as string | undefined, name: "", remove: () => void head.splice(head.indexOf(node), 1) };
      return node;
    },
    head: {
      get firstChild() {
        return head[0] ?? null;
      },
      insertBefore: (node: (typeof head)[number]) => void head.unshift(node),
    },
  };
  const localStorage = {
    getItem: (k: string) => {
      if (storageThrows) throw new Error("SecurityError");
      return store.get(k) ?? null;
    },
  };
  const matchMedia = () => ({ matches: dark, addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => void listeners.push(fn) });
  const dispatchEvent = (e: { type: string }) => void events.push(e.type);
  class Event {
    constructor(public type: string) {}
  }

  new Function("document", "localStorage", "matchMedia", "dispatchEvent", "Event", THEME_SCRIPT)(
    document,
    localStorage,
    matchMedia,
    dispatchEvent,
    Event,
  );

  return {
    theme: () => attrs[THEME_ATTR],
    chrome: () => head.filter((n) => n.id === CHROME_ID).map((n) => n.content),
    deviceChanges: (toDark: boolean) => listeners.forEach((fn) => fn({ matches: toDark })),
    store,
    events,
  };
}

describe("the pre-paint script", () => {
  it("follows the device when nothing is stored", () => {
    expect(boot({ dark: true }).theme()).toBe("dark");
    expect(boot({ dark: false }).theme()).toBe("light");
  });

  it("lets a stored choice beat the device", () => {
    const page = boot({ stored: "light", dark: true });
    expect(page.theme()).toBe("light");
    expect(page.chrome()).toEqual([CHROME.light]);
  });

  it("follows the device changing while the page is open, and says so", () => {
    const page = boot({ dark: false });
    page.deviceChanges(true);
    expect(page.theme()).toBe("dark");
    // The chrome meta is replaced, not duplicated.
    expect(page.chrome()).toEqual([CHROME.dark]);
    expect(page.events).toEqual([THEME_EVENT]);
  });

  it("ignores the device changing once a choice is stored", () => {
    const page = boot({ stored: "light", dark: false });
    page.deviceChanges(true);
    expect(page.theme()).toBe("light");
    expect(page.events).toEqual([]);
  });

  it("still follows the device when storage throws, as in a private window", () => {
    expect(boot({ dark: true, storageThrows: true }).theme()).toBe("dark");
  });
});
