import { decompress as zstdDecompress } from "fzstd";
import { decodeMorton3 } from "@/mikro/components/scene/platform/parquet/mortonCell";
import type { KonnektionEncoding, KonnektionGrid } from "./konnektionManifest";

/**
 * The byte contract: konnektion blobs → typed arrays. Pure, and the executable
 * half of the format documentation.
 *
 * ## The quantization
 *
 * Positions are three little-endian `uint16` per node, quantized against a
 * cell's own grid box:
 *
 * ```
 *   p = origin + q / 65535 * extent
 * ```
 *
 * with `origin`/`extent` from `(level, cell, cellSize)` and nothing else. That
 * is what makes a row self-contained: a decoder holding the row and the
 * manifest can invert it, with no neighbour lookup and no global bounds.
 *
 * ## GHOSTS — the invariant that fails silently
 *
 * An edge whose endpoints fall in two cells is konnektion's analogue of a
 * mesh's clipped triangle, and it is handled the opposite way. fabriks SPLITS
 * the triangle at the plane. konnektion **copies** the foreign endpoint,
 * because splitting an edge means inventing a degree-2 node, and an invented
 * degree-2 node in a morphology is a measurement artefact — it would make the
 * octree's cell size readable off the biology.
 *
 * So a cell's node array is:
 *
 * ```
 *   [ ...positions (nodeCount) , ...ghostPositions (ghostCount) ]
 * ```
 *
 * and an edge index `>= nodeCount` addresses a ghost. There is no ghost bitset:
 * the two counts already say which is which, and a second copy of a fact is a
 * chance for the two to disagree.
 *
 * **The ghost is quantized against the box of the cell that OWNS it, not the
 * cell that stores it** — the owner's Morton code is in the parallel
 * `ghost_cells` blob, one `uint64` per ghost. This is forced rather than
 * chosen: a ghost is by definition outside this cell, so its normalized
 * coordinate lands past 1.0 and the encoder refuses it against the local box.
 *
 * Decoding a ghost against the storing cell's box produces **no error at any
 * layer** — the lengths divide, the indices are in range — and draws crossing
 * edges flying off to wrong places. It is the single most important line in
 * this file, and `konnektionCore.test.ts` asserts it exactly rather than within
 * a tolerance: konnektion guarantees a ghost reconstructs BIT-IDENTICALLY to
 * what the owning cell stores, which is what makes its own
 * `verify(tier="topology")` an exact check.
 *
 * ## Arity
 *
 * Edges are `uint32` PAIRS — 8 bytes an edge. A flat `uint32` array reshaped to
 * three divides evenly whenever the edge count is a multiple of three, indexes
 * in range, and draws a plausible wrong picture. That is why `encoding.edges`
 * is a required manifest key and why this file refuses rather than defaults.
 */

/** The quantization denominator. Odd, so 0 and QUANT_MAX land exactly on cell faces. */
export const QUANT_MAX = 65535;

export class KonnektionDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KonnektionDecodeError";
  }
}

/** One geometry row, still as bytes. */
export type KonnektionGeometryRow = {
  level: number;
  cell: number;
  positions: Uint8Array;
  nodeIds: Uint8Array;
  edges: Uint8Array;
  ghostPositions: Uint8Array;
  ghostCells: Uint8Array;
  ghostIds: Uint8Array;
  radii: Uint8Array | null;
  ghostRadii: Uint8Array | null;
  nodeCount: number;
  edgeCount: number;
  ghostCount: number;
  objectIds: number[];
  objectOrdinals: number[];
  objectNodeOffsets: number[];
  objectGhostOffsets: number[];
  objectEdgeOffsets: number[];
  /** Owned/ghost value blobs per declared attribute, keyed by attribute name.
   *  Optional so a hand-built fixture row predating attributes still compiles;
   *  `parseGeometryRow` always supplies it (`{}` for a bare collection). */
  attributes?: Record<string, { owned: Uint8Array; ghosts: Uint8Array | null }>;
};

