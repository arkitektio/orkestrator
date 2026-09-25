/**
 * Builders for lineage-shaped fixtures, spelled as wire values so the suites
 * stay free of runtime imports from the generated api (node environment).
 */

import {
  graphFromComponent,
  type ComponentLike,
  type DatasetLike,
  type DerivationGraph,
  type EdgeLike,
  type LineageEdgeLike,
  type LineageLike,
  type LineageNodeLike,
  type OwnerLike,
  type ResidentLike,
  type SpaceLike,
} from "../spaceGraph";
import type { StagedLayerLike } from "../engine";

export type EdgeOverrides = {
  kind?: string;
  valueRelation?: string | null;
  field?: string | null;
  reason?: string | null;
};

/** An edge from `input` (the child's space) back into `output` (the source's). */
export const edge = (
  id: string,
  input: string,
  output: string,
  overrides: EdgeOverrides = {},
): EdgeLike => ({
  id,
  kind: overrides.kind ?? "IDENTITY",
  valueRelation: overrides.valueRelation ?? null,
  input: { id: input },
  output: { id: output },
  field: overrides.field ? { id: overrides.field } : null,
  reason: overrides.reason ?? null,
});

/** The FIELD edge keying a mask's pixels to a table of objects: mask → table. */
export const keyEdge = (id: string, mask: string, table: string): EdgeLike =>
  edge(id, mask, table, { kind: "FIELD", field: mask });

export type DatasetOverrides = {
  name?: string;
  intrinsic?: string | null;
  derivedFrom?: EdgeLike[];
  spec?: string[];
  contentTypes?: string[];
};

export const dataset = (
  id: string,
  overrides: DatasetOverrides = {},
): DatasetLike => ({
  id,
  name: overrides.name ?? `${id}.zarr`,
  spec: overrides.spec ?? [],
  intrinsicSystem:
    overrides.intrinsic === null ? null : { id: overrides.intrinsic ?? `grid-${id}` },
  derivedFrom: overrides.derivedFrom ?? [],
  sourceFiles: (overrides.contentTypes ?? []).map((contentType) => ({
    file: { contentType },
  })),
});

export const datasetResident = (
  id: string,
  overrides: DatasetOverrides = {},
): ResidentLike => ({ __typename: "ArrayDataset", ...dataset(id, overrides) });

export type LensOverrides = DatasetOverrides & {
  /** The lens's own space; defaults to the dataset's intrinsic grid. */
  space?: string | null;
  axisNames?: string[];
  shape?: number[];
  z?: string | null;
  intensity?: string | null;
  vector?: string | null;
  phasor?: string | null;
  slices?: { axis: string; start?: number | null; stop?: number | null }[];
};

/** A lens over dataset `datasetId`, with the structural fields the gate reads. */
export const lens = (
  id: string,
  datasetId: string,
  overrides: LensOverrides = {},
) => ({
  __typename: "Lens" as const,
  id,
  shape: overrides.shape ?? [512, 512],
  axisNames: overrides.axisNames ?? ["y", "x"],
  slices: (overrides.slices ?? []).map((slice) => ({
    axis: slice.axis,
    start: slice.start ?? null,
    stop: slice.stop ?? null,
    step: null,
  })),
  lensSpace:
    overrides.space === null
      ? null
      : { id: overrides.space ?? overrides.intrinsic ?? `grid-${datasetId}` },
  renderAxes: {
    x: "x",
    y: "y",
    z: overrides.z ?? null,
    intensity: overrides.intensity ?? null,
    vector: overrides.vector ?? null,
    phasor: overrides.phasor ?? null,
  },
  dataset: { ...dataset(datasetId, overrides), description: null },
});

export const table = (
  id: string,
  overrides: {
    name?: string;
    space?: string;
    roles?: string[];
    derivedFrom?: EdgeLike[];
  } = {},
): ResidentLike => ({
  __typename: "TableDataset",
  id,
  name: overrides.name ?? `${id}.parquet`,
  coordinateSystem: { id: overrides.space ?? `space-${id}` },
  derivedFrom: overrides.derivedFrom ?? [],
  columns: (overrides.roles ?? ["COORDINATE", "COORDINATE"]).map((role) => ({ role })),
});

export const mesh = (
  id: string,
  overrides: { space?: string; derivedFrom?: EdgeLike[] } = {},
): ResidentLike => ({
  __typename: "MeshCollection",
  id,
  version: "1",
  coordinateSystem: { id: overrides.space ?? `space-${id}` },
  derivedFrom: overrides.derivedFrom ?? [],
});

export const network = (
  id: string,
  overrides: { space?: string; derivedFrom?: EdgeLike[] } = {},
): ResidentLike => ({
  __typename: "NetworkCollection",
  id,
  version: "1",
  coordinateSystem: { id: overrides.space ?? `space-${id}` },
  derivedFrom: overrides.derivedFrom ?? [],
});

export const space = (id: string, residents: ResidentLike[], name = id): SpaceLike => ({
  id,
  name,
  residents,
});

