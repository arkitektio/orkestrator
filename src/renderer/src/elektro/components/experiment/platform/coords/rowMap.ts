/**
 * The affine map from a value to world y inside a row band:
 * `y = scale · value + offset`.
 *
 * It is the object matrix a trace line sets (so a relayout or a clim change is a
 * matrix write, not a repack), the map the stacking rules produce bands for, and
 * the inverse the probe reads a value back through. In `platform/coords` because
 * all three of those live in different features and none may import another.
 *
 * Pure — runs in node.
 */
export const valueToY = (
  band: { bottom: number; top: number },
  clim: { lo: number; hi: number },
): { scale: number; offset: number } => {
  const span = clim.hi - clim.lo || 1;
  const scale = (band.top - band.bottom) / span;
  return { scale, offset: band.bottom - clim.lo * scale };
};

/**
 * The inverse: the value a world y reads as inside a band. How a shape drawn over
 * a row turns the pointer's height back into the recording's units.
 */
export const yToValue = (
  y: number,
  band: { bottom: number; top: number },
  clim: { lo: number; hi: number },
): number => {
  const { scale, offset } = valueToY(band, clim);
  return scale === 0 ? clim.lo : (y - offset) / scale;
};
