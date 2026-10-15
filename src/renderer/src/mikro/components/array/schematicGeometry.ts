/**
 * The geometry of dask's array schematic, `dask.array.svg`, with axis names.
 *
 * Every axis is a side of a block: one axis a strip, two a rectangle, three an
 * oblique cube whose first axis is the depth. More than three are drawn as
 * several blocks side by side, the LAST three as the cube on the right and the
 * leading ones before it, two or three at a time, as dask groups them (an axis
 * count one past a multiple of three gets a size-1 axis in front, so no block
 * is ever a lone strip beside a cube).
 *
 * Sides are not to scale: dask keeps ratios up to e exact and compresses
 * larger ones logarithmically, capped at 100, so a 1×2048 axis still shows.
 *
 * Pure: points in pixels, fitted into a box, for the component to paint.
 */

export type SchematicAxis = { name: string; size: number; chunk?: number | null };

/** A fraction of an axis, `[from, to]` in `0..1`: the whole axis is `[0, 1]`. */
export type Interval = readonly [number, number];

export type Point = readonly [number, number];

export type SchematicLabel = {
  text: string;
  x: number;
  y: number;
  /** Degrees, about (x, y). */
  angle: number;
};

export type Schematic = {
  /** The blocks' visible faces, as closed polygons, back to front. */
  faces: Point[][];
  /** Chunk boundaries across the faces. */
  lines: [Point, Point][];
  labels: SchematicLabel[];
  /** The faces of `highlight`, when one was asked for. */
  highlight: Point[][];
};

/** dask's `ratio_response`: exact to e, logarithmic to 100, flat beyond. */
export const ratioResponse = (ratio: number) =>
  ratio < Math.E ? ratio : ratio <= 100 ? Math.log(ratio + 12.4) : Math.log(100 + 12.4);

/** dask's `draw_sizes`: each side's length, the longest axis `size` long. */
export const drawSizes = (shape: readonly number[], size: number) => {
  const longest = Math.max(...shape);
  return shape.map((extent) => size / ratioResponse(longest / Math.max(0.1, extent)));
};

/** Past this many chunks along an axis its grid lines would be a smear: none are drawn. */
export const MAX_CHUNK_LINES = 40;

/** Where an axis' chunks end, as fractions of it; empty when there are too many to draw. */
export const chunkBoundaries = (axis: SchematicAxis): number[] => {
  if (!axis.chunk || axis.chunk <= 0 || axis.chunk >= axis.size) return [];
  const count = Math.ceil(axis.size / axis.chunk);
  if (count - 1 > MAX_CHUNK_LINES) return [];
  return Array.from({ length: count - 1 }, (_, index) => ((index + 1) * axis.chunk!) / axis.size);
};

/** How many chunks the array is stored in, or undefined where an axis' chunk is unknown. */
export const chunkCount = (axes: readonly SchematicAxis[]) =>
  axes.every((axis) => axis.chunk && axis.chunk > 0)
    ? axes.reduce((total, axis) => total * Math.ceil(axis.size / axis.chunk!), 1)
    : undefined;

// One axis of a block: its index in the caller's axes (-1 for dask's padding
// axis, which is drawn but never named) and its side in pixels.
type Side = { index: number; length: number };

/** dask's grouping: the leading blocks two or three axes each, then threes. */
const groupsOf = (sides: Side[]): Side[][] => {
  const padded = sides.length % 3 === 1 ? [{ index: -1, length: 0 }, ...sides] : sides;
  const groups: Side[][] = [];
  let at = 0;
  while (at < padded.length) {
    const take = groups.length === 0 ? padded.length % 3 || 3 : 3;
    groups.push(padded.slice(at, at + take));
    at += take;
  }
  return groups;
};

/** dask draws the depth of a cube at 1/1.7 of its side, at 45°. */
const DEPTH = 1 / 1.7;

type Block = {
  sides: Side[];
  /** The block's top left. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Where (u per axis of the block, each in 0..1) lands. */
  at: (u: readonly number[]) => Point;
};

