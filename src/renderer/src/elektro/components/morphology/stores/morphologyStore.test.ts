// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createMorphologyStore } from "./morphologyStore";

const panel = (sectionId: string) => ({ sectionId, position: [0, 0, 0] as [number, number, number] });

describe("morphologyStore panels", () => {
  it("toggleExclusive shows one panel, and closes it when it is the only one", () => {
    const store = createMorphologyStore();
    store.getState().togglePanel(panel("a"));
    store.getState().togglePanel(panel("b"));
    expect(Object.keys(store.getState().panels)).toEqual(["a", "b"]);

    store.getState().toggleExclusive(panel("b"));
    expect(Object.keys(store.getState().panels)).toEqual(["b"]);

    store.getState().toggleExclusive(panel("b"));
    expect(store.getState().panels).toEqual({});
  });

  it("togglePanel stacks and unstacks", () => {
    const store = createMorphologyStore();
    store.getState().togglePanel(panel("a"));
    store.getState().togglePanel(panel("a"));
    expect(store.getState().panels).toEqual({});
  });

  it("does not notify for a no-op hover or close-all", () => {
    const store = createMorphologyStore();
    let notified = 0;
    store.subscribe(() => notified++);
    store.getState().setHovered(null);
    store.getState().closeAll();
    expect(notified).toBe(0);
  });
});

describe("morphologyStore settings", () => {
  it("patches layer settings without dropping the rest", () => {
    const store = createMorphologyStore();
    store.getState().setMorphology({ colorBy: "importance" });
    store.getState().setMorphology({ radiusScale: 2 });
    expect(store.getState().morphology).toMatchObject({
      colorBy: "importance",
      radiusScale: 2,
      visible: true,
    });
  });

  it("remembers the display mode", () => {
    const store = createMorphologyStore();
    store.getState().setDisplayMode("Tree");
    expect(window.localStorage.getItem("elektro.neuronmodel.displayMode")).toBe("Tree");
  });
});
