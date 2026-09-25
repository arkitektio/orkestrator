import type { KonnektionCellIndex } from "./konnektionCatalogs";
import type { DecodedNetworkCell } from "./konnektionDecode";

/**
 * CPU packing for the storage-buffer renderer: decoded cells → the three flat
 * arrays the GPU pulls from. Pure, three-free, and the only place the buffer
 * layout is known — which is what makes it unit-testable the way
 * `pointsCompute.ts` is (the TSL graphs themselves need a GPU to say anything).
 *
 * ## The layout
 *
 *  - `positions`: one vec3 per node slot, each cell's OWNED nodes then its
 *    ghosts, cells concatenated in plan order. Stored ONCE — edges reference
 *    nodes by index, which is the whole point: the attribute path duplicated
 *    every shared endpoint into per-edge attributes.
 *  - `aux`: one vec4 per node slot — (radius, ordinal, glyphScale, visible).
 *    Radius 0 means "the collection carries none here": the shader falls back
 *    to the lineWidth uniform, which is what makes a width change a uniform
 *    write rather than a re-pack. `glyphScale` is 0 for a ghost, so its
 *    sphere degenerates to a point instead of double-drawing the node its
 *    owner already glyphs. `visible` (the `.w` that used to be a spare 0) is
 *    the AND of the active GRAPH filter rules — 1 keeps, 0 discards — packed
 *    here rather than tested in the shader so a rule edit is one re-pack and
 *    the per-fragment cost stays a single compare.
 *  - `values`: one float per node slot — the ACTIVE graph colouring's value,
 *    NaN where the node has no answer or no colouring is active. The
 *    `pointsMaterial` pattern: the palette row and the clims are uniforms, so
 *    a colormap or window nudge re-packs nothing.
 *  - `edges`: uint32 pairs indexing into the packed node array. A cell's own
 *    edge indices are LOCAL to its concatenated (owned + ghost) span, and its
 *    ghosts sit at the tail of that same span, so one uniform `+ nodeOffset`
 *    rebase is correct for owned and ghost endpoints alike. A segment reads
 *    its START node's value and visibility — an edge owns no durable identity
 *    of its own (simplification re-links between levels), so the start node is
 *    the format's own convention for everything per-edge, ordinals included.
 */

export type NetworkCapacity = { nodes: number; edges: number };

/**
 * How large the storage buffers must be, from the catalog and the budgets in
 * force when the bundle is created.
 *
 * The planner draws ONE level, capped by `capToBudgets` — but that cap keeps
 * the first cell unconditionally even when it alone exceeds a budget (a cell
 * is the atom of the format). So capacity is the budget-clamped worst level,
 * raised to the largest single cell: with that, every plan the planner can
 * emit fits by construction.
 */
export function networkCapacityFor(
  index: KonnektionCellIndex,
  budgets: { maxNodes: number; maxEdges: number },
): NetworkCapacity {
  let worstLevelNodes = 0;
  let worstLevelEdges = 0;
  for (const cells of index.byLevel.values()) {
    let nodes = 0;
    let edges = 0;
    for (const cell of cells) {
      nodes += cell.nodeCount + cell.ghostCount;
      edges += cell.edgeCount;
    }
    worstLevelNodes = Math.max(worstLevelNodes, nodes);
    worstLevelEdges = Math.max(worstLevelEdges, edges);
  }

  let largestCellNodes = 0;
  let largestCellEdges = 0;
  for (const cell of index.cells) {
    largestCellNodes = Math.max(largestCellNodes, cell.nodeCount + cell.ghostCount);
    largestCellEdges = Math.max(largestCellEdges, cell.edgeCount);
  }

  return {
    nodes: Math.max(Math.min(budgets.maxNodes, worstLevelNodes), largestCellNodes),
    edges: Math.max(Math.min(budgets.maxEdges, worstLevelEdges), largestCellEdges),
  };
}

