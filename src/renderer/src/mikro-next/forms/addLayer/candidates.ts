/**
 * What the Add Layer picker offers, organised the way someone staging a scene
 * thinks about it: the *things* they have — a dataset, a mesh collection, a
 * table of measurements, a set of annotations — not the residents of a
 * coordinate system.
 *
 * The reachability question is still answered by the coordinate graph, and still
 * by the same field: `worldCoordinateSystem.placedSystems` is every space with a
 * traversable path into the world — "the same set the `placeableIn` filters
 * answer from, so a picker and a layer mutation cannot disagree". What changed
 * is that a space is no longer the heading. It is a caption on the entry it made
 * reachable, because two residents of one dataset regularly live in two spaces
 * (an unsliced lens sits in the intrinsic grid, a crop owns its own), and a
 * picker grouped by space has to tear them apart to say so.
 *
 * Three things are dropped rather than dimmed:
 *
 *   DataArrays        a pyramid level is an implementation detail of its
 *                     dataset. Nobody adds level 3 to a scene, and a multiscale
 *                     dataset was filling the list with six rows saying so.
 *   lens-less datasets a dataset whose lenses the server would refuse to draw
 *                     cannot become a layer here at all.
 *   non-drawable lenses same.
 *
 * The old shape listed all three with a reason attached. A reason is only worth
 * a row when the thing is something you would otherwise reach for; a pyramid
 * level never is.
 *
 * What each row BECOMES is not decided here. `engine.ts` reads it off the
 * lens's structure, the server's capability sets and the derivation graph
 * (`lineage.ts`); this module only assembles the rows, hands each its
 * suggestion, and orders them by their relation to what the scene already
 * draws.
 */

import { residentName } from "@/mikro-next/components/coordinates/residents";
import type {
  AddLayerCandidateFragment,
  ArrayDatasetSpec,
} from "../../api/graphql";
import { lensLabel } from "../../lenses";
import {
  emptyStaged,
  relationToScene,
  suggestLensKinds,
  suggestTableKinds,
  extentOf,
  type Capabilities,
  type LayerKind,
  type LensSuggestion,
  type Relation,
  type StagedScene,
  type TableKind,
  type TableSuggestion,
} from "./engine";
import {
  nodeOfCandidate,
  treeSpaces,
  type DerivationGraph,
  type NodeKey,
} from "./spaceGraph";

// The kind vocabulary and the structural gate live in the engine now, with
// the lineage rules that order within the gate; they are re-exported so the
// picker's callers keep one import. Type-only imports of the generated api
// keep the file free of runtime imports from it — that module pulls in the
// Apollo client and with it `window`, and this one is pure logic that runs
// in vitest's `node` environment.
export {
  LAYER_KIND_INFO,
  TABLE_KIND_INFO,
  inferLensKinds,
  inferTableKinds,
  isRgbCapable,
  isVectorField,
  isVolumetric,
  hasPhasorAxis,
  type Capabilities,
  type LayerKind,
  type TableKind,
} from "./engine";

export type Candidate = AddLayerCandidateFragment;

export type LensCandidate = Extract<Candidate, { __typename: "Lens" }>;
export type TableCandidate = Extract<Candidate, { __typename: "TableDataset" }>;
export type MeshCandidate = Extract<Candidate, { __typename: "MeshCollection" }>;
export type NetworkCandidate = Extract<Candidate, { __typename: "NetworkCollection" }>;
export type AnnotationCandidate = Extract<
  Candidate,
  { __typename: "AnnotationCollection" }
>;
export type DatasetCandidate = Extract<
  Candidate,
  { __typename: "ArrayDataset" }
>;

/** The space that makes an entry reachable — a caption, not a heading. */
export type SpaceRef = { id: string; name: string; isWorld: boolean };

/** The narrowest shape of a space this module needs. */
export type SpaceLike = {
  id: string;
  name: string;
  residents: readonly Candidate[];
};

/** The scene's world: the root of the children tree, and every row's frame. */
export type WorldRef = { id: string; name: string };

// ---------------------------------------------------------------------------
// What a source becomes
// ---------------------------------------------------------------------------

/** One way of looking at a dataset, and what it would become. */
export type LensOption = {
  key: string;
  lens: LensCandidate;
  /** "full — y × x · 512 × 512", the line that tells two lenses apart. */
  label: string;
  space: SpaceRef;
  /** Every kind the server would accept, the inferred one first. */
  kinds: LayerKind[];
  /** The ranking behind `kinds`: its evidence, notes and first-frame defaults. */
  suggestion: LensSuggestion;
};

/** What every entry knows about its place in the scene's lineage. */
type Related = {
  /** The container this entry is, in the derivation graph. */
  nodeKey: NodeKey;
  /** How it relates to what the scene already draws, or null for no relation. */
  relation: Relation | null;
};

export type DatasetEntry = Related & {
  kind: "dataset";
  key: string;
  id: string;
  name: string;
  description?: string | null;
  /** What the dataset structurally is — the entry's icon and subtitle. */
  specs: readonly ArrayDatasetSpec[];
  /** Drawable lenses only, the unsliced one first. Never empty. */
  lenses: LensOption[];
};

