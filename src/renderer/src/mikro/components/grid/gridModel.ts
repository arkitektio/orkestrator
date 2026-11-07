/**
 * What a grid draws, as pure arithmetic -- tested in node.
 *
 * A grid's rows and columns are MEMBERS of its world's enumerating axes. On the
 * plane, column member `c` is the cell `[c, c + 1]` along x and row member `r`
 * the cell `[-(r + 1), -r]` along y: rows run DOWN, as a matrix is read, while
 * the plane's y runs up.
 *
 * Every layer arrives as a RASTER: a block of member positions, each texel one
 * member (or, past `MAX_TEXELS` per side, a bucket of `step` members holding its
 * largest value), NaN where the data holds nothing.
 */

export const MAX_TEXELS = 4096;

/** A layer's placement into the grid (`asAffine`): one row per world axis, the offset last. */
export type AffineLike = {
  matrix: readonly (readonly number[])[];
  inputAxes: readonly string[];
  outputAxes: readonly string[];
};

/** How one of the layer's axes lands on one world axis: `member = scale · position + offset`. */
export type AxisMap = { input: string; scale: number; offset: number };

/** Which of the layer's axes is the world axis `output`, and how; null when the placement says nothing about it. */
export const axisMapOf = (affine: AffineLike | null | undefined, output: string): AxisMap | null => {
  if (!affine) return null;
  const row = affine.outputAxes.indexOf(output);
  if (row < 0) return null;
  const coefficients = affine.matrix[row] ?? [];
  let best = -1;
  for (let k = 0; k < affine.inputAxes.length; k++) {
    if ((coefficients[k] ?? 0) !== 0 && (best < 0 || Math.abs(coefficients[k]) > Math.abs(coefficients[best]))) best = k;
  }
  if (best < 0) return null;
  return { input: affine.inputAxes[best], scale: coefficients[best], offset: coefficients[affine.inputAxes.length] ?? 0 };
};

export type Raster = {
  /** Row-major, `rows × cols`, NaN where nothing is. */
  values: Float32Array;
  rows: number;
  cols: number;
  /** The member of texel (0, 0), and how many members a texel spans. */
  row0: number;
  col0: number;
  rowStep: number;
  colStep: number;
  /** The finite values' range. */
  lo: number;
  hi: number;
};

const stepFor = (span: number) => Math.max(1, Math.ceil(span / MAX_TEXELS));

/** An empty raster over members `[row0, row0 + rowSpan) × [col0, col0 + colSpan)`. */
export const emptyRaster = (row0: number, rowSpan: number, col0: number, colSpan: number): Raster => {
  const rowStep = stepFor(rowSpan);
  const colStep = stepFor(colSpan);
  const rows = Math.max(1, Math.ceil(rowSpan / rowStep));
  const cols = Math.max(1, Math.ceil(colSpan / colStep));
  return { values: new Float32Array(rows * cols).fill(NaN), rows, cols, row0, col0, rowStep, colStep, lo: Infinity, hi: -Infinity };
};

/** Put one value at a member cell; a bucket keeps its largest. */
export const put = (raster: Raster, row: number, col: number, value: number) => {
  if (!Number.isFinite(value)) return;
  const r = Math.floor((row - raster.row0) / raster.rowStep);
  const c = Math.floor((col - raster.col0) / raster.colStep);
  if (r < 0 || r >= raster.rows || c < 0 || c >= raster.cols) return;
  const i = r * raster.cols + c;
  const current = raster.values[i];
  if (!(current >= value)) raster.values[i] = value;
  if (value < raster.lo) raster.lo = value;
  if (value > raster.hi) raster.hi = value;
};

/** Cells at member positions (a table's rows): the raster spanning them all. */
export const rasterOfCells = (rows: ArrayLike<number>, cols: ArrayLike<number>, values: ArrayLike<number>): Raster | null => {
  let r0 = Infinity;
  let r1 = -Infinity;
  let c0 = Infinity;
  let c1 = -Infinity;
  for (let i = 0; i < rows.length; i++) {
    const r = Math.round(rows[i]);
    const c = Math.round(cols[i]);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    if (r < r0) r0 = r;
    if (r > r1) r1 = r;
    if (c < c0) c0 = c;
    if (c > c1) c1 = c;
  }
  if (!(r1 >= r0) || !(c1 >= c0)) return null;
  const raster = emptyRaster(r0, r1 - r0 + 1, c0, c1 - c0 + 1);
  for (let i = 0; i < rows.length; i++) put(raster, Math.round(rows[i]), Math.round(cols[i]), values[i]);
  return raster;
};

/** The member under a point of the plane, and the raster's value there (NaN for an empty cell). */
export const cellAt = (raster: Raster, x: number, y: number): { row: number; col: number; value: number } | null => {
  const col = Math.floor(x);
  const row = Math.floor(-y);
  const r = Math.floor((row - raster.row0) / raster.rowStep);
  const c = Math.floor((col - raster.col0) / raster.colStep);
  if (r < 0 || r >= raster.rows || c < 0 || c >= raster.cols) return null;
  return { row, col, value: raster.values[r * raster.cols + c] };
};

/** Where a raster sits on the plane. */
export const rectOf = (raster: Raster) => ({
  x0: raster.col0,
  x1: raster.col0 + raster.cols * raster.colStep,
  y0: -(raster.row0 + raster.rows * raster.rowStep),
  y1: -raster.row0,
});

/**
 * The raster's RGBA, through a colormap over `[lo, hi]`: texture row 0 is the
 * BOTTOM of the image, so raster rows are written in reverse. Empty cells are
 * transparent. `sample` returns sRGB 0..1 (the texture is sRGB).
 */
export const rgbaOf = (
  raster: Raster,
  lo: number,
  hi: number,
  sample: (t: number) => readonly [number, number, number],
): Uint8Array => {
  const out = new Uint8Array(raster.rows * raster.cols * 4);
  const span = hi - lo || 1;
  for (let r = 0; r < raster.rows; r++) {
    const t = raster.rows - 1 - r;
    for (let c = 0; c < raster.cols; c++) {
      const v = raster.values[r * raster.cols + c];
      const o = (t * raster.cols + c) * 4;
      if (Number.isNaN(v)) continue;
      const [red, green, blue] = sample((v - lo) / span);
      out[o] = Math.round(red * 255);
      out[o + 1] = Math.round(green * 255);
      out[o + 2] = Math.round(blue * 255);
      out[o + 3] = 255;
    }
  }
  return out;
};
