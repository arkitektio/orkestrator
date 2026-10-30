// @vitest-environment jsdom
import { _roots, act, createRoot, extend } from "@react-three/fiber";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `<Canvas>` does this for the app; a bare root has to.
extend(THREE as never);

/**
 * What the demand canvases count on from R3F itself, against the real
 * reconciler: a tree change asks for its own frame. Before 9.8.2 a removal did
 * not (`removeChild` unlinked the child, then `invalidateInstance` bailed on the
 * missing parent), so hiding a layer or deleting a shape stayed on the canvas
 * until something unrelated drew (P33, `ARCHITECTURE.md`).
 */

/** Just enough renderer for a root to configure itself against. */
const stubRenderer = () => ({
  render: vi.fn(),
  setSize: vi.fn(),
  setPixelRatio: vi.fn(),
  dispose: vi.fn(),
  domElement: document.createElement("canvas"),
});

const SIZE = { width: 100, height: 100, top: 0, left: 0 };

const mountRoot = async (tree: React.ReactNode) => {
  const canvas = document.createElement("canvas");
  const root = createRoot(canvas);
  await act(async () => {
    await root.configure({ gl: stubRenderer() as never, frameloop: "demand", size: SIZE });
    root.render(tree);
  });
  // The live store: the root replaces its `internal` object as it starts up.
  const internal = () => _roots.get(canvas)!.store.getState().internal;
  // The loop would have drawn the mount by now and gone idle.
  internal().frames = 0;
  return {
    root,
    frames: () => internal().frames,
    settle: () => {
      internal().frames = 0;
    },
    unmount: () => act(async () => void root.unmount()),
  };
};

describe("a demand canvas's tree changes ask for a frame", () => {
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    // The loop itself stays parked: only the request is under test.
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 0));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("removing an object", async () => {
    const { root, frames, unmount } = await mountRoot(
      <group>
        <mesh />
      </group>,
    );
    await act(async () => root.render(<group />));
    expect(frames()).toBeGreaterThan(0);
    await unmount();
  });

  it("removing a whole subtree", async () => {
    const { root, frames, unmount } = await mountRoot(
      <group>
        <group>
          <mesh />
          <mesh />
        </group>
      </group>,
    );
    await act(async () => root.render(<group />));
    expect(frames()).toBeGreaterThan(0);
    await unmount();
  });

  it("adding an object and changing a prop", async () => {
    const { root, frames, settle, unmount } = await mountRoot(<group />);
    await act(async () =>
      root.render(
        <group>
          <mesh />
        </group>,
      ),
    );
    expect(frames()).toBeGreaterThan(0);

    settle();
    await act(async () =>
      root.render(
        <group>
          <mesh visible={false} />
        </group>,
      ),
    );
    expect(frames()).toBeGreaterThan(0);
    await unmount();
  });
});