/** One cell's graph, decoded into the collection's own voxel space. */
export type DecodedNetworkCell = {
  level: number;
  cell: number;
  /**
   * `(nodeCount + ghostCount) * 3` floats: this cell's own nodes first, then
   * its ghosts. Edges index into THIS array.
   */
  positions: Float32Array;
  /** `edgeCount * 2` indices into `positions`. */
  edges: Uint32Array;
  /** One id per entry of `positions`, owned nodes then ghosts. */
  nodeIds: Float64Array;
  /** One radius per entry of `positions`, or null when `encoding.radii` is NONE. */
  radii: Float32Array | null;
  /**
   * One value per entry of `positions` per declared attribute — owned nodes
   * then ghosts, exactly the `radii` layout. `NaN` is "no answer" (a rootless
   * object's strahler/depth), never a sentinel a filter should treat as 0.
   * Empty for a pre-attribute collection.
   */
  attributes: Record<string, Float32Array>;
  /** Per-node object ordinal, for colouring and picking. */
  nodeOrdinals: Float32Array;
  nodeCount: number;
  ghostCount: number;
  edgeCount: number;
  /** Approximate resident bytes, for the byte-budgeted cache. */
  bytes: number;
};

const littleEndian = true;

/** A blob's bytes, decompressed if the manifest says they are compressed.
 *
 * `expandedBytes` is REQUIRED for ZSTD and not merely helpful: the format's
 * framing carries no size of its own, so the row's counts are how the
 * uncompressed length is known. */
function raw(
  blob: Uint8Array,
  compression: KonnektionEncoding["compression"],
  expandedBytes: number,
  what: string,
): Uint8Array {
  if (compression === "NONE") return blob;
  // fzstd takes an OUTPUT BUFFER, not a length — and the buffer is how the
  // length is supplied at all, the format's ZSTD framing carrying no size of
  // its own. That is why `expandedBytes` is required rather than a hint.
  const out = zstdDecompress(blob, new Uint8Array(expandedBytes));
  if (out.byteLength !== expandedBytes) {
    throw new KonnektionDecodeError(
      `${what} decompressed to ${out.byteLength} bytes and its row implies ${expandedBytes}. ` +
        `The row and the geometry belong to different writes.`,
    );
  }
  return out;
}

const viewOf = (bytes: Uint8Array): DataView =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

/** The grid box of a cell: its origin and extent in voxels. The one function a
 *  ghost and an owned node are inverted against — with DIFFERENT cells. */
export function cellBox(
  cell: number,
  level: number,
  cellSize: readonly [number, number, number],
): { origin: [number, number, number]; extent: [number, number, number] } {
  const coords = decodeMorton3(cell);
  const scale = 2 ** level;
  const extent: [number, number, number] = [
    cellSize[0] * scale,
    cellSize[1] * scale,
    cellSize[2] * scale,
  ];
  return {
    origin: [coords[0] * extent[0], coords[1] * extent[1], coords[2] * extent[2]],
    extent,
  };
}

/**
 * Decode one geometry row.
 *
 * Positions come back in ONE array — owned nodes then ghosts — because that is
 * the space edges index into. Splitting them would mean rebasing every edge
 * index above `nodeCount`, which is work whose only product is a chance to get
 * the offset wrong.
 */