/** A placement: `child` registered into `parent`, saying nothing about values. */
export const register = (id: string, child: string, parent: string): EdgeLike =>
  edge(id, child, parent, { kind: "AFFINE" });

/** The world's component, as the picker fetches it. */
export const component = (
  root: string,
  systems: SpaceLike[],
  transformations: EdgeLike[] = [],
): ComponentLike => ({ root: { id: root }, systems, transformations });

/**
 * A graph over spaces whose only edges are the residents' own `derivedFrom`:
 * enough for every rule the engine runs, which never asks how far below the
 * world a space is.
 */
export const graphFromSpaces = (spaces: SpaceLike[], root = "world"): DerivationGraph =>
  graphFromComponent(component(root, spaces));

// ---------------------------------------------------------------------------
// Lineage query shapes
// ---------------------------------------------------------------------------

export const owner = (
  typename: string,
  id: string,
  datasetId?: string,
): OwnerLike => ({
  __typename: typename,
  id,
  dataset: datasetId ? { id: datasetId } : null,
});

export const lineageEdge = (
  base: EdgeLike,
  inputOwners: OwnerLike[] = [],
  outputOwners: OwnerLike[] = [],
): LineageEdgeLike => ({
  ...base,
  input: base.input ? { id: base.input.id, residents: inputOwners } : null,
  output: base.output ? { id: base.output.id, residents: outputOwners } : null,
});

export const lineageDataset = (
  id: string,
  overrides: DatasetOverrides = {},
): LineageNodeLike => ({ __typename: "ArrayDataset", ...dataset(id, overrides) });

export const lineageTable = (
  id: string,
  overrides: { name?: string; space?: string; roles?: string[]; edgeIds?: string[] } = {},
): LineageNodeLike => ({
  __typename: "TableDataset",
  id,
  name: overrides.name ?? `${id}.parquet`,
  coordinateSystem: { id: overrides.space ?? `space-${id}` },
  derivedFrom: (overrides.edgeIds ?? []).map((edgeId) => ({ id: edgeId })),
  columns: (overrides.roles ?? ["COORDINATE", "COORDINATE"]).map((role) => ({ role })),
});

export const lineage = (
  root: string,
  nodes: LineageNodeLike[],
  edges: LineageEdgeLike[],
): LineageLike => ({ root: { id: root }, nodes, edges });

// ---------------------------------------------------------------------------
// Staged layers
// ---------------------------------------------------------------------------

export const stagedIntensity = (
  id: string,
  datasetId: string,
  overrides: {
    name?: string;
    space?: string;
    index?: number;
    colormap?: string;
    climMin?: number;
    climMax?: number;
    gamma?: number;
    blending?: string;
  } = {},
): StagedLayerLike => ({
  __typename: "IntensityLayer",
  id,
  name: overrides.name ?? `${datasetId} c${overrides.index ?? 0}`,
  blending: overrides.blending ?? "ADDITIVE",
  lens: {
    coordinateSystem: { id: overrides.space ?? `grid-${datasetId}` },
    dataset: { id: datasetId, intrinsicSystem: { id: `grid-${datasetId}` } },
  },
  intensityIndex: overrides.index ?? 0,
  colormap: overrides.colormap ?? "GREEN",
  climMin: overrides.climMin ?? null,
  climMax: overrides.climMax ?? null,
  gamma: overrides.gamma ?? null,
});

export const stagedLabel = (id: string, datasetId: string, name?: string): StagedLayerLike => ({
  __typename: "LabelLayer",
  id,
  name: name ?? `${datasetId} labels`,
  blending: "NORMAL",
  lens: {
    coordinateSystem: { id: `grid-${datasetId}` },
    dataset: { id: datasetId, intrinsicSystem: { id: `grid-${datasetId}` } },
  },
});

export const stagedPoints = (id: string, tableId: string): StagedLayerLike => ({
  __typename: "PointLayer",
  id,
  name: `${tableId} points`,
  blending: "NORMAL",
  tableDataset: { id: tableId, coordinateSystem: { id: `space-${tableId}` } },
});

export const stagedMesh = (id: string, collectionId: string): StagedLayerLike => ({
  __typename: "MeshLayer",
  id,
  name: `mesh ${collectionId}`,
  blending: "NORMAL",
  collection: { id: collectionId, coordinateSystem: { id: `space-${collectionId}` } },
});

export const stagedNetwork = (id: string, collectionId: string): StagedLayerLike => ({
  __typename: "NetworkLayer",
  id,
  name: `network ${collectionId}`,
  blending: "NORMAL",
  collection: { id: collectionId, coordinateSystem: { id: `space-${collectionId}` } },
});

export const stagedAnnotations = (id: string, collectionId: string): StagedLayerLike => ({
  __typename: "AnnotationLayer",
  id,
  name: `rois ${collectionId}`,
  blending: "NORMAL",
  annotationCollection: { id: collectionId, coordinateSystem: { id: `space-${collectionId}` } },
});
