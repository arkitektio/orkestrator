import type { ApolloClient } from "@apollo/client";

import {
  AddLayerLensCapabilitiesDocument,
  AddLayerLineageDocument,
  AddLayerReachableDocument,
  AddLayerWorldGraphDocument,
  type AddLayerLensCapabilitiesQuery,
  type AddLayerReachableQuery,
  type AddLayerStagedLayerFragment,
} from "@/mikro/api/graphql";
import { createdLayer, intoScene } from "@/mikro/lib/scene/sceneLayerCache";
import type { LensRegistry } from "@/mikro/lib/lenses/lensRegistry";

import { buildSections, lensCandidateOf, type Capabilities } from "./candidates";
import { stagedFromLayers, suggestLensKinds, type LayerKind } from "./engine";
import { lensLayerRequest, resolveLensLayerLenses, type LensLayerRequest } from "./lensLayer";
import { graphFromComponent, graphFromLineage, mergeGraphs, type DerivationGraph } from "./spaceGraph";

/**
 * Adding an array lens to a scene with no one asked: the Add Layer engine's
 * own pick (its first kind, its defaults: the next channel colour, the clim a
 * sibling already has), made with the form's own request (`lensLayerRequest`).
 * What the scene does with a lens an action handed back.
 *
 * Every answer is asked fresh (`network-only`): the lens may not have existed
 * a moment ago, so no cached picker answer knows it. A lens the scene's world
 * does not reach, or the server would not draw, is not guessed at.
 */

/** Which lenses the server would draw in a space, and which of them are what. */
export const capabilitiesFrom = (data: AddLayerLensCapabilitiesQuery | undefined): Capabilities =>
  data
    ? {
        drawable: new Set(data.drawable.map((lens) => lens.id)),
        labels: new Set(data.labels.map((lens) => lens.id)),
        phasor: new Set(data.phasor.map((lens) => lens.id)),
        rgb: new Set(data.rgb.map((lens) => lens.id)),
        // Which axis is which, for every lens the server would draw: its own
        // answer, in place of one read off the axis types here.
        axes: new Map(
          data.drawable.flatMap((lens) =>
            lens.__typename === "ArrayLens" ? [[lens.id, lens.suggestedRenderAxes] as const] : [],
          ),
        ),
      }
    : null;

export type StageOutcome =
  /** `layer` is the new layer's id, when the server answered with one. */
  | { status: "added"; kind: LayerKind; label: string; layer?: string }
  /** The scene already draws it (a rerun hands the same lens back). */
  | { status: "present"; label: string }
  /** The world does not reach it, or nothing here would draw it. */
  | { status: "unplaceable" };

const FRESH = { fetchPolicy: "network-only" } as const;

type SliceKey = { axis: string; start?: number | null; stop?: number | null; step?: number | null };

/**
 * One selection spelled one way, without the channel axis: a layer drawing
 * ONE channel of a lens is made from the lens with that channel pinned, so it
 * selects what the lens does on every other axis.
 */
const selectionKey = (slices: readonly SliceKey[] | null | undefined, channelAxis: string | null): string =>
  (slices ?? [])
    .filter((slice) => slice.axis !== channelAxis)
    .map((slice) => `${slice.axis}:${slice.start ?? ""}:${slice.stop ?? ""}:${slice.step ?? 1}`)
    .sort()
    .join("|");

/**
 * Whether the scene already draws `lens`: a layer over the lens itself, or
 * over one channel of it. Asked before the engine runs: its defaults pick the
 * next channel nobody drew yet, so a rerun asked after it would add channel
 * after channel of a lens that is already in the scene.
 */
export const drawsLens = (
  layers: readonly { lens?: { id: string; slices?: readonly SliceKey[] | null; dataset: { id: string } } | null }[],
  lens: { id: string; slices?: readonly SliceKey[] | null; dataset: { id: string } },
  channelAxis: string | null,
): boolean => {
  const key = selectionKey(lens.slices, channelAxis);
  return layers.some(
    ({ lens: drawn }) =>
      !!drawn &&
      (drawn.id === lens.id ||
        (channelAxis !== null && drawn.dataset.id === lens.dataset.id && selectionKey(drawn.slices, channelAxis) === key)),
  );
};

/** What the engine would add for a lens, before anything is sent: the request, or why not. */
export type LensLayerPlan =
  | { status: "ready"; kind: LayerKind; label: string; request: LensLayerRequest }
  | { status: "present"; label: string }
  | { status: "unplaceable" };

type ReachableWorld = NonNullable<AddLayerReachableQuery["scene"]["worldCoordinateSystem"]>;

/**
 * What the engine reads of the scene's world, once per batch of lenses: what
 * the world reaches (`coordinateGraph`) and which lenses the server would draw
 * in it (four `placeableIn` walks). Both are the expensive part of a plan and
 * the same for every lens of one run, so a caller staging several lenses
 * loads it once (`loadStageWorld`) and hands it to each `planLensLayer`.
 * Asked fresh: the run that handed the lenses back may have just made them.
 */
export type StageWorld = { world: ReachableWorld; graph: DerivationGraph; capabilities: Capabilities };

