import { ApolloClient, NormalizedCache } from "@apollo/client";
import {
  CreateExperimentFromCoordinateSystemDocument,
  CreateExperimentFromCoordinateSystemMutation,
  CreateExperimentFromCoordinateSystemMutationVariables,
} from "../api/graphql";

/**
 * Stage an experiment over a clock: the server walks everything placeable on it
 * (traces, spike sets, event tables, annotations) and adds a layer per item —
 * mikro's `createSceneFromCoordinateSystem`, over time.
 *
 * This is how a simulation run becomes something the timeline draws: its clock
 * is the coordinate system its recordings and stimuli are sampled onto, so
 * staging over it lays out the whole run. Returns the new experiment's id.
 */
export const openClockOnTimeline = async (
  client: ApolloClient<NormalizedCache>,
  clock: string,
  name?: string | null,
): Promise<string> => {
  const created = await client.mutate<
    CreateExperimentFromCoordinateSystemMutation,
    CreateExperimentFromCoordinateSystemMutationVariables
  >({
    mutation: CreateExperimentFromCoordinateSystemDocument,
    variables: { input: { coordinateSystem: clock, name: name ?? null } },
  });
  const id = created.data?.createExperimentFromCoordinateSystem?.id;
  if (!id) throw new Error("The server did not return the staged experiment");
  return id;
};
