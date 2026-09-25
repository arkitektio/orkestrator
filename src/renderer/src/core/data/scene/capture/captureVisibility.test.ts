import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { EXCLUDE_FROM_CAPTURE, hideExcludedFromCapture } from "./captureVisibility";

const tagged = (name: string): THREE.Object3D => {
  const object = new THREE.Object3D();
  object.name = name;
  object.userData[EXCLUDE_FROM_CAPTURE] = true;
  return object;
};

const plain = (name: string): THREE.Object3D => {
  const object = new THREE.Object3D();
  object.name = name;
  return object;
};

describe("hideExcludedFromCapture", () => {
  it("hides tagged objects and leaves the rest of the scene alone", () => {
    const scene = new THREE.Scene();
    const crosshair = tagged("crosshair");
    const data = plain("layer");
    scene.add(crosshair, data);

    hideExcludedFromCapture(scene);

    expect(crosshair.visible).toBe(false);
    expect(data.visible).toBe(true);
  });

  it("restores visibility once the capture is done", () => {
    const scene = new THREE.Scene();
    const crosshair = tagged("crosshair");
    scene.add(crosshair);

    const restore = hideExcludedFromCapture(scene);
    expect(crosshair.visible).toBe(false);
    restore();
    expect(crosshair.visible).toBe(true);
  });

  it("does not switch on something that was already hidden for its own reasons", () => {
    // A toggled-off layer must not reappear because someone took a screenshot.
    const scene = new THREE.Scene();
    const offByChoice = tagged("hidden-grid");
    offByChoice.visible = false;
    scene.add(offByChoice);

    const restore = hideExcludedFromCapture(scene);
    restore();

    expect(offByChoice.visible).toBe(false);
  });

  it("finds tags at any depth, and prunes the tagged object's whole subtree", () => {
    const scene = new THREE.Scene();
    const group = plain("group");
    const crosshair = tagged("crosshair");
    const line = plain("line");
    crosshair.add(line);
    group.add(crosshair);
    scene.add(group);

    const restore = hideExcludedFromCapture(scene);

    expect(crosshair.visible).toBe(false);
    // The child is untouched: three prunes the subtree at the hidden parent, so
    // hiding the child too would only make restoring it harder.
    expect(line.visible).toBe(true);
    expect(group.visible).toBe(true);

    restore();
    expect(crosshair.visible).toBe(true);
  });

  it("is a no-op on a scene with nothing tagged", () => {
    const scene = new THREE.Scene();
    const data = plain("layer");
    scene.add(data);

    hideExcludedFromCapture(scene)();

    expect(data.visible).toBe(true);
  });
});