export function decodeGeometryRow(
  row: KonnektionGeometryRow,
  grid: KonnektionGrid,
  encoding: KonnektionEncoding,
): DecodedNetworkCell {
  if (encoding.edges !== "UINT32_PAIRS") {
    // Unreachable through the manifest parser, restated here because this is
    // where the arity is actually spent.
    throw new KonnektionDecodeError(
      `\`encoding.edges\` is ${encoding.edges}; this decoder reads UINT32_PAIRS. Reading a ` +
        `segment list at the wrong arity produces a plausible wrong graph, not an error.`,
    );
  }

  const { nodeCount, ghostCount, edgeCount } = row;
  const total = nodeCount + ghostCount;
  const positions = new Float32Array(total * 3);

  // --- owned nodes: inverted against THIS cell's box ------------------------
  const own = cellBox(row.cell, row.level, grid.cellSize);
  const ownBytes = raw(row.positions, encoding.compression, nodeCount * 6, "positions");
  if (ownBytes.byteLength !== nodeCount * 6) {
    throw new KonnektionDecodeError(
      `This positions blob holds ${ownBytes.byteLength / 6} nodes and its row declares ` +
        `${nodeCount}. A blob is 6 bytes a node, so the two cannot disagree unless the row and ` +
        `the geometry belong to different writes.`,
    );
  }
  const ownView = viewOf(ownBytes);
  for (let node = 0; node < nodeCount; node++) {
    for (let axis = 0; axis < 3; axis++) {
      const q = ownView.getUint16((node * 3 + axis) * 2, littleEndian);
      positions[node * 3 + axis] = own.origin[axis] + (q / QUANT_MAX) * own.extent[axis];
    }
  }

  // --- ghosts: inverted against the OWNER's box, one owner per ghost --------
  // See the module docblock. Using `own` here would compile, run, and draw
  // every crossing edge into the wrong place.
  if (ghostCount > 0) {
    const ghostBytes = raw(
      row.ghostPositions,
      encoding.compression,
      ghostCount * 6,
      "ghost_positions",
    );
    const ownerBytes = raw(row.ghostCells, encoding.compression, ghostCount * 8, "ghost_cells");
    if (ghostBytes.byteLength !== ghostCount * 6 || ownerBytes.byteLength !== ghostCount * 8) {
      throw new KonnektionDecodeError(
        `A cell declares ${ghostCount} ghosts but carries ${ghostBytes.byteLength / 6} ghost ` +
          `positions and ${ownerBytes.byteLength / 8} owner codes. A ghost's owner is what its ` +
          `coordinate is inverted against, so the two lists cannot be different lengths.`,
      );
    }
    const ghostView = viewOf(ghostBytes);
    const ownerView = viewOf(ownerBytes);
    for (let ghost = 0; ghost < ghostCount; ghost++) {
      // uint64 Morton code. Safe as a double: both formats cap a code at 17
      // bits per axis (51 bits interleaved) precisely so this holds.
      const owner = Number(ownerView.getBigUint64(ghost * 8, littleEndian));
      const box = cellBox(owner, row.level, grid.cellSize);
      const slot = (nodeCount + ghost) * 3;
      for (let axis = 0; axis < 3; axis++) {
        const q = ghostView.getUint16((ghost * 3 + axis) * 2, littleEndian);
        positions[slot + axis] = box.origin[axis] + (q / QUANT_MAX) * box.extent[axis];
      }
    }
  }

  // --- edges: uint32 pairs, indices into the concatenated node array --------
  const edgeBytes = raw(row.edges, encoding.compression, edgeCount * 8, "edges");
  if (edgeBytes.byteLength !== edgeCount * 8) {
    throw new KonnektionDecodeError(
      `This edges blob holds ${edgeBytes.byteLength / 8} edges and its row declares ${edgeCount}. ` +
        `A blob is 8 bytes an edge, so the two cannot disagree unless the row and the geometry ` +
        `belong to different writes.`,
    );
  }
  const edges = new Uint32Array(edgeCount * 2);
  const edgeView = viewOf(edgeBytes);
  for (let i = 0; i < edgeCount * 2; i++) {
    const index = edgeView.getUint32(i * 4, littleEndian);
    if (index >= total) {
      throw new KonnektionDecodeError(
        `An edge names node ${index} in a cell holding ${nodeCount} nodes and ${ghostCount} ` +
          `ghosts. Every endpoint is either owned or ghosted here — that is what makes a cell ` +
          `self-contained — so this cell is missing a ghost it should carry.`,
      );
    }
    edges[i] = index;
  }

  const attributes = decodeAttributes(row, encoding, nodeCount, ghostCount);

  return {
    level: row.level,
    cell: row.cell,
    positions,
    edges,
    nodeIds: decodeNodeIds(row, encoding, nodeCount, ghostCount),
    radii: decodeRadii(row, grid, encoding, nodeCount, ghostCount),
    attributes,
    nodeOrdinals: nodeOrdinalsOf(row, total),
    nodeCount,
    ghostCount,
    edgeCount,
    bytes:
      positions.byteLength +
      edges.byteLength +
      total * 12 +
      Object.keys(attributes).length * total * 4,
  };
}

/**
 * Per-node attribute values, owned then ghosts — the radii layout without the
 * quantization branch: an attribute is FLOAT32 only, because its "no answer"
 * is NaN and a quantized integer has no way to say that.
 */
function decodeAttributes(
  row: KonnektionGeometryRow,
  encoding: KonnektionEncoding,
  nodeCount: number,
  ghostCount: number,
): Record<string, Float32Array> {
  const decoded: Record<string, Float32Array> = {};
  for (const [name, blobs] of Object.entries(row.attributes ?? {})) {
    const out = new Float32Array(nodeCount + ghostCount);
    const read = (blob: Uint8Array, count: number, offset: number, what: string): void => {
      if (count === 0) return;
      const bytes = raw(blob, encoding.compression, count * 4, what);
      if (bytes.byteLength !== count * 4) {
        throw new KonnektionDecodeError(
          `${what} holds ${bytes.byteLength / 4} values and its row declares ${count}. The row ` +
            `and the geometry belong to different writes.`,
        );
      }
      const view = viewOf(bytes);
      for (let i = 0; i < count; i++) out[offset + i] = view.getFloat32(i * 4, littleEndian);
    };
    read(blobs.owned, nodeCount, 0, `attr_${name}`);
    if (ghostCount > 0 && blobs.ghosts) {
      read(blobs.ghosts, ghostCount, nodeCount, `ghost_attr_${name}`);
    }
    decoded[name] = out;
  }
  return decoded;
}

