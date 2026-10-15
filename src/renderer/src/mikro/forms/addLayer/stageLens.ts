import type { ApolloClient } from "@apollo/client";

import {
  AddLayerLensCapabilitiesDocument,
  AddLayerLineageDocument,
  AddLayerReachableDocument,
  AddLayerWorldGraphDocument,
  type AddLayerLensCapabilitiesQuery,
} from "@/mikro/api/graphql";
import type { LensRegistry } from "@/mikro/lib/lenses/lensRegistry";

import { buildSections, lensCandidateOf, type Capabilities } from "./candidates";
import { stagedFromLayers, suggestLensKinds, type LayerKind } from "./engine";
import { lensLayerRequest, resolveLensLayerLenses } from "./lensLayer";
import { graphFromComponent, graphFromLineage, mergeGraphs } from "./spaceGraph";

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
  | { status: "added"; kind: LayerKind; label: string }
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

export const stageLens = async (
  client: ApolloClient<unknown>,
  registry: Pick<LensRegistry, "ensureChannelLens">,
  input: { scene: string; lens: string },
): Promise<StageOutcome> => {
  const { data } = await client.query({
    query: AddLayerReachableDocument,
    variables: { scene: input.scene },
    ...FRESH,
  });
  const world = data.scene.worldCoordinateSystem;
  if (!world) return { status: "unplaceable" };

  const [{ data: component }, { data: capabilityData }] = await Promise.all([
    client.query({ query: AddLayerWorldGraphDocument, variables: { world: world.id, maxDepth: 6 }, ...FRESH }),
    client.query({ query: AddLayerLensCapabilitiesDocument, variables: { space: world.id }, ...FRESH }),
  ]);
  const graph = graphFromComponent(component.coordinateGraph);
  const capabilities = capabilitiesFrom(capabilityData);
  const staged = stagedFromLayers(data.scene.layers);
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
  const layerLenses = data.scene.layers.map((layer) => ({ lens: "lens" in layer ? layer.lens : null }));
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

  await client.mutate({
    mutation: request.document,
    variables: request.variables,
    // The scene view reinitializes its stores when GetScene changes, so the
    // layer appears without any store plumbing (as the form's does).
    refetchQueries: ["GetScene"],
  } as Parameters<typeof client.mutate>[0]);
  return { status: "added", kind, label };
};