export type PackTarget = {
  /** `capacity.nodes * 3` floats. */
  positions: Float32Array;
  /** `capacity.nodes * 4` floats — (radius, ordinal, glyphScale, visible) per slot. */
  aux: Float32Array;
  /** `capacity.nodes` floats — the active graph colouring's value per slot. */
  values: Float32Array;
  /** `capacity.edges * 2` uint32 indices into the packed node slots. */
  edges: Uint32Array;
  /** `capacity.edges` floats — the active PER-EDGE colouring's value per
   *  PACKED edge, index-aligned with `edges` (compaction included). Only read
   *  when the material's `uValueSource` selects the edge buffer, so it may
   *  hold stale floats whenever no edge colouring is active. */
  edgeValues: Float32Array;
};

/** One active GRAPH filter rule, already reduced to what a node test needs.
 *  `target` decides which visibility bit the rule clears: NODE hides the node
 *  and everything touching it, EDGE hides its outgoing segments only. */
export type NetworkNodeRule = {
  attribute: string;
  min: number | null;
  max: number | null;
  exclude: boolean;
  target: "NODE" | "EDGE";
};

/**
 * What the pack styles each node with. The per-NODE half is the GRAPH picker:
 * `valueAttribute` feeds `values` and `rules` fold into `aux.w`, both naming
 * the manifest's vocabulary (`radius` included). The per-OBJECT half is the
 * COLUMN/SPARSE picker, already resolved by `columnLut`'s machinery into a
 * value per ordinal (`ordinalValues`, NaN = no row = base colour) and a set of
 * hidden ordinals — scattered here so the shader has exactly one value path.
 * `attributesMissing` reports every name the cells could not resolve, so the
 * caller surfaces a skipped rule instead of applying it — the columnLut
 * invariant, restated per node.
 */
export type NetworkStyling = {
  valueAttribute: string | null;
  /** Value per object ORDINAL for an object-level colouring; used only when
   *  `valueAttribute` is null. */
  ordinalValues: Float32Array | null;
  rules: readonly NetworkNodeRule[];
  /** Ordinals the active object-level rules hide — both bits, glyphs and
   *  segments alike: hiding an object is the mesh semantics. */
  hiddenOrdinals: ReadonlySet<number> | null;
  /**
   * The per-NODE-table half (a colouring over a table identified by the
   * collection's node ids): value per `"${ordinal}:${nodeId}"` composite key,
   * already rekeyed objectId → ordinal by the styling — the packer holds only
   * ordinals and stays pure. A node with no row packs NaN and keeps its base
   * colour, the identity-fill rule. Optional so pre-existing stylings (and
   * every test literal) read as "none".
   */
  nodeValues?: ReadonlyMap<string, number> | null;
  /** The per-EDGE-table colouring: value per `"${ordinal}:${srcId}:${dstId}"`,
   *  the ordinal being the START node's (the format's own edge convention).
   *  Scattered index-aligned into `target.edgeValues`. */
  edgeValues?: ReadonlyMap<string, number> | null;
  /** Node keys (`"${ordinal}:${nodeId}"`) the active per-node-table rules
   *  hide. Both bits — a per-node rule's stamped target is NODE, so a hidden
   *  node takes its outgoing segments with it. Only keys a table actually
   *  mentioned can be in here: a column rule never tests what it has no row
   *  for. */
  hiddenNodeKeys?: ReadonlySet<string> | null;
  /** Edge keys (`"${ordinal}:${srcId}:${dstId}"`) the active per-edge-table
   *  rules hide. Filtering per edge IS compaction: a hidden edge's index pair
   *  is simply not emitted, so nothing per-fragment tests it. */
  hiddenEdgeKeys?: ReadonlySet<string> | null;
};

export const IDENTITY_STYLING: NetworkStyling = {
  valueAttribute: null,
  ordinalValues: null,
  rules: [],
  hiddenOrdinals: null,
  nodeValues: null,
  edgeValues: null,
  hiddenNodeKeys: null,
  hiddenEdgeKeys: null,
};

/** A cell's per-node values for one vocabulary name. `radius` reads the radii
 *  the format already decodes; everything else is a declared attribute. */
