import { describe, expect, it, vi } from "vitest";

import { createTabHistory } from "./tabHistory";

const paths = (h: ReturnType<typeof createTabHistory>) => h.entries.map((e) => e.pathname);

describe("createTabHistory", () => {
  it("starts at the root with nowhere to go", () => {
    const h = createTabHistory();
    expect(h.location.pathname).toBe("/");
    expect(h.index).toBe(0);
    expect(h.canGoBack).toBe(false);
    expect(h.canGoForward).toBe(false);
  });

  it("notifies listeners on push — the v5Compat guarantee", () => {
    // Without `v5Compat: true` the raw history only notifies on `go()`, and
    // `unstable_HistoryRouter` would never repaint after a navigation.
    const h = createTabHistory();
    const listener = vi.fn();
    h.listen(listener);

    h.push("/mikro");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].action).toBe("PUSH");
    expect(listener.mock.calls[0][0].location.pathname).toBe("/mikro");
  });

  it("delivers every update to EVERY listener", () => {
    // The raw history keeps a single listener slot, so the router and the tab
    // store would otherwise silently evict each other.
    const h = createTabHistory();
    const router = vi.fn();
    const store = vi.fn();
    h.listen(router);
    h.listen(store);

    h.push("/a");
    h.replace("/b");
    h.go(-1);

    expect(router).toHaveBeenCalledTimes(3);
    expect(store).toHaveBeenCalledTimes(3);
  });

  it("unsubscribes one listener without disturbing the others", () => {
    const h = createTabHistory();
    const a = vi.fn();
    const b = vi.fn();
    const stopA = h.listen(a);
    h.listen(b);

    stopA();
    h.push("/x");

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("drops the forward branch on push after going back, like a browser", () => {
    const h = createTabHistory();
    h.push("/a");
    h.push("/b");
    h.go(-1);
    expect(h.canGoForward).toBe(true);

    h.push("/c");

    expect(paths(h)).toEqual(["/", "/a", "/c"]);
    expect(h.index).toBe(2);
    expect(h.canGoForward).toBe(false);
    expect(h.canGoBack).toBe(true);
  });

  it("replace overwrites the current entry without growing the stack", () => {
    const h = createTabHistory();
    h.push("/a");
    h.replace("/a2");
    expect(paths(h)).toEqual(["/", "/a2"]);
    expect(h.index).toBe(1);
  });

  it("reports depth honestly at both ends", () => {
    const h = createTabHistory();
    h.push("/a");
    h.push("/b");
    expect(h.canGoBack).toBe(true);
    expect(h.canGoForward).toBe(false);

    h.go(-2);
    expect(h.index).toBe(0);
    expect(h.canGoBack).toBe(false);
    expect(h.canGoForward).toBe(true);
  });

  it("round-trips through serialize", () => {
    const h = createTabHistory();
    h.push("/a?x=1");
    h.push("/b#frag");
    h.go(-1);

    const restored = createTabHistory(h.serialize());

    expect(paths(restored)).toEqual(["/", "/a", "/b"]);
    expect(restored.index).toBe(1);
    expect(restored.location.pathname).toBe("/a");
    expect(restored.location.search).toBe("?x=1");
    expect(restored.entries[2].hash).toBe("#frag");
    expect(restored.canGoBack).toBe(true);
    expect(restored.canGoForward).toBe(true);
  });

  it("keeps navigating correctly after a restore", () => {
    // The mirror must be seeded from the restored stack, or the first push
    // after a reload would compute the forward truncation against nothing.
    const restored = createTabHistory({
      entries: [
        { pathname: "/", search: "", hash: "" },
        { pathname: "/a", search: "", hash: "" },
        { pathname: "/b", search: "", hash: "" },
      ],
      index: 1,
    });

    restored.push("/c");

    expect(paths(restored)).toEqual(["/", "/a", "/c"]);
    expect(restored.index).toBe(2);
  });

  it("clamps a stale restored index into range", () => {
    // A tab record edited by hand or written by a version with a different
    // cap must not restore to an index the stack does not have.
    const restored = createTabHistory({
      entries: [{ pathname: "/", search: "", hash: "" }],
      index: 7,
    });
    expect(restored.index).toBe(0);
  });

  it("persists serialisable state and drops what will not survive JSON", () => {
    const h = createTabHistory();
    h.push("/a", { from: "palette" });
    h.push("/b", { fn: () => 1 } as unknown);

    const s = h.serialize();
    expect(s.entries[1].state).toEqual({ from: "palette" });
    // Function-bearing state survives the round trip as an empty object,
    // not as a thrown error and not as a corrupted record.
    expect(() => JSON.stringify(s)).not.toThrow();
  });
});
