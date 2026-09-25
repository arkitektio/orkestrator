/**
 * constants.ts — every number that both renderers have to agree on.
 *
 * A mark is drawn twice: live, through `<MarkCanvas>` on the app detail page,
 * and offscreen, through a bare `THREE.WebGLRenderer` for the list icons. If the
 * framing, the lighting rig or the extras' radii live in only one of those two
 * paths, the grid icon and the detail hero quietly stop being the same picture.
 * They all live here instead, and nothing else defines them.
 *
 * Three-free on purpose, like `hash.ts`: the cache key reads
 * `MARK_SPEC_VERSION`, and the cache must not pull `three` into the static
 * import graph.
 */

/**
 * The symbol is a unit sphere; this is the only framing constant. Fixed, not
 * fitted per mark — fitting each group to its own bounds lets an added element
 * shrink the plate, and the set stops looking like a set.
 */
export const MARK_SCALE = 0.74;
export const MARK_SCALE_SIMPLE = 0.86;

export const PLATE_DEPTH = 0.3;
export const PLATE_BEVEL = 0.075;

/** Where the letter's back face sits, just clear of the plate's front bevel. */
export const LETTER_Z = PLATE_DEPTH / 2 + PLATE_BEVEL + 0.02;

/** Extras orbit outside the outline, so they never cover the letter. */
export const ORBIT = 1.21;
export const STUD_R = 1.07;
export const SPIKE_R = 1.09;
export const EXTRA_Z = 0.06;

/**
 * The camera. A long focal length and a fixed 3/4 view are what make a mark
 * read as an icon rather than as a scene.
 *
 * `target` matters more than it looks: R3F points its default camera at the
 * origin after applying the `camera` prop, and a bare `PerspectiveCamera` does
 * not. Miss it offscreen and every list icon is framed differently from the
 * live one.
 */
export const MARK_CAMERA = {
  fov: 17,
  position: [0.55, 0.85, 7.4] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
  near: 0.1,
  far: 100,
};

/** The lighting rig, shared by `<MarkStudio>` and the offscreen scene. */
export const KEY_LIGHT = {
  position: [1.6, 2.6, 3.4] as [number, number, number],
  intensity: 1.5,
  color: "#ffffff",
};
export const FILL_LIGHT = {
  position: [-2.4, 0.8, -1.6] as [number, number, number],
  intensity: 0.75,
  color: "#c6d8ff",
};
export const AMBIENT_LIGHT = { intensity: 0.3 };

/** Roughness / metalness / envMapIntensity per material role. */
export const MATERIAL = {
  base: { roughness: 0.46, metalness: 0, envMapIntensity: 0.95 },
  accent: { roughness: 0.34, metalness: 0, envMapIntensity: 0.95 },
  ink: { roughness: 0.36, metalness: 0, envMapIntensity: 0.95 },
};

/**
 * The spec these marks were fitted against. Duplicated from `mark-spec.json` as
 * a plain literal so the cache key can be built without loading the spec;
 * `spec.test.ts` asserts the two agree.
 *
 * It is part of the cache key because refitting the anchors changes every mark.
 */
export const MARK_SPEC_VERSION = "4.0.0";