export const nodeAttributeOf = (
  cell: DecodedNetworkCell,
  name: string,
): Float32Array | null => (name === "radius" ? cell.radii : (cell.attributes[name] ?? null));

/**
 * One node's fate under the active rules, with the semantics
 * `platform/attributes/columnLut.ts` states for every picker and which must
 * not drift per layer kind: rules combine with AND; `exclude` inverts the
 * TEST, not the answer; a rule with no bounds keeps everything; and a value
 * that is NaN — the format's "this node has no answer" — KEEPS the node, in
 * both polarities, because a filter must never hide something it never saw.
 * A rule whose attribute the cell cannot resolve is the caller's to skip and
 * surface; handed a null source here it applies to nothing.
 */
const keeps = (
  value: number | null,
  rule: NetworkNodeRule,
): boolean => {
  if (value === null || Number.isNaN(value)) return true;
  const test =
    (rule.min === null || value >= rule.min) && (rule.max === null || value <= rule.max);
  return rule.exclude ? !test : test;
};

export type PackResult = {
  /** Packed node slots, ghosts included. */
  nodes: number;
  /** Packed edges. */
  edges: number;
  /** Cells packed before any clamp (equals the input length normally). */
  cells: number;
  /** True when a cell did not fit — unreachable when the target was sized by
   *  `networkCapacityFor` against the budgets the plan ran under. */
  clamped: boolean;
  /** Vocabulary names the styling asked for that some cell could not resolve —
   *  a rule over one was SKIPPED for those nodes rather than applied, and the
   *  caller surfaces it, never silently. Empty on an honest collection. */
  attributesMissing: string[];
  /** The finite range of the packed values, for the omitted-window case: the
   *  server publishes no statistics, so "stretch over what you read" is
   *  answered here, from exactly the values that will draw. Null when nothing
   *  finite was packed. */
  valueMin: number | null;
  valueMax: number | null;
};

/**
 * Pack decoded cells into the target arrays. Whole-cell granularity, matching
 * the planner's own truncation semantics: a cell is packed entirely or not at
 * all, so an edge can never dangle into an unpacked span.
 */