const blockOf = (sides: Side[], x: number, y: number): Block => {
  if (sides.length === 2) {
    const [rows, cols] = sides;
    return {
      sides,
      x,
      y,
      width: cols.length,
      height: rows.length,
      at: ([r, c]) => [x + c * cols.length, y + r * rows.length],
    };
  }
  const [depth, rows, cols] = sides;
  const d = depth.length * DEPTH;
  return {
    sides,
    x,
    y,
    width: d + cols.length,
    height: d + rows.length,
    at: ([a, r, c]) => [x + d * a + c * cols.length, y + d * a + r * rows.length],
  };
};

/** The visible faces of the part of a block between `from` and `to` along each of its axes. */
const facesOf = (block: Block, from: number[], to: number[]): Point[][] => {
  const { at } = block;
  if (block.sides.length === 2) {
    const [r0, c0] = from;
    const [r1, c1] = to;
    return [[at([r0, c0]), at([r0, c1]), at([r1, c1]), at([r1, c0])]];
  }
  const [a0, r0, c0] = from;
  const [a1, r1, c1] = to;
  return [
    // left (the first column, through the depth), top (the first row), front (the last slice)
    [at([a0, r0, c0]), at([a1, r0, c0]), at([a1, r1, c0]), at([a0, r1, c0])],
    [at([a0, r0, c0]), at([a0, r0, c1]), at([a1, r0, c1]), at([a1, r0, c0])],
    [at([a1, r0, c0]), at([a1, r0, c1]), at([a1, r1, c1]), at([a1, r1, c0])],
  ];
};

/** Chunk lines closer than this, in pixels, would fill the face rather than divide it: none are drawn. */
export const MIN_CHUNK_SPACING = 3;

/** One line per chunk boundary, across each face that axis runs along. */
const linesOf = (block: Block, axes: readonly SchematicAxis[]): [Point, Point][] => {
  const { at, sides } = block;
  const bounds = sides.map((side, position) => {
    if (side.index < 0) return [];
    const fractions = chunkBoundaries(axes[side.index]);
    // A cube's depth is drawn shorter than its side.
    const drawn = sides.length === 3 && position === 0 ? side.length * DEPTH : side.length;
    return drawn / (fractions.length + 1) < MIN_CHUNK_SPACING ? [] : fractions;
  });
  const lines: [Point, Point][] = [];
  if (sides.length === 2) {
    for (const f of bounds[0]) lines.push([at([f, 0]), at([f, 1])]);
    for (const f of bounds[1]) lines.push([at([0, f]), at([1, f])]);
    return lines;
  }
  for (const f of bounds[0]) lines.push([at([f, 0, 0]), at([f, 0, 1])], [at([f, 0, 0]), at([f, 1, 0])]);
  for (const f of bounds[1]) lines.push([at([1, f, 0]), at([1, f, 1])], [at([0, f, 0]), at([1, f, 0])]);
  for (const f of bounds[2]) lines.push([at([1, 0, f]), at([1, 1, f])], [at([0, 0, f]), at([1, 0, f])]);
  return lines;
};

/** The room labels need around the blocks, in pixels. */
export const LABEL_GAP = 3;
const LABEL_ROOM = { top: 2, right: 13, bottom: 13, left: 9 };
/** Between two blocks: dask's 10, plus room for the left one's side label and the cube's depth label. */
const BLOCK_GAP = 32;

const labelText = (axis: SchematicAxis) => `${axis.name} ${axis.size}`;

const labelsOf = (block: Block, axes: readonly SchematicAxis[]): SchematicLabel[] => {
  const { at, sides } = block;
  const named = (side: Side) => (side.index < 0 ? undefined : labelText(axes[side.index]));
  const labels: SchematicLabel[] = [];
  const [rows, cols] = sides.length === 2 ? sides : sides.slice(1);
  const front = sides.length === 2 ? (r: number, c: number) => at([r, c]) : (r: number, c: number) => at([1, r, c]);

  const [bottomLeft, bottomRight] = [front(1, 0), front(1, 1)];
  const colText = named(cols);
  if (colText) labels.push({ text: colText, x: (bottomLeft[0] + bottomRight[0]) / 2, y: bottomLeft[1] + LABEL_GAP, angle: 0 });

  const [topRight] = [front(0, 1)];
  const rowText = named(rows);
  if (rowText) labels.push({ text: rowText, x: topRight[0] + LABEL_GAP, y: (topRight[1] + bottomRight[1]) / 2, angle: -90 });

  if (sides.length === 3) {
    const depthText = named(sides[0]);
    // Along the bottom left edge, the one the depth runs down.
    const [back, frontCorner] = [at([0, 1, 0]), at([1, 1, 0])];
    if (depthText)
      labels.push({
        text: depthText,
        x: (back[0] + frontCorner[0]) / 2 - LABEL_GAP * 0.7,
        y: (back[1] + frontCorner[1]) / 2 + LABEL_GAP * 0.7,
        angle: 45,
      });
  }
  return labels;
};

