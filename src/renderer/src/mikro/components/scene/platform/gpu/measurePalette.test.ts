import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  disposeMeasurePalette,
  identityPaletteTexture,
  setMeasurePalette,
} from "./measurePalette";

const row = (fill: number, width = 256, nearest = false): THREE.DataTexture => {
  const tex = new THREE.DataTexture(
    new Uint8Array(width * 4).fill(fill),
    width,
    1,
    THREE.RGBAFormat,
  );
  tex.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
  tex.minFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
  return tex;
};

const disposals = (tex: THREE.Texture): { count: number } => {
  const counter = { count: 0 };
  tex.addEventListener("dispose", () => (counter.count += 1));
  return counter;
};

describe("setMeasurePalette", () => {
  it("adopts a same-size row's bytes without changing the bound texture object", () => {
    const identity = identityPaletteTexture();
    const first = row(10);
    const node = { value: identity as THREE.Texture };
    setMeasurePalette(node, identity, first);
    expect(node.value).toBe(first);

    const versionBefore = first.version;
    const second = row(99);
    const secondDisposed = disposals(second);
    setMeasurePalette(node, identity, second);
    // The bind-group invariant: the bound OBJECT survives, only its bytes change.
    expect(node.value).toBe(first);
    expect((first.image.data as Uint8Array)[0]).toBe(99);
    // `needsUpdate` is a setter that bumps `version` — that is the re-upload signal.
    expect(first.version).toBeGreaterThan(versionBefore);
    // The incoming row was consumed.
    expect(secondDisposed.count).toBe(1);
  });

  it("carries the row's filters across an adopt (qualitative NEAREST over continuous LINEAR)", () => {
    const identity = identityPaletteTexture();
    const continuous = row(10, 256, false);
    const node = { value: identity as THREE.Texture };
    setMeasurePalette(node, identity, continuous);

    setMeasurePalette(node, identity, row(20, 256, true));
    expect(node.value).toBe(continuous);
    expect(continuous.magFilter).toBe(THREE.NearestFilter);
    expect(continuous.minFilter).toBe(THREE.NearestFilter);
  });

  it("never disposes or writes the identity; first real row rebinds", () => {
    const identity = identityPaletteTexture();
    const identityDisposed = disposals(identity);
    const node = { value: identity as THREE.Texture };
    const first = row(42);
    setMeasurePalette(node, identity, first);
    expect(node.value).toBe(first);
    expect(identityDisposed.count).toBe(0);
    expect((identity.image.data as Uint8Array)[0]).toBe(255);
  });

  it("null row rebinds the identity and disposes the old row (not the identity)", () => {
    const identity = identityPaletteTexture();
    const identityDisposed = disposals(identity);
    const node = { value: identity as THREE.Texture };
    // null over identity: nothing happens.
    setMeasurePalette(node, identity, null);
    expect(node.value).toBe(identity);
    expect(identityDisposed.count).toBe(0);

    const bound = row(7);
    const boundDisposed = disposals(bound);
    setMeasurePalette(node, identity, bound);
    setMeasurePalette(node, identity, null);
    expect(node.value).toBe(identity);
    expect(boundDisposed.count).toBe(1);
    expect(identityDisposed.count).toBe(0);
  });

  it("rebinding the same row is a no-op", () => {
    const identity = identityPaletteTexture();
    const only = row(5);
    const onlyDisposed = disposals(only);
    const node = { value: identity as THREE.Texture };
    setMeasurePalette(node, identity, only);
    setMeasurePalette(node, identity, only);
    expect(node.value).toBe(only);
    expect(onlyDisposed.count).toBe(0);
  });

  it("size mismatch rebinds and disposes the old non-identity row", () => {
    const identity = identityPaletteTexture();
    const narrow = row(1, 16);
    const narrowDisposed = disposals(narrow);
    const node = { value: identity as THREE.Texture };
    setMeasurePalette(node, identity, narrow);
    const wide = row(2, 256);
    setMeasurePalette(node, identity, wide);
    expect(node.value).toBe(wide);
    expect(narrowDisposed.count).toBe(1);
  });
});

describe("disposeMeasurePalette", () => {
  it("disposes the bound row and the identity exactly once each", () => {
    const identity = identityPaletteTexture();
    const identityDisposed = disposals(identity);
    const bound = row(3);
    const boundDisposed = disposals(bound);
    const node = { value: identity as THREE.Texture };
    setMeasurePalette(node, identity, bound);
    disposeMeasurePalette(node, identity);
    expect(boundDisposed.count).toBe(1);
    expect(identityDisposed.count).toBe(1);
  });

  it("with only the identity bound, disposes just the identity", () => {
    const identity = identityPaletteTexture();
    const identityDisposed = disposals(identity);
    disposeMeasurePalette({ value: identity }, identity);
    expect(identityDisposed.count).toBe(1);
  });
});
