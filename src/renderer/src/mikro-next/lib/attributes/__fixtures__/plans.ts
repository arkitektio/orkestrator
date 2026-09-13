/**
 * Plan fixtures shared by the attribute tests: a table landing, a sparse
 * landing with its names hop, and a table landing whose chain crosses a
 * reference and then enters a matrix. Structural (`AttributePlanLike`), so
 * they exercise exactly what the core executes.
 */
import type {
  AttributePlanLike,
  SampleLike,
  SparseHopLike,
  TableHopLike,
} from "../attributeTypes";

export const arraySample = (over: Partial<SampleLike> = {}): SampleLike =>
  ({
    system: {
      id: "sys",
      axes: [
        { name: "t", order: 0 },
        { name: "y", order: 1 },
        { name: "x", order: 2 },
      ],
    },
    store: { id: "z1", bucket: "b", key: "k", shape: [4, 8, 8] },
    consumes: ["y", "x"],
    produces: ["i"],
    passthrough: ["t"],
    ...over,
  }) as SampleLike;

export const tableHop = (over: Partial<TableHopLike> = {}): TableHopLike => ({
  index: 0,
  parent: null,
  cardinality: "ONE",
  via: null,
  joinPath: [],
  table: { id: "t1", name: "morphology" },
  lookup: {
    kind: "TABLE",
    store: { id: "pq1", bucket: "b", key: "morph.parquet" },
    keyColumns: [
      { axis: "t", column: { name: "t", dtype: "BIGINT" } },
      { axis: "i", column: { name: "i", dtype: "BIGINT" } },
    ],
    attributes: [{ name: "area", dtype: "DOUBLE" }],
  },
  ...over,
});

export const tablePlan = (over: Partial<AttributePlanLike> = {}): AttributePlanLike => ({
  edge: { id: "e1", version: 1 },
  path: [],
  sample: arraySample(),
  hops: [tableHop()],
  ...over,
});

export const sparseHop = (over: Partial<SparseHopLike> = {}): SparseHopLike => ({
  index: 0,
  parent: null,
  cardinality: "ONE",
  via: null,
  joinPath: [],
  sparseDataset: {
    id: "sd1",
    name: "expression",
    axisNames: ["cell", "gene"],
    shape: [1000, 50],
    axisReferences: [{ axis: "gene", references: { id: "genes", name: "genes" } }],
  },
  lookup: {
    kind: "SPARSE",
    sparseArray: {
      id: "sa-cell",
      path: "layouts/axis0",
      indexedAxis: 0,
      indexedAxisName: "cell",
      store: {
        id: "ss1",
        key: "matrix.zarr",
        bucket: "zarr",
        shape: [1000, 50],
        layouts: [
          { path: "layouts/axis0", indexedAxis: 0, indexOrder: [1], nnz: 10, dtype: "float32", rangeReadable: false },
          { path: "layouts/axis1", indexedAxis: 1, indexOrder: [0], nnz: 10, dtype: "float32", rangeReadable: false },
        ],
      },
    },
    keyAxis: "cell",
    keyHeld: "i",
    valueAxes: ["gene"],
    attributes: [],
  },
  ...over,
});

/** The names hop after a sparse landing: MANY, bound along `gene`. */
export const namesHop = (over: Partial<TableHopLike> = {}): TableHopLike =>
  tableHop({
    index: 1,
    parent: 0,
    cardinality: "MANY",
    via: { column: null, axis: "gene" },
    table: { id: "genes", name: "genes" },
    lookup: {
      kind: "TABLE",
      store: { id: "pq-genes", bucket: "b", key: "genes.parquet" },
      keyColumns: [
        { axis: "gene", column: { name: "gene", dtype: "BIGINT", role: "COORDINATE", axisType: "INDEX" } },
      ],
      attributes: [{ name: "symbol", dtype: "VARCHAR", role: "LABEL" }],
    },
    ...over,
  });

export const sparsePlan = (over: Partial<AttributePlanLike> = {}): AttributePlanLike => ({
  edge: { id: "e-sparse", version: 1 },
  path: [],
  sample: arraySample({ passthrough: [] }),
  hops: [sparseHop(), namesHop()],
  ...over,
});

/**
 * A table landing whose chain crosses a reference (`cell_type` → types
 * table, ONE) and enters a matrix through its INDEX column (`i` → cells axis).
 */
export const chainPlan = (): AttributePlanLike => ({
  edge: { id: "e-chain", version: 1 },
  path: [],
  sample: arraySample({ passthrough: [] }),
  hops: [
    tableHop({
      lookup: {
        kind: "TABLE",
        store: { id: "pq1", bucket: "b", key: "morph.parquet" },
        keyColumns: [{ axis: "i", column: { name: "i", dtype: "BIGINT" } }],
        attributes: [
          { name: "area", dtype: "DOUBLE" },
          { name: "cell_type", dtype: "BIGINT" },
        ],
      },
    }),
    tableHop({
      index: 1,
      parent: 0,
      cardinality: "ONE",
      via: { column: { name: "cell_type" }, axis: null },
      table: { id: "types", name: "cell types" },
      lookup: {
        kind: "TABLE",
        store: { id: "pq-types", bucket: "b", key: "types.parquet" },
        keyColumns: [{ axis: "cell_type", column: { name: "type_id", dtype: "BIGINT" } }],
        attributes: [{ name: "label", dtype: "VARCHAR" }],
      },
    }),
    sparseHop({
      index: 2,
      parent: 0,
      cardinality: "ONE",
      via: { column: { name: "i" }, axis: "cell" },
      lookup: {
        kind: "SPARSE",
        sparseArray: sparseHop().lookup.sparseArray,
        keyAxis: "cell",
        keyHeld: "i",
        valueAxes: ["gene"],
        attributes: [],
      },
    }),
  ],
});