/**
 * The schematic of an array of `axes`, fitted into `width` × `height` pixels
 * with room for its labels and centred across the width. `highlight` (one
 * interval per axis, `[0, 1]` for an axis it does not narrow) adds the faces
 * of that part, to show a lens inside its array.
 *
 * `maxSide` caps the longest side, so a lone small array does not balloon to
 * fill a wide box.
 */
export const arraySchematic = (
  axes: readonly SchematicAxis[],
  { width, height, maxSide = 72, highlight }: { width: number; height: number; maxSide?: number; highlight?: readonly Interval[] },
): Schematic | undefined => {
  if (axes.length === 0 || axes.some((axis) => !(axis.size > 0))) return undefined;

  const layout = (side: number) => {
    const lengths = drawSizes(
      axes.length % 3 === 1 ? [1, ...axes.map((axis) => axis.size)] : axes.map((axis) => axis.size),
      side,
    );
    const padded = axes.length % 3 === 1;
    const sides = axes.map((_, index) => ({ index, length: lengths[index + (padded ? 1 : 0)] }));
    const groups = groupsOf(sides).map((group) =>
      group.map((side) => (side.index < 0 ? { index: -1, length: lengths[0] } : side)),
    );
    let x = 0;
    const blocks = groups.map((group) => {
      const block = blockOf(group, x, 0);
      x += block.width + BLOCK_GAP;
      return block;
    });
    const tallest = Math.max(...blocks.map((block) => block.height));
    // Bottom-aligned, so the size labels under the blocks share a line.
    const aligned = blocks.map((block) => blockOf(block.sides, block.x, tallest - block.height));
    return { blocks: aligned, width: x - BLOCK_GAP, height: tallest };
  };

  // Linear in the side but for the fixed gaps between blocks: measure once,
  // then lay out again at the side that fits.
  const roomWidth = width - LABEL_ROOM.left - LABEL_ROOM.right;
  const roomHeight = height - LABEL_ROOM.top - LABEL_ROOM.bottom;
  const probe = layout(maxSide);
  const gaps = (probe.blocks.length - 1) * BLOCK_GAP;
  const scale = Math.min(1, Math.max(0, roomWidth - gaps) / Math.max(1, probe.width - gaps), roomHeight / Math.max(1, probe.height));
  const fitted = layout(maxSide * scale);

  const left = LABEL_ROOM.left + Math.max(0, (roomWidth - fitted.width) / 2);
  const top = LABEL_ROOM.top + Math.max(0, roomHeight - fitted.height);
  const blocks = fitted.blocks.map((block) => blockOf(block.sides, block.x + left, block.y + top));

  const whole = (block: Block) => block.sides.map(() => 0);
  const full = (block: Block) => block.sides.map(() => 1);
  return {
    faces: blocks.flatMap((block) => facesOf(block, whole(block), full(block))),
    lines: blocks.flatMap((block) => linesOf(block, axes)),
    labels: blocks.flatMap((block) => labelsOf(block, axes)),
    highlight: highlight
      ? blocks.flatMap((block) =>
          facesOf(
            block,
            block.sides.map((side) => (side.index < 0 ? 0 : highlight[side.index]?.[0] ?? 0)),
            block.sides.map((side) => (side.index < 0 ? 1 : highlight[side.index]?.[1] ?? 1)),
          ),
        )
      : [],
  };
};

/**
 * The part of an array a lens selects, one interval per axis: a slice's
 * `start` to its `stop`, the whole axis where the lens does not narrow it.
 */
export const sliceIntervals = (
  axes: readonly SchematicAxis[],
  slices: readonly { axis: string; start: number; stop: number }[],
): Interval[] =>
  axes.map((axis) => {
    const slice = slices.find((candidate) => candidate.axis === axis.name);
    return slice ? [slice.start / axis.size, Math.min(1, slice.stop / axis.size)] : [0, 1];
  });
