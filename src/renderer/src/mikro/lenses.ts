/**
 * Lens vocabulary shared by every surface that shows a lens: the card, the
 * display line, the lens page's header and info panel, the layer panel, the
 * add-layer picker and the derived-datasets sidebar.
 *
 * A lens is a selection over a container, and there are six kinds of container.
 * An ARRAY lens selects by slices (half-open index ranges); every other lens
 * selects by windows (inclusive ranges in its container's space, an open side
 * as null). `describeLens` is the one place that difference is spelled out;
 * the array-only helpers above it (`lensLabel`, `lensTitle`) stay structural,
 * because each array caller selects its own subset of the fields.
 */
import {
  Grid3x3,
  Layers,
  Share2,
  Shapes,
  Table2,
  Tags,
  type LucideIcon,
} from "lucide-react";
import type {
  DetailLensFragment,
  LensFilter,
  LensKind,
  LensSubjectFragment,
  ListLensFragment,
} from "./api/graphql";

// Spelled as wire values: this file is pure vocabulary, read by node-environment
// suites (the add-layer engine's among them), and a runtime import of the
// generated enum would drag the Apollo client and `window` in with it.
const KIND = {
  Array: "ARRAY" as LensKind,
  Table: "TABLE" as LensKind,
  Sparse: "SPARSE" as LensKind,
  Mesh: "MESH" as LensKind,
  Network: "NETWORK" as LensKind,
  Annotation: "ANNOTATION" as LensKind,
};

export type LensLabelInput = {
  axisNames: readonly string[];
  shape: readonly number[];
  slices: readonly { axis: string; start?: number | null; stop?: number | null }[];
};

// A one-line descriptor that distinguishes lenses of the same dataset: whether
// the lens is the full array (slices: []) or a slice, plus its axes and shape.
export const lensLabel = (lens: LensLabelInput) => {
  const dims = `${lens.axisNames.join(" × ")} · ${lens.shape.join(" × ")}`;
  if (lens.slices.length === 0) return `full — ${dims}`;
  const slices = lens.slices
    .map((s) => `${s.axis}[${s.start ?? ""}:${s.stop ?? ""}]`)
    .join(", ");
  return `${slices} — ${dims}`;
};

export type LensTitleInput = {
  name?: string | null;
  slices: readonly { axis: string; start?: number | null; stop?: number | null }[];
};

/** What an unsliced lens is called everywhere: the dataset, looked at whole. */
export const WHOLE_ARRAY = "Whole array";

// The slices alone, without the axes and shape `lensLabel` appends — short
// enough to be a heading.
export const sliceSummary = (slices: LensTitleInput["slices"]) =>
  slices.map((s) => `${s.axis}[${s.start ?? ""}:${s.stop ?? ""}]`).join(", ");

/**
 * What to CALL a lens — the headline of its page, its tile and its row.
 *
 * The name someone gave it; failing that, "Whole array" for a lens that cuts
 * nothing; failing that, its slices. `lensLabel` is the technical line that
 * goes underneath: it always spells out the slices, axes and shape, whatever
 * the lens is called.
 */
export const lensTitle = (lens: LensTitleInput) =>
  lens.name?.trim() || (lens.slices.length === 0 ? WHOLE_ARRAY : sliceSummary(lens.slices));

// ---------------------------------------------------------------------------
// Every kind
// ---------------------------------------------------------------------------

export type LensTypename = NonNullable<LensSubjectFragment["__typename"]>;

export type ArrayDetailLens = Extract<DetailLensFragment, { __typename: "ArrayLens" }>;
export type ArrayListLens = Extract<ListLensFragment, { __typename: "ArrayLens" }>;

/** One container, named the way `LensFilter` names it: `{ tableDataset: id }`. */
export type LensContainerRef = Pick<
  LensFilter,
  | "dataset"
  | "tableDataset"
  | "sparseDataset"
  | "meshCollection"
  | "networkCollection"
  | "annotationCollection"
>;

export type LensKindInfo = {
  kind: LensKind;
  /** The kind as a noun: "Table lens". */
  label: string;
  /** What a lens that cuts nothing is called: the container, looked at whole. */
  whole: string;
  /** What the container is called, for a filter row or an empty state. */
  container: string;
  icon: LucideIcon;
  /** The `LensFilter` field that narrows to one container of this kind — and,
   *  under the same name, the container field of the kind's create input. */
  filterKey: keyof LensContainerRef;
};

export const LENS_KINDS: Record<LensTypename, LensKindInfo> = {
  ArrayLens: {
    kind: KIND.Array,
    label: "Array lens",
    whole: WHOLE_ARRAY,
    container: "Array dataset",
    icon: Layers,
    filterKey: "dataset",
  },
  TableLens: {
    kind: KIND.Table,
    label: "Table lens",
    whole: "Whole table",
    container: "Table dataset",
    icon: Table2,
    filterKey: "tableDataset",
  },
  SparseLens: {
    kind: KIND.Sparse,
    label: "Sparse lens",
    whole: "Whole matrix",
    container: "Sparse dataset",
    icon: Grid3x3,
    filterKey: "sparseDataset",
  },
  MeshLens: {
    kind: KIND.Mesh,
    label: "Mesh lens",
    whole: "Whole mesh collection",
    container: "Mesh collection",
    icon: Shapes,
    filterKey: "meshCollection",
  },
  NetworkLens: {
    kind: KIND.Network,
    label: "Network lens",
    whole: "Whole network",
    container: "Network collection",
    icon: Share2,
    filterKey: "networkCollection",
  },
  AnnotationLens: {
    kind: KIND.Annotation,
    label: "Annotation lens",
    whole: "All annotations",
    container: "Annotation collection",
    icon: Tags,
    filterKey: "annotationCollection",
  },
};

