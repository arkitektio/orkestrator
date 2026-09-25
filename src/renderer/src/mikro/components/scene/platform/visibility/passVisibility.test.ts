import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  COMPOSITOR_INTERNAL,
  VOLUME_PASS_OBJECT,
  collectPassSets,
  disableColorWrite,
  hideObjects,
} from "./passVisibility";

const taggedMesh = (visible = true): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  mesh.userData[VOLUME_PASS_OBJECT] = true;
  mesh.visible = visible;
  return mesh;
};

const opaqueMesh = (): THREE.Mesh =>
  new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());

const overlayMesh = (): THREE.Mesh => {
  const material = new THREE.MeshBasicMaterial();
  material.transparent = true;
  material.depthWrite = false;
  return new THREE.Mesh(new THREE.BufferGeometry(), material);
};

describe("collectPassSets", () => {
  it("classifies tagged volumes, opaque occluders and overlays; skips invisibles and internals", () => {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    scene.add(group);

    const volume = taggedMesh();
    const hiddenVolume = taggedMesh(false); // merge-group non-primary
    const occluder = opaqueMesh(); // depthWrite, !transparent → occluder
    const overlay = overlayMesh(); // transparent → other
    const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
    const internal = opaqueMesh();
    internal.userData[COMPOSITOR_INTERNAL] = true;
    group.add(volume, hiddenVolume, occluder, overlay, line, internal);

    const sets = collectPassSets(scene);
    expect(sets.volumeMeshes).toEqual([volume]);
    expect(sets.occluders).toEqual([occluder]);
    // Depth-writing LINES are furniture, not prepass occluders (non-triangle
    // topology under the override material is a silent-failure risk).
    expect(sets.otherRenderables).toContain(line);
    expect(sets.otherRenderables).toContain(overlay);
    // Groups are never leaves — ancestors stay untouched.
    expect(sets.occluders).not.toContain(group);
    expect(sets.otherRenderables).not.toContain(group);
    // Internals classify nowhere.
    expect(sets.occluders).not.toContain(internal);
    expect(sets.otherRenderables).not.toContain(internal);
  });

  it("prunes the subtree of an invisible ancestor", () => {
    // How the collection layers hide: the manager flips the GROUP, never the
    // leaves. A leaf the renderer skips must not be classified, or the
    // compositor's structure key cannot see the layer disappear and serves a
    // cached target carrying its stale depth.
    const scene = new THREE.Scene();
    const hiddenGroup = new THREE.Group();
    hiddenGroup.visible = false;
    const volume = taggedMesh();
    const occluder = opaqueMesh();
    const overlay = overlayMesh();
    hiddenGroup.add(volume, occluder, overlay);
    scene.add(hiddenGroup);

    const sets = collectPassSets(scene);
    expect(sets.volumeMeshes).toEqual([]);
    expect(sets.occluders).toEqual([]);
    expect(sets.otherRenderables).toEqual([]);
    // …and the leaves keep their own flags: the walk only reads.
    expect(occluder.visible).toBe(true);
  });

  it("excludes invisible-material opaque meshes from the occluder set", () => {
    const scene = new THREE.Scene();
    const mesh = opaqueMesh();
    (mesh.material as THREE.Material).visible = false;
    scene.add(mesh);
    const sets = collectPassSets(scene);
    expect(sets.occluders).toEqual([]);
    expect(sets.otherRenderables).toEqual([mesh]);
  });
});

describe("hideObjects", () => {
  it("hides only visible objects and restores exactly what it hid", () => {
    const shown = opaqueMesh();
    const alreadyHidden = opaqueMesh();
    alreadyHidden.visible = false;

    const restore = hideObjects([shown, alreadyHidden]);
    expect(shown.visible).toBe(false);
    expect(alreadyHidden.visible).toBe(false);

    restore();
    expect(shown.visible).toBe(true);
    // Pre-hidden objects must NOT be switched on by the restore.
    expect(alreadyHidden.visible).toBe(false);
  });

  it("leaves ancestors alone when hiding leaves", () => {
    const group = new THREE.Group();
    const leaf = opaqueMesh();
    group.add(leaf);
    const restore = hideObjects([leaf]);
    expect(group.visible).toBe(true);
    restore();
    expect(leaf.visible).toBe(true);
  });
});

describe("disableColorWrite", () => {
  it("flips colorWrite off per material and restores prior flags, shared materials once", () => {
    const shared = new THREE.MeshBasicMaterial();
    const own = new THREE.MeshBasicMaterial();
    own.colorWrite = false; // already off for its own reasons
    const a = new THREE.Mesh(new THREE.BufferGeometry(), shared);
    const b = new THREE.Mesh(new THREE.BufferGeometry(), shared);
    const c = new THREE.Mesh(new THREE.BufferGeometry(), own);

    const restore = disableColorWrite([a, b, c]);
    expect(shared.colorWrite).toBe(false);
    expect(own.colorWrite).toBe(false);

    restore();
    expect(shared.colorWrite).toBe(true);
    // A material that was already colorWrite=false must stay that way.
    expect(own.colorWrite).toBe(false);
  });

  it("handles material arrays", () => {
    const m1 = new THREE.MeshBasicMaterial();
    const m2 = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), [m1, m2]);
    const restore = disableColorWrite([mesh]);
    expect(m1.colorWrite).toBe(false);
    expect(m2.colorWrite).toBe(false);
    restore();
    expect(m1.colorWrite).toBe(true);
    expect(m2.colorWrite).toBe(true);
  });
});