export type TableEntry = Related & {
  kind: "table";
  key: string;
  table: TableCandidate;
  name: string;
  secondary?: string;
  space: SpaceRef;
  /** Inferred first, as everywhere else. */
  kinds: TableKind[];
  suggestion: TableSuggestion;
};

export type MeshEntry = Related & {
  kind: "mesh";
  key: string;
  mesh: MeshCandidate;
  name: string;
  secondary?: string;
  space: SpaceRef;
};

export type NetworkEntry = Related & {
  kind: "network";
  key: string;
  network: NetworkCandidate;
  name: string;
  secondary?: string;
  space: SpaceRef;
};

export type AnnotationEntry = Related & {
  kind: "annotation";
  key: string;
  collection: AnnotationCandidate;
  name: string;
  secondary?: string;
  space: SpaceRef;
};

export type Entry = DatasetEntry | TableEntry | MeshEntry | NetworkEntry | AnnotationEntry;

export type SectionId = "datasets" | "meshes" | "networks" | "tables" | "annotations";

export type Section = {
  id: SectionId;
  title: string;
  entries: Entry[];
};

/** What step 2 is handed once something is chosen. */
export type Source =
  | { kind: "lens"; dataset: DatasetEntry; option: LensOption }
  | { kind: "table"; entry: TableEntry }
  | { kind: "mesh"; entry: MeshEntry }
  | { kind: "network"; entry: NetworkEntry }
  | { kind: "annotation"; entry: AnnotationEntry };

// ---------------------------------------------------------------------------
// Building the sections
// ---------------------------------------------------------------------------

const matches = (haystack: string | null | undefined, needle: string) =>
  !!haystack && haystack.toLowerCase().includes(needle);

const columnSummary = (table: TableCandidate) =>
  table.description || table.columns.map((column) => column.name).join(", ");

/**
 * Every source under a scene's world, grouped by what it is.
 *
 * The rows come from the world's children tree (`treeSpaces`): the world
 * itself, then every space an edge lands in from below, level by level. When
 * the server's `placedSystems` is given it is the last word on which of those
 * spaces are offered — a tree walk cannot know which chains condense to one
 * affine map — and the world is always offered, since data sitting IN it is
 * trivially composable there.
 *
 * A dataset is assembled from two directions and keyed by its id, because the
 * two halves need not share a space: the `ArrayDataset` resident carries the
 * name and the spec, its `Lens` residents carry what can actually be drawn. A
 * lens whose dataset is not itself a resident still yields an entry — the lens
 * knows its dataset — and a dataset with no drawable lens yields none.
 */
