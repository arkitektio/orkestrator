// @vitest-environment jsdom
import * as THREE from "three";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type View = {
  viewProjectionMatrix: THREE.Matrix4 | null;
  viewportSize: { width: number; height: number };
  cameraMoving: boolean;
};
const view: { state: View; listeners: Set<() => void> } = {
  state: { viewProjectionMatrix: new THREE.Matrix4(), viewportSize: { width: 1000, height: 600 }, cameraMoving: false },
  listeners: new Set(),
};
vi.mock("../stores/viewStore", () => ({
  useViewStoreApi: () => ({
    getState: () => view.state,
    subscribe: (listener: () => void) => {
      view.listeners.add(listener);
      return () => view.listeners.delete(listener);
    },
  }),
}));

import { FLOAT_CARD_WIDTH, SceneFloat, type FloatAnchor } from "./SceneFloat";
import { FLOAT_GAP_PX } from "./sideAnchor";

const emit = (patch: Partial<View>) =>
  act(() => {
    view.state = { ...view.state, ...patch };
    for (const listener of view.listeners) listener();
  });

const mount = (anchor: FloatAnchor | null, { expanded = true, onDismiss = () => {} } = {}) => {
  const { container } = render(
    <SceneFloat anchor={() => anchor} expanded={expanded} dismissable onDismiss={onDismiss} button={<span>b</span>}>
      <div>body</div>
    </SceneFloat>,
  );
  return container.querySelector<HTMLDivElement>("[data-nonbreaker]")!;
};

afterEach(() => {
  cleanup();
  view.state = { ...view.state, cameraMoving: false };
});

describe("SceneFloat", () => {
  it("sits beside the item's rectangle, right of it", () => {
    const node = mount({ kind: "beside", rect: { minX: 100, maxX: 300, minY: 50, maxY: 150 } });
    expect(node.style.transform).toBe(`translate(${300 + FLOAT_GAP_PX}px, 50px)`);
    expect(node.style.opacity).toBe("1");
  });

  it("decides the side by the card's full width, not the spring's current one", () => {
    // 750 + 16 + a card + the margin overruns 1000: it goes left.
    const node = mount({ kind: "beside", rect: { minX: 500, maxX: 750, minY: 50, maxY: 150 } });
    expect(node.style.transform).toBe(`translate(${500 - FLOAT_GAP_PX - FLOAT_CARD_WIDTH}px, 50px)`);
  });

  it("hides the bare button while the camera moves; an open card follows it", () => {
    const folded = mount({ kind: "point", point: { x: 200, y: 200 } }, { expanded: false });
    emit({ cameraMoving: true });
    expect(folded.style.opacity).toBe("0");
    cleanup();

    const open = mount({ kind: "point", point: { x: 200, y: 200 } });
    emit({ cameraMoving: true });
    expect(open.style.opacity).toBe("1");
  });

  it("hides when the anchor answers nothing", () => {
    expect(mount(null).style.opacity).toBe("0");
  });

  it("closes on Escape and on a press outside, not on a press inside", () => {
    const onDismiss = vi.fn();
    const node = mount({ kind: "point", point: { x: 0, y: 0 } }, { onDismiss });
    fireEvent.pointerDown(node.querySelector("div")!);
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
