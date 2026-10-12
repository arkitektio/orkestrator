import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import { createCropSlice, type CropSlice } from "./cropSlice";
import type { CropBox } from "../../coords/cropBox";

const build = () => createStore<CropSlice>((set) => createCropSlice(set));

const a: CropBox = { min: [0, 0, 0], max: [10, 10, 1] };
const b: CropBox = { min: [0, 0, -2], max: [10, 10, 3] };

describe("crop slice", () => {
  it("does not apply anything while the rectangle is being drawn", () => {
    const store = build();
    store.getState().beginCrop();
    expect(store.getState().cropPhase).toBe("rect");
    expect(store.getState().cropBox).toBeNull();
    store.getState().setCropBox(a); // not in the depth phase
    expect(store.getState().cropBox).toBeNull();
  });

  it("applies the box when the rectangle is fixed, then follows the wheel", () => {
    const store = build();
    store.getState().beginCrop();
    store.getState().fixCropRect(a);
    expect(store.getState().cropPhase).toBe("depth");
    expect(store.getState().cropBox).toBe(a);
    store.getState().setCropBox(b);
    expect(store.getState().cropBox).toBe(b);
    store.getState().commitCrop();
    expect(store.getState().cropPhase).toBe("idle");
    expect(store.getState().cropBox).toBe(b);
  });

  it("keeps the box's identity for a value-equal write", () => {
    const store = build();
    store.getState().beginCrop();
    store.getState().fixCropRect(a);
    store.getState().setCropBox({ min: [0, 0, 0], max: [10, 10, 1] });
    expect(store.getState().cropBox).toBe(a);
  });

  it("restores the previous box on cancel, from either phase", () => {
    const store = build();
    store.getState().beginCrop();
    store.getState().fixCropRect(a);
    store.getState().commitCrop();

    store.getState().beginCrop();
    store.getState().cancelCrop();
    expect(store.getState().cropBox).toBe(a);

    store.getState().beginCrop();
    store.getState().fixCropRect(b);
    store.getState().cancelCrop();
    expect(store.getState().cropBox).toBe(a);
    expect(store.getState().cropPhase).toBe("idle");
  });

  it("clears the box", () => {
    const store = build();
    store.getState().beginCrop();
    store.getState().fixCropRect(a);
    store.getState().clearCrop();
    expect(store.getState().cropBox).toBeNull();
    expect(store.getState().cropPhase).toBe("idle");
  });
});