export const buildSections = (input: {
  world: WorldRef;
  /** The world's component (`graphFromComponent`), children walked from the world. */
  graph: DerivationGraph;
  /** The server's placeability answer, as space ids. Omitted: every space in the tree. */
  placeable?: ReadonlySet<string>;
  capabilities: Capabilities;
  search: string;
  /** What the scene already draws. Defaults to nothing. */
  staged?: StagedScene;
}): Section[] => {
  const { world, graph, capabilities } = input;
  const staged = input.staged ?? emptyStaged();
  const search = input.search.trim().toLowerCase();

  // How a candidate relates to the scene, from its node in the graph. A node
  // the graph does not know (a resident with no space) has no relation.
  const relate = (
    candidate: { __typename: string; id: string; dataset?: { id: string } },
    channels = 1,
  ): Related => {
    const node = nodeOfCandidate(graph, candidate);
    return {
      nodeKey: node?.key ?? `${candidate.__typename}:${candidate.id}`,
      relation: node ? relationToScene(graph, node, staged, channels) : null,
    };
  };

  // The residents were fetched as the generated candidate fragment; the graph
  // holds them structurally typed, so the cast only restates what was put in.
  const spaces = treeSpaces(graph, input.placeable).map(
    (space): SpaceLike => ({
      id: space.id,
      name: space.id === world.id ? world.name : space.name,
      residents: space.residents as readonly Candidate[],
    }),
  );

  const datasets = new Map<string, DatasetEntry>();
  const tables: TableEntry[] = [];
  const meshes: MeshEntry[] = [];
  const networks: NetworkEntry[] = [];
  const annotations: AnnotationEntry[] = [];

  const datasetEntry = (
    dataset: { id: string; name: string; description?: string | null },
    specs?: readonly ArrayDatasetSpec[],
  ): DatasetEntry => {
    const existing = datasets.get(dataset.id);
    if (existing) {
      // The resident is the better source for both — a lens' nested dataset
      // fetches no spec, and its description is the same string.
      if (specs?.length) existing.specs = specs;
      existing.description ??= dataset.description;
      return existing;
    }
    const created: DatasetEntry = {
      kind: "dataset",
      key: `ArrayDataset:${dataset.id}`,
      id: dataset.id,
      name: dataset.name,
      description: dataset.description,
      specs: specs ?? [],
      lenses: [],
      ...relate({ __typename: "ArrayDataset", id: dataset.id }),
    };
    datasets.set(dataset.id, created);
    return created;
  };

  for (const space of spaces) {
    const spaceRef: SpaceRef = {
      id: space.id,
      name: space.name,
      isWorld: space.id === world.id,
    };

    for (const resident of space.residents) {
      switch (resident.__typename) {
        case "Lens": {
          const suggestion = suggestLensKinds(graph, resident, capabilities, staged);
          // Not drawable as anything — the server would refuse the creation, so
          // the lens is not offered at all.
          if (!suggestion.kinds.length) break;
          const entry = datasetEntry(resident.dataset, resident.dataset.spec);
          entry.lenses.push({
            key: `Lens:${resident.id}`,
            lens: resident,
            label: lensLabel(resident),
            space: spaceRef,
            kinds: suggestion.kinds,
            suggestion,
          });
          // The relation reads the channel count off a lens, which the dataset
          // resident does not carry; the widest lens answers for the entry.
          const channels = extentOf(resident, resident.renderAxes?.intensity);
          if (channels > 1) {
            Object.assign(entry, relate({ __typename: "ArrayDataset", id: resident.dataset.id }, channels));
          }
          break;
        }
        case "ArrayDataset":
          datasetEntry(resident, resident.spec);
          break;
        case "TableDataset": {
          const suggestion = suggestTableKinds(graph, resident);
          tables.push({
            kind: "table",
            key: `TableDataset:${resident.id}`,
            table: resident,
            name: resident.name,
            secondary: columnSummary(resident),
            space: spaceRef,
            kinds: suggestion.kinds,
            suggestion,
            ...relate(resident),
          });
          break;
        }
        case "MeshCollection":
          meshes.push({
            kind: "mesh",
            key: `MeshCollection:${resident.id}`,
            mesh: resident,
            name: residentName(resident),
            secondary: `spec ${resident.specVersion}`,
            space: spaceRef,
            ...relate(resident),
          });
          break;
        // A konnektion collection. Nameless like a mesh collection, so the row
        // shows the version and the spec — which is what `residentName` already
        // assumes for both.
        case "NetworkCollection":
          networks.push({
            kind: "network",
            key: `NetworkCollection:${resident.id}`,
            network: resident,
            name: residentName(resident),
            secondary: `spec ${resident.specVersion}`,
            space: spaceRef,
            ...relate(resident),
          });
          break;
        case "AnnotationCollection":
          annotations.push({
            kind: "annotation",
            key: `AnnotationCollection:${resident.id}`,
            collection: resident,
            name: resident.name,
            secondary: resident.description ?? undefined,
            space: spaceRef,
            ...relate(resident),
          });
          break;
        case "DataArray":
          // A pyramid level of its dataset. Never a layer, never a row.
          break;
      }
    }
  }

  const datasetEntries = [...datasets.values()]
    .filter((entry) => entry.lenses.length > 0)
    .map((entry) => ({
      ...entry,
      // The unsliced lens is the one someone means by "the dataset", so it is
      // what the entry itself adds; the crops sort under it by their own label.
      lenses: entry.lenses
        .slice()
        .sort(
          (a, b) =>
            a.lens.slices.length - b.lens.slices.length ||
            a.label.localeCompare(b.label),
        ),
    }));

  // What relates to the scene floats up — a segmentation of a staged image
  // above an unrelated stack — and what is already there sinks; within a
  // rank, by name.
  const byName = <T extends { name: string; key: string; relation: Relation | null }>(
    a: T,
    b: T,
  ) =>
    (b.relation?.rank ?? 0) - (a.relation?.rank ?? 0) ||
    a.name.localeCompare(b.name) ||
    a.key.localeCompare(b.key);

  const sections: Section[] = [
    {
      id: "datasets",
      title: "Datasets",
      entries: datasetEntries.sort(byName),
    },
    { id: "meshes", title: "Meshes", entries: meshes.sort(byName) },
    { id: "networks", title: "Networks", entries: networks.sort(byName) },
    { id: "tables", title: "Measurements", entries: tables.sort(byName) },
    { id: "annotations", title: "Annotations", entries: annotations.sort(byName) },
  ];

  if (!search) return sections.filter((section) => section.entries.length > 0);

  return sections
    .map((section) => ({
      ...section,
      entries: section.entries.filter((entry) => entryMatches(entry, search)),
    }))
    .filter((section) => section.entries.length > 0);
};

/**
 * A search matches what an entry shows: its name, its subtitle, the space that
 * made it reachable, and — for a dataset — any of its lenses. Matching the space
 * keeps the old behaviour of looking a stage frame up by name working, now that
 * the space is a caption rather than a heading.
 */
const entryMatches = (entry: Entry, search: string): boolean => {
  if (matches(entry.name, search)) return true;
  if (entry.kind === "dataset") {
    return (
      matches(entry.description, search) ||
      entry.lenses.some(
        (option) =>
          matches(option.label, search) || matches(option.space.name, search),
      )
    );
  }
  return matches(entry.secondary, search) || matches(entry.space.name, search);
};
