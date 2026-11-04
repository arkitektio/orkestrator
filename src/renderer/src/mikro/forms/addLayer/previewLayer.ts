import type { ApolloClient } from "@apollo/client";

import {
  CreateIntensityLayerDocument,
  CreateLabelLayerDocument,
  CreateMeshLayerDocument,
  CreatePhasorLayerDocument,
  CreateRgbLayerDocument,
  CreateVectorLayerDocument,
  CreateVolumeLayerDocument,
  PreviewLayerDocument,
  type PreviewLayerInput,
  type PreviewLayerQuery,
} from "@/mikro/api/graphql";

import type { LensLayerRequest } from "./lensLayer";

/**
 * A layer staged and not saved: `previewLayer` answers with the row a create
 * mutation WOULD write, so the scene draws it from the same fields a saved
 * layer has, and keeping it is the same input sent to that create. One input,
 * two answers: nothing here builds a layer of its own.
 */

/** The preview as the scene draws it (`...SceneLayer`). */
export type PreviewedLayer = PreviewLayerQuery["previewLayer"];
/** The same preview as the Add Layer engine counts it (`...AddLayerStagedLayer`). */
export type PreviewedEngineLayer = PreviewLayerQuery["engine"];

/** Which create a preview input names. */
export type PreviewArm = Exclude<keyof PreviewLayerInput, "image">;

const ARM_OF_KIND: Record<LensLayerRequest["kind"], PreviewArm> = {
  INTENSITY: "intensity",
  RGB: "rgb",
  VOLUME: "volume",
  LABEL: "label",
  VECTOR: "vector",
  PHASOR: "phasor",
};

const CREATE_OF_ARM = {
  intensity: CreateIntensityLayerDocument,
  rgb: CreateRgbLayerDocument,
  volume: CreateVolumeLayerDocument,
  label: CreateLabelLayerDocument,
  vector: CreateVectorLayerDocument,
  phasor: CreatePhasorLayerDocument,
  mesh: CreateMeshLayerDocument,
} as const satisfies Record<PreviewArm, unknown>;

/** The Add Layer engine's request, as the preview input naming the same create. */
export const previewInputOf = (request: LensLayerRequest): PreviewLayerInput =>
  // One arm, keyed by the request's kind: the computed key is what TS cannot follow.
  ({ [ARM_OF_KIND[request.kind]]: request.variables.input }) as unknown as PreviewLayerInput;

/** A mesh lens drawn as a mesh layer, as `stageMeshLens` would make it. */
export const meshPreviewInput = (input: { scene: string; lens: string }): PreviewLayerInput => ({
  mesh: { scene: input.scene, lens: input.lens },
});

/** The one arm an input sets, and its value. */
export const previewArmOf = (input: PreviewLayerInput): { arm: PreviewArm; value: Record<string, unknown> } => {
  const set = (Object.keys(CREATE_OF_ARM) as PreviewArm[]).filter((arm) => input[arm] != null);
  if (set.length !== 1) throw new Error(`A preview names exactly one layer, got ${set.length}`);
  return { arm: set[0], value: input[set[0]] as Record<string, unknown> };
};

/**
 * Ask for the layer, built and not saved. Never cached: every preview has the
 * same negative id, so normalizing it would make two previews one object.
 */
export const fetchPreviewLayer = async (
  client: ApolloClient<unknown>,
  input: PreviewLayerInput,
): Promise<{ layer: PreviewedLayer; engine: PreviewedEngineLayer }> => {
  const { data } = await client.query({
    query: PreviewLayerDocument,
    variables: { input },
    fetchPolicy: "no-cache",
  });
  return { layer: data.previewLayer, engine: data.engine };
};

/**
 * Keep a preview: the same input sent to its create, with what the viewer
 * changed in the meantime folded in (`overrides`: only fields the create
 * takes). Resolves once the scene's refetch has the saved layer, so the
 * staged one can be dropped without the layer blinking out.
 */
export const keepPreviewLayer = async (
  client: ApolloClient<unknown>,
  input: PreviewLayerInput,
  overrides: { visible?: boolean } = {},
): Promise<string | undefined> => {
  const { arm, value } = previewArmOf(input);
  const created = await client.mutate({
    mutation: CREATE_OF_ARM[arm],
    variables: { input: { ...value, ...overrides } },
    refetchQueries: ["GetScene"],
    awaitRefetchQueries: true,
  } as Parameters<typeof client.mutate>[0]);
  const answered = Object.values((created.data ?? {}) as Record<string, { id?: string } | null>)[0];
  return answered?.id;
};