/** Node ids, owned then ghosted. `uint64` widened to a double — ids are not
 *  Morton-capped, so this is lossy past 2^53 and says so rather than pretending. */
function decodeNodeIds(
  row: KonnektionGeometryRow,
  encoding: KonnektionEncoding,
  nodeCount: number,
  ghostCount: number,
): Float64Array {
  const out = new Float64Array(nodeCount + ghostCount);
  const read = (blob: Uint8Array, count: number, offset: number, what: string): void => {
    if (count === 0) return;
    const bytes = raw(blob, encoding.compression, count * 8, what);
    const view = viewOf(bytes);
    for (let i = 0; i < count; i++) {
      out[offset + i] = Number(view.getBigUint64(i * 8, littleEndian));
    }
  };
  read(row.nodeIds, nodeCount, 0, "node_ids");
  read(row.ghostIds, ghostCount, nodeCount, "ghost_ids");
  return out;
}

/**
 * Per-node radii, or null when the collection carries none.
 *
 * The columns are present EXACTLY when `encoding.radii !== "NONE"` — a
 * required-but-empty column would be a place for a reader to find zeros and
 * believe them, so the manifest says whether to look rather than the data.
 *
 * `UINT16_QUANTIZED_PER_CELL` quantizes against the cell's **largest** extent,
 * not per axis: a radius is one scalar and has no axis to be quantized along.
 */
function decodeRadii(
  row: KonnektionGeometryRow,
  grid: KonnektionGrid,
  encoding: KonnektionEncoding,
  nodeCount: number,
  ghostCount: number,
): Float32Array | null {
  if (encoding.radii === "NONE") return null;
  if (!row.radii) {
    throw new KonnektionDecodeError(
      `\`encoding.radii\` is ${encoding.radii} but this row carries no \`radii\` column. The ` +
        `column is present exactly when the encoding declares one.`,
    );
  }

  const out = new Float32Array(nodeCount + ghostCount);
  const width = encoding.radii === "FLOAT32" ? 4 : 2;

  const read = (
    blob: Uint8Array,
    count: number,
    offset: number,
    cell: number,
    what: string,
  ): void => {
    if (count === 0) return;
    const bytes = raw(blob, encoding.compression, count * width, what);
    const view = viewOf(bytes);
    if (encoding.radii === "FLOAT32") {
      for (let i = 0; i < count; i++) out[offset + i] = view.getFloat32(i * 4, littleEndian);
      return;
    }
    const span = Math.max(...cellBox(cell, row.level, grid.cellSize).extent);
    for (let i = 0; i < count; i++) {
      out[offset + i] = (view.getUint16(i * 2, littleEndian) / QUANT_MAX) * span;
    }
  };

  read(row.radii, nodeCount, 0, row.cell, "radii");
  // A ghost's radius, like its position, belongs to the cell that owns it — but
  // the quantized span is the OWNER's largest extent. Cells at one level all
  // share an extent, so this cell's is the same number; using it keeps the
  // decode independent of the ghost_cells blob.
  if (ghostCount > 0 && row.ghostRadii) {
    read(row.ghostRadii, ghostCount, nodeCount, row.cell, "ghost_radii");
  }
  return out;
}

/**
 * One object ordinal per node, expanded from the row's per-object ranges.
 *
 * `object_node_offsets` are START offsets with length n — **not n+1**. The last
 * object runs to the end of its span, so a reader treating them as fenceposts
 * reads one object too few and silently drops the last arbor in the cell.
 * Ghosts sit past the owned nodes and take their owner's ordinal only when
 * `object_ghost_offsets` says so; anything unclaimed keeps ordinal 0.
 */
function nodeOrdinalsOf(row: KonnektionGeometryRow, total: number): Float32Array {
  const out = new Float32Array(total);
  const spans = (offsets: number[], base: number, limit: number): void => {
    for (let object = 0; object < offsets.length; object++) {
      const start = base + offsets[object];
      const end = object + 1 < offsets.length ? base + offsets[object + 1] : limit;
      const ordinal = row.objectOrdinals[object] ?? 0;
      for (let node = start; node < end && node < total; node++) out[node] = ordinal;
    }
  };
  spans(row.objectNodeOffsets, 0, row.nodeCount);
  spans(row.objectGhostOffsets, row.nodeCount, total);
  return out;
}
