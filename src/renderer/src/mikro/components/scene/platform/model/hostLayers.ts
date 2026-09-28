/**
 * The layer list as a HOST sees it (`scene/sceneHost.ts`): who is in the scene,
 * whether each is placed, and which edge places it.
 *
 * Deliberately narrow. A host workflow composed over the scene needs to name
 * layers and reason about their placement; it has no business with render
 * graphs, lenses or stores, and handing it the raw fragment would make every
 * field of it public API.
 *
 * `hostLayersKey` is the point of the module. The stored layer list churns
 * identity on every contrast tick, visibility toggle and placement-preview
 * frame, none of which a host cares about; the key moves only when something a
 * host can SEE moves, so a host panel subscribed through it does not re-render
 * sixty times a second while its own gizmo is being dragged (P17).
 *
 * Pure, no generated imports: the suite runs in `node`.
 */
import { isPlaceable } from "./placeable";

type StepLike = {
  inverted: boolean;
  transformation?: { id?: string; version?: number | null } | null;
};

export type HostLayerSource = {
  id: string;
  __typename?: string;
  name?: string | null;
  visible?: boolean | null;
  asAffine?: unknown | null;
  pathToWorld?: readonly StepLike[] | null;
  // The three shapes a layer's data arrives in. Structural and optional: each
  // layer kind carries exactly one of them.
  lens?: { dataset?: { id?: string | null } | null } | null;
  tableDataset?: { id?: string | null } | null;
  collection?: { coordinateSystem?: { id?: string | null } | null } | null;
  annotationCollection?: { coordinateSystem?: { id?: string | null } | null } | null;
};

/**
 * What a layer SHOWS, as something a host can name to the rest of the app (open
 * its page, hand it to a form): the array dataset behind a lens, the table
 * behind points or tracks, or — for a collection, which has no container of its
 * own to name — the coordinate system its geometry lives in.
 */
export type HostLayerData =
  | { kind: "arrayDataset"; id: string }
  | { kind: "tableDataset"; id: string }
  | { kind: "coordinateSystem"; id: string };

const dataOf = (layer: HostLayerSource): HostLayerData | null => {
  const dataset = layer.lens?.dataset?.id;
  if (dataset) return { kind: "arrayDataset", id: dataset };
  const table = layer.tableDataset?.id;
  if (table) return { kind: "tableDataset", id: table };
  const system = layer.collection?.coordinateSystem?.id ?? layer.annotationCollection?.coordinateSystem?.id;
  return system ? { kind: "coordinateSystem", id: system } : null;
};

export type HostLayer<Path = HostLayerSource["pathToWorld"]> = {
  id: string;
  name: string;
  typename: string;
  visible: boolean;
  /** The server placed it (`asAffine` non-null). Unplaceable layers are not drawn. */
  placeable: boolean;
  /**
   * The server-resolved path, for PROVENANCE: which edge places the layer, and
   * what kind of edge it is. Never to be composed into a matrix
   * (COORDINATE_SYSTEMS.md §1 R1). Null = unregistered, [] = the layer's own
   * space is the world.
   */
  pathToWorld: Path;
  /** What the layer shows, or null when the fragment does not say. */
  data: HostLayerData | null;
  /** The edge landing in the world — the one a registration would rewrite. */
  finalStep: { edgeId: string; version: number | null; inverted: boolean } | null;
};

const finalStepOf = (path: HostLayerSource["pathToWorld"]): HostLayer["finalStep"] => {
  const step = path?.at(-1);
  const edgeId = step?.transformation?.id;
  if (!step || !edgeId) return null;
  return { edgeId, version: step.transformation?.version ?? null, inverted: step.inverted };
};

export const toHostLayers = <L extends HostLayerSource>(
  layers: readonly L[],
  /** Normalized image layers carry the session's `visible`; they win. */
  visibleOverrides?: ReadonlyMap<string, boolean | undefined>,
): HostLayer<L["pathToWorld"]>[] =>
  layers.map((layer) => ({
    id: layer.id,
    name: layer.name?.trim() || layer.__typename || "Layer",
    typename: layer.__typename ?? "Layer",
    visible: (visibleOverrides?.get(layer.id) ?? layer.visible) !== false,
    placeable: isPlaceable(layer),
    pathToWorld: layer.pathToWorld,
    data: dataOf(layer),
    finalStep: finalStepOf(layer.pathToWorld),
  }));

/** Moves only when something a host can see moves. */
export const hostLayersKey = (layers: readonly HostLayer[]): string =>
  JSON.stringify(
    layers.map((layer) => [
      layer.id,
      layer.name,
      layer.typename,
      layer.visible,
      layer.placeable,
      layer.pathToWorld === null ? null : (layer.pathToWorld?.length ?? null),
      layer.finalStep?.edgeId ?? null,
      layer.finalStep?.version ?? null,
      layer.finalStep?.inverted ?? null,
    ]),
  );