export function packNetworkCells(
  cells: readonly DecodedNetworkCell[],
  target: PackTarget,
  styling: NetworkStyling = IDENTITY_STYLING,
): PackResult {
  const capNodes = Math.floor(target.positions.length / 3);
  const capEdges = Math.floor(target.edges.length / 2);

  let nodeOffset = 0;
  let edgeOffset = 0;
  let packed = 0;
  let clamped = false;
  const missing = new Set<string>();
  let valueMin = Number.POSITIVE_INFINITY;
  let valueMax = Number.NEGATIVE_INFINITY;

  for (const cell of cells) {
    const total = cell.nodeCount + cell.ghostCount;
    if (nodeOffset + total > capNodes || edgeOffset + cell.edgeCount > capEdges) {
      clamped = true;
      break;
    }

    target.positions.set(cell.positions, nodeOffset * 3);

    const valueSource = styling.valueAttribute
      ? nodeAttributeOf(cell, styling.valueAttribute)
      : null;
    if (styling.valueAttribute && !valueSource) missing.add(styling.valueAttribute);
    // Resolved per cell, skipped-and-surfaced per name: a rule whose attribute
    // the cell cannot answer applies to nothing rather than hiding everything.
    const ruleSources = styling.rules.map((rule) => {
      const source = nodeAttributeOf(cell, rule.attribute);
      if (!source) missing.add(rule.attribute);
      return source;
    });

    // The composite node key is only built when something node-table-keyed is
    // active — a string concat per node is real cost on a million-node level.
    const nodeValues = styling.nodeValues ?? null;
    const hiddenNodeKeys = styling.hiddenNodeKeys ?? null;
    const needsNodeKey = nodeValues !== null || hiddenNodeKeys !== null;

    for (let i = 0; i < total; i++) {
      const slot = (nodeOffset + i) * 4;
      const ordinal = cell.nodeOrdinals[i];
      target.aux[slot] = cell.radii ? cell.radii[i] : 0;
      target.aux[slot + 1] = ordinal;
      target.aux[slot + 2] = i < cell.nodeCount ? 1 : 0;

      const nodeKey = needsNodeKey ? `${ordinal}:${cell.nodeIds[i]}` : null;

      // Two visibility bits — +1 the node's own (glyphs), +2 the edge's
      // (this node's outgoing segments). A NODE rule clears both (a hidden
      // node takes its segments with it); an EDGE rule clears only the edge
      // bit; a hidden OBJECT clears both, the mesh semantics — and so does a
      // hidden node KEY, since a per-node-table rule's stamped target is NODE.
      let nodeVisible =
        !styling.hiddenOrdinals?.has(ordinal) &&
        !(nodeKey !== null && hiddenNodeKeys?.has(nodeKey));
      let edgeVisible = nodeVisible;
      // Stops early only once the node bit is gone (both are then cleared);
      // a failed EDGE rule must not stop a later NODE rule from evaluating.
      for (let r = 0; r < styling.rules.length && nodeVisible; r++) {
        const rule = styling.rules[r];
        const source = ruleSources[r];
        if (keeps(source ? source[i] : null, rule)) continue;
        edgeVisible = false;
        if (rule.target === "NODE") nodeVisible = false;
      }
      target.aux[slot + 3] = (nodeVisible ? 1 : 0) + (edgeVisible ? 2 : 0);

      // At most one of the three node-value sources is active (one colouring);
      // the chain is precedence, not fallback between live sources.
      const value = valueSource
        ? valueSource[i]
        : styling.ordinalValues
          ? (styling.ordinalValues[ordinal] ?? Number.NaN)
          : nodeKey !== null && nodeValues
            ? (nodeValues.get(nodeKey) ?? Number.NaN)
            : Number.NaN;
      target.values[nodeOffset + i] = value;
      if (Number.isFinite(value)) {
        if (value < valueMin) valueMin = value;
        if (value > valueMax) valueMax = value;
      }
    }

    // Emit-or-skip: filtering per edge IS compaction — a hidden edge's index
    // pair never lands in the buffer, so `instanceCount` (the packed count)
    // already excludes it and nothing per-fragment tests it. `edgeValues` is
    // scattered index-aligned with the emitted pairs; both keys read the START
    // node's ordinal, the format's own convention for everything per-edge.
    const edgeColour = styling.edgeValues ?? null;
    const hiddenEdgeKeys = styling.hiddenEdgeKeys ?? null;
    const needsEdgeKey = edgeColour !== null || hiddenEdgeKeys !== null;
    for (let j = 0; j < cell.edgeCount; j++) {
      const a = cell.edges[j * 2];
      const b = cell.edges[j * 2 + 1];
      let edgeKey: string | null = null;
      if (needsEdgeKey) {
        edgeKey = `${cell.nodeOrdinals[a]}:${cell.nodeIds[a]}:${cell.nodeIds[b]}`;
        if (hiddenEdgeKeys?.has(edgeKey)) continue;
      }
      target.edges[edgeOffset * 2] = a + nodeOffset;
      target.edges[edgeOffset * 2 + 1] = b + nodeOffset;
      if (edgeColour) {
        const value = edgeColour.get(edgeKey as string) ?? Number.NaN;
        target.edgeValues[edgeOffset] = value;
        if (Number.isFinite(value)) {
          if (value < valueMin) valueMin = value;
          if (value > valueMax) valueMax = value;
        }
      }
      edgeOffset++;
    }

    nodeOffset += total;
    packed++;
  }

  return {
    nodes: nodeOffset,
    edges: edgeOffset,
    cells: packed,
    clamped,
    attributesMissing: [...missing].sort(),
    valueMin: Number.isFinite(valueMin) ? valueMin : null,
    valueMax: Number.isFinite(valueMax) ? valueMax : null,
  };
}
