import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  VOLUME_POST_DEFAULTS,
  VOLUME_POST_RANGES,
  buildVolumeCompositeNode,
  isPostInert,
  updateVolumePostUniforms,
  type VolumePostSettings,
} from "./volumePost";

/**
 * These pin the settings logic AND — the reason this file earns its keep —
 * prove that the `three/examples/jsm/tsl/display/BloomNode.js` specifier
 * actually resolves and that the node graph BUILDS. It cannot prove the graph
 * compiles to valid WGSL: that needs a real device, and vitest runs node/jsdom.
 */

const inert: VolumePostSettings = {
  bloomStrength: 0,
  bloomRadius: 0.4,
  bloomThreshold: 0.5,
  saturation: 1,
  vibrance: 0,
  vignette: 0,
};

describe("isPostInert", () => {
  it("is inert when every effect is neutral", () => {
    expect(isPostInert(inert)).toBe(true);
  });

  it("ignores bloom radius and threshold — they do nothing at strength 0", () => {
    expect(isPostInert({ ...inert, bloomRadius: 1, bloomThreshold: 0 })).toBe(true);
  });

  it.each([
    ["bloom", { bloomStrength: 0.3 }],
    ["saturation", { saturation: 1.4 }],
    ["desaturation", { saturation: 0 }],
    ["vibrance", { vibrance: 0.5 }],
    ["negative vibrance", { vibrance: -0.5 }],
    ["vignette", { vignette: 0.3 }],
  ])("is active for %s", (_label, patch) => {
    expect(isPostInert({ ...inert, ...patch })).toBe(false);
  });

  it("the shipped defaults are ACTIVE — turning cinematic on must visibly do something", () => {
    expect(isPostInert(VOLUME_POST_DEFAULTS)).toBe(false);
  });
});

describe("VOLUME_POST_RANGES", () => {
  it("covers every setting", () => {
    expect(Object.keys(VOLUME_POST_RANGES).sort()).toEqual(
      Object.keys(VOLUME_POST_DEFAULTS).sort(),
    );
  });

  it("contains every default within its own slider bounds", () => {
    for (const [key, range] of Object.entries(VOLUME_POST_RANGES)) {
      const value = VOLUME_POST_DEFAULTS[key as keyof VolumePostSettings];
      expect(value, key).toBeGreaterThanOrEqual(range.min);
      expect(value, key).toBeLessThanOrEqual(range.max);
    }
  });

  it("leaves saturation and vibrance able to reach their neutral values", () => {
    // A grading slider you cannot return to neutral is a trap.
    expect(VOLUME_POST_RANGES.saturation.min).toBeLessThanOrEqual(1);
    expect(VOLUME_POST_RANGES.saturation.max).toBeGreaterThanOrEqual(1);
    expect(VOLUME_POST_RANGES.vibrance.min).toBeLessThanOrEqual(0);
    expect(VOLUME_POST_RANGES.vibrance.max).toBeGreaterThanOrEqual(0);
  });
});

describe("buildVolumeCompositeNode", () => {
  const map = () => new THREE.Texture();

  it("returns a bare passthrough in SCIENTIFIC mode, with nothing to dispose", () => {
    // The bit-for-bit-unchanged path: no bloom node is constructed at all, so
    // the frame pays literally nothing.
    const handle = buildVolumeCompositeNode(map(), null);
    expect(handle.colorNode).toBeDefined();
    expect(handle.uniforms).toBeNull();
    expect(() => handle.dispose()).not.toThrow();
  });

  it("returns a passthrough for inert settings too", () => {
    expect(buildVolumeCompositeNode(map(), inert).uniforms).toBeNull();
  });

  it("BUILDS the bloom chain — proving the addon specifier resolves", () => {
    // If `three/examples/jsm/tsl/display/BloomNode.js` ever stops resolving, or
    // `bloom()`'s signature changes, this fails at import/construction time
    // rather than as a blank viewport on someone's machine.
    const handle = buildVolumeCompositeNode(map(), VOLUME_POST_DEFAULTS);
    expect(handle.colorNode).toBeDefined();
    expect(handle.uniforms).not.toBeNull();
    handle.dispose();
  });

  it("exposes BloomNode's own uniform nodes, so slider drags need no rebuild", () => {
    const handle = buildVolumeCompositeNode(map(), VOLUME_POST_DEFAULTS);
    const u = handle.uniforms!;
    expect(u.bloomStrength.value).toBeCloseTo(VOLUME_POST_DEFAULTS.bloomStrength);
    expect(u.bloomRadius.value).toBeCloseTo(VOLUME_POST_DEFAULTS.bloomRadius);
    expect(u.bloomThreshold.value).toBeCloseTo(VOLUME_POST_DEFAULTS.bloomThreshold);

    updateVolumePostUniforms(handle, { ...VOLUME_POST_DEFAULTS, bloomStrength: 1.25, vignette: 0.4 });
    expect(u.bloomStrength.value).toBeCloseTo(1.25);
    expect(u.vignette.value).toBeCloseTo(0.4);
    handle.dispose();
  });

  it("updating a passthrough chain is a no-op, not a crash", () => {
    const handle = buildVolumeCompositeNode(map(), null);
    expect(() => updateVolumePostUniforms(handle, VOLUME_POST_DEFAULTS)).not.toThrow();
  });

  /**
   * REGRESSION GUARD for the "glow is offset from the volume" bug.
   *
   * `screenUV` must not appear in the ACTIVE chain. It is
   * `screenCoordinate / screenSize`, and `screenSize` is a module-level shared
   * uniform that `BloomNode.updateBefore` repoints at each mip target before
   * this quad draws (`RendererUtils.restoreRendererState` restores renderer
   * state, not node uniforms). `screenCoordinate` additionally applies a Y flip
   * only when `builder.isFlipY()`, which differs between the canvas pass and
   * the bloom's offscreen passes. Either one misaligns the glow.
   */
  describe("no ScreenNode in the active chain", () => {
    const nodeTypesOf = (root: any): Set<string> => {
      const seen = new Set<string>();
      const visit = (n: any, depth: number) => {
        if (!n || typeof n !== "object" || depth > 40) return;
        const name = n?.constructor?.name;
        if (typeof name === "string") {
          if (seen.has(`${name}#${n.uuid ?? ""}`)) return;
          seen.add(`${name}#${n.uuid ?? ""}`);
        }
        if (typeof n.getChildren === "function") {
          for (const child of n.getChildren()) visit(child, depth + 1);
        }
      };
      visit(root, 0);
      return new Set([...seen].map((k) => k.split("#")[0]));
    };

    it("the traversal actually walks the graph (guards this guard)", () => {
      // A traversal that silently finds nothing would make the assertion below
      // pass for the wrong reason.
      const handle = buildVolumeCompositeNode(map(), VOLUME_POST_DEFAULTS);
      const types = nodeTypesOf(handle.colorNode);
      expect(types.size).toBeGreaterThan(3);
      expect([...types].some((t) => t.includes("Texture"))).toBe(true);
      handle.dispose();
    });

    it("contains no ScreenNode", () => {
      const handle = buildVolumeCompositeNode(map(), VOLUME_POST_DEFAULTS);
      const types = nodeTypesOf(handle.colorNode);
      expect([...types].filter((t) => t === "ScreenNode")).toEqual([]);
      handle.dispose();
    });
  });
});