/** The kinds in the order a filter lists them: arrays first, as the most common. */
export const LENS_KIND_ORDER: readonly LensTypename[] = [
  "ArrayLens",
  "TableLens",
  "SparseLens",
  "MeshLens",
  "NetworkLens",
  "AnnotationLens",
];

export const lensKindInfo = (kind: LensKind): LensKindInfo =>
  LENS_KIND_ORDER.map((typename) => LENS_KINDS[typename]).find((info) => info.kind === kind)!;

export type WindowInput = { axis: string; min?: number | null; max?: number | null };

const windowNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(6)));

/**
 * Windows as one line. Spelled differently from slices on purpose: a slice is
 * a half-open INDEX range (`t[0:10]`), a window an INCLUSIVE range of
 * coordinates with either side possibly open (`t 0…10`, `x ≤ 5`).
 */
export const windowSummary = (windows: readonly WindowInput[]) =>
  windows
    .map(({ axis, min, max }) => {
      if (min != null && max != null) return `${axis} ${windowNumber(min)}…${windowNumber(max)}`;
      if (min != null) return `${axis} ≥ ${windowNumber(min)}`;
      if (max != null) return `${axis} ≤ ${windowNumber(max)}`;
      return axis;
    })
    .join(", ");

export type LensDescription = {
  info: LensKindInfo;
  /** The headline: the name someone gave it, else "Whole table", else the selection. */
  title: string;
  /** What it cuts, or null for a lens that cuts nothing. */
  selection: string | null;
  /** The technical line under the headline: always the selection, never the name. */
  label: string;
  container: { id: string; name: string };
};

type Describable = LensSubjectFragment & { name?: string | null };

const containerOf = (lens: LensSubjectFragment): LensDescription["container"] => {
  switch (lens.__typename) {
    case "ArrayLens":
      return lens.dataset;
    case "TableLens":
      return lens.tableDataset;
    case "SparseLens":
      return lens.sparseDataset;
    // Nameless containers: the version is all they can honestly show.
    case "MeshLens":
      return { id: lens.meshCollection.id, name: `Mesh collection ${lens.meshCollection.version}` };
    case "NetworkLens":
      return {
        id: lens.networkCollection.id,
        name: `Network collection ${lens.networkCollection.version}`,
      };
    case "AnnotationLens":
      return lens.annotationCollection;
  }
};

/**
 * Everything a surface says about a lens, whatever its kind: what to call it,
 * what it selects, and what it selects from.
 */
export const describeLens = (lens: Describable): LensDescription => {
  const info = LENS_KINDS[lens.__typename];
  const selection =
    lens.__typename === "ArrayLens"
      ? lens.slices.length
        ? sliceSummary(lens.slices)
        : null
      : lens.windows.length
        ? windowSummary(lens.windows)
        : null;
  return {
    info,
    title: lens.name?.trim() || selection || info.whole,
    selection,
    label: lens.__typename === "ArrayLens" ? lensLabel(lens) : (selection ?? "full"),
    container: containerOf(lens),
  };
};

/** Whether the lens cuts nothing: its container, looked at whole. */
export const isWholeLens = (lens: LensSubjectFragment) =>
  lens.__typename === "ArrayLens" ? lens.slices.length === 0 : lens.windows.length === 0;

/**
 * What a TILE leads with, and what it says underneath.
 *
 * `describeLens` titles a lens for a surface that already names its container
 * (the lens page: "cells.zarr · Whole array"). A tile stands alone in a grid,
 * and a grid of whole lenses titled "Whole table" says nothing: an unnamed
 * whole lens is headed by its container and annotated with "Whole table",
 * every other lens by its own title and annotated with its container.
 */
export const lensHeadline = (lens: Describable): { title: string; subline: string } => {
  const { title, info, container } = describeLens(lens);
  return isWholeLens(lens) && !lens.name?.trim()
    ? { title: container.name, subline: info.whole }
    : { title, subline: container.name };
};

/**
 * The picture a lens' tile shows. An array lens answers its own (falling back
 * to its dataset's server-side); the other kinds have only the scene they
 * nominate.
 */
export const lensSnapshot = (lens: ListLensFragment) =>
  lens.__typename === "ArrayLens"
    ? lens.latestSnapshot
    : (lens.defaultScene?.latestSnapshot ?? null);

/** The container of a lens: the filter that lists every lens over it, and what
 *  the "New lens" dialog is opened with to cut it afresh. */
export const containerFilter = (lens: LensSubjectFragment): LensContainerRef => ({
  [LENS_KINDS[lens.__typename].filterKey]: containerOf(lens).id,
});