const worldOf = async (client: ApolloClient<unknown>, world: ReachableWorld): Promise<StageWorld> => {
  const [{ data: component }, { data: capabilityData }] = await Promise.all([
    client.query({ query: AddLayerWorldGraphDocument, variables: { world: world.id, maxDepth: 6 }, ...FRESH }),
    client.query({ query: AddLayerLensCapabilitiesDocument, variables: { space: world.id }, ...FRESH }),
  ]);
  return { world, graph: graphFromComponent(component.coordinateGraph), capabilities: capabilitiesFrom(capabilityData) };
};

const reachableOf = async (client: ApolloClient<unknown>, scene: string) =>
  (await client.query({ query: AddLayerReachableDocument, variables: { scene }, ...FRESH })).data.scene;

/** The scene's world as a batch of plans shares it; null when the scene has no world. */
export const loadStageWorld = async (client: ApolloClient<unknown>, scene: string): Promise<StageWorld | null> => {
  const world = (await reachableOf(client, scene)).worldCoordinateSystem;
  return world ? worldOf(client, world) : null;
};

/**
 * The Add Layer engine's pick for a lens, as the create request it would send.
 * `extraLayers` are layers the scene draws that the server does not know of
 * (a float's staged previews): they take a channel colour and count as
 * "already drawn" exactly like saved ones. `world` is the batch's shared
 * `loadStageWorld`; without it the plan loads its own.
 */
export const planLensLayer = async (
  client: ApolloClient<unknown>,
  registry: Pick<LensRegistry, "ensureChannelLens">,
  input: {
    scene: string;
    lens: string;
    extraLayers?: readonly AddLayerStagedLayerFragment[];
    world?: Promise<StageWorld | null>;
  },
): Promise<LensLayerPlan> => {
  // The scene's layers, asked every time: the lens before this one in a batch
  // may have added one, and it takes a channel colour.
  const scene = await reachableOf(client, input.scene);
  const reached = scene.worldCoordinateSystem;
  if (!reached) return { status: "unplaceable" };
  const shared = input.world ? await input.world : null;
  const { world, graph, capabilities } = shared && shared.world.id === reached.id ? shared : await worldOf(client, reached);
  const sceneLayers = [...scene.layers, ...(input.extraLayers ?? [])];
  const staged = stagedFromLayers(sceneLayers);
  const option = buildSections({
    world: { id: world.id, name: world.name },
    graph,
    placeable: new Set(world.placedSystems.map((space) => space.id)),
    capabilities,
    search: "",
    staged,
  })
    .flatMap((section) => section.entries)
    .flatMap((entry) => (entry.kind === "dataset" ? entry.lenses : []))
    .find((candidate) => candidate.lens.id === input.lens);
  if (!option) return { status: "unplaceable" };

  // The lens' whole provenance, as the form reads it once a row is chosen.
  const lens = lensCandidateOf(option.lens, capabilities);
  const layerLenses = sceneLayers.map((layer) => ({ lens: "lens" in layer ? layer.lens : null }));
  if (drawsLens(layerLenses, lens, lens.renderAxes?.intensity ?? null)) {
    return { status: "present", label: option.label };
  }
  const rootSpace = lens.dataset.intrinsicSystem?.id ?? lens.lensSpace?.id;
  const lineage = rootSpace
    ? (await client.query({ query: AddLayerLineageDocument, variables: { coordinateSystem: rootSpace, maxDepth: 4 }, ...FRESH })).data
    : undefined;
  const merged = lineage ? mergeGraphs(graph, graphFromLineage(lineage.lineageGraph)) : graph;
  const suggestion = suggestLensKinds(merged, lens, capabilities, staged);
  const kind = suggestion.kinds[0];
  const label = option.label;
  if (!kind) return { status: "unplaceable" };

  const lenses = await resolveLensLayerLenses(registry, kind, lens, suggestion.defaults);
  const request = lensLayerRequest({ kind, scene: input.scene, lens: lens.id, lenses, defaults: suggestion.defaults });
  if (!request) return { status: "unplaceable" };
  return { status: "ready", kind, label, request };
};

/** Send a planned request: the layer is made, and linked into the cached scene to show it. */
export const createPlannedLayer = async (
  client: ApolloClient<unknown>,
  request: LensLayerRequest,
): Promise<string | undefined> => {
  const created = await client.mutate({
    mutation: request.document,
    variables: request.variables,
    // The scene view reconciles its stores when the cached scene changes, so
    // the layer appears without any store plumbing (as the form's does).
    ...intoScene(request.variables.input.scene),
  } as Parameters<typeof client.mutate>[0]);
  // Every create mutation answers with the one layer it made, under its own field name.
  return createdLayer(created.data)?.id;
};

export const stageLens = async (
  client: ApolloClient<unknown>,
  registry: Pick<LensRegistry, "ensureChannelLens">,
  input: { scene: string; lens: string; world?: Promise<StageWorld | null> },
): Promise<StageOutcome> => {
  const plan = await planLensLayer(client, registry, input);
  if (plan.status !== "ready") return plan;
  const layer = await createPlannedLayer(client, plan.request);
  return { status: "added", kind: plan.kind, label: plan.label, layer };
};
