/**
 * CPU mirror of the shader's channel-slab ADDRESSING (`emitChannelTap` /
 * `emitTricubicTap` in `brickNodeMaterials.ts`) — keep in lockstep.
 *
 * A slot stores its channel slabs stacked along z, `channelsPerTexel` of them
 * sharing one texel: slab `s` lives `floor(s / cpt)` slab-depths down and in
 * component `s mod cpt` of that texel. With `cpt = 1` (every atlas before
 * rgba8) this is exactly the legacy `z += s · slabDepth`, component 0 (`.r`).
 */
export function atlasTapSlabAddress(
  channelsPerTexel: number,
  slab: number,
  slabDepth: number,
): { zOffset: number; component: number } {
  const cpt = Math.max(1, channelsPerTexel);
  return { zOffset: Math.floor(slab / cpt) * slabDepth, component: slab % cpt };
}

/** The `dot(tap, mask)` selector the shader uses for component `c`. */
export function componentMask(component: number): [number, number, number, number] {
  return [component === 0 ? 1 : 0, component === 1 ? 1 : 0, component === 2 ? 1 : 0, component === 3 ? 1 : 0];
}
