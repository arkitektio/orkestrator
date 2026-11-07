/**
 * The nearest point to the cursor, among up to millions, in O(1)-ish: a uniform
 * grid over the data's extent, each cell holding the indices of its points.
 * Distances are measured in PIXELS, so a scatter stretched along one axis still
 * picks the point that looks nearest.
 *
 * Pure -- runs in node.
 */

export type PointIndex = {
  nearest: (x: number, y: number, pxPerX: number, pxPerY: number, maxPx: number) => number | null;
};

export const buildPointIndex = (xs: ArrayLike<number>, ys: ArrayLike<number>, cellsPerSide = 256): PointIndex => {
  const n = Math.min(xs.length, ys.length);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (!(x1 >= x0) || !(y1 >= y0)) return { nearest: () => null };
  const w = x1 - x0 || 1;
  const h = y1 - y0 || 1;
  const side = cellsPerSide;
  const cellOf = (x: number, y: number) => {
    const cx = Math.min(side - 1, Math.max(0, Math.floor(((x - x0) / w) * side)));
    const cy = Math.min(side - 1, Math.max(0, Math.floor(((y - y0) / h) * side)));
    return [cx, cy] as const;
  };

  // Counting sort into cells: one Int32Array of indices, offsets per cell.
  const counts = new Int32Array(side * side + 1);
  const cellIds = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const [cx, cy] = cellOf(x, y);
    const id = cy * side + cx;
    cellIds[i] = id;
    counts[id + 1]++;
  }
  for (let i = 1; i < counts.length; i++) counts[i] += counts[i - 1];
  const fill = counts.slice(0, side * side);
  const order = new Int32Array(counts[side * side]);
  for (let i = 0; i < n; i++) {
    const id = cellIds[i];
    if (id >= 0) order[fill[id]++] = i;
  }

  return {
    nearest: (x, y, pxPerX, pxPerY, maxPx) => {
      if (!(pxPerX > 0) || !(pxPerY > 0)) return null;
      // How many cells the search radius spans along each axis.
      const rx = Math.ceil((maxPx / pxPerX / w) * side) + 1;
      const ry = Math.ceil((maxPx / pxPerY / h) * side) + 1;
      const [cx, cy] = cellOf(x, y);
      let best: number | null = null;
      let bestD = maxPx * maxPx;
      for (let gy = Math.max(0, cy - ry); gy <= Math.min(side - 1, cy + ry); gy++) {
        for (let gx = Math.max(0, cx - rx); gx <= Math.min(side - 1, cx + rx); gx++) {
          const id = gy * side + gx;
          for (let k = counts[id]; k < counts[id + 1]; k++) {
            const i = order[k];
            const dx = (xs[i] - x) * pxPerX;
            const dy = (ys[i] - y) * pxPerY;
            const d = dx * dx + dy * dy;
            if (d <= bestD) {
              bestD = d;
              best = i;
            }
          }
        }
      }
      return best;
    },
  };
};
