import { ApolloClient, NormalizedCache } from "@apollo/client";
import {
  CreateExperimentFromCoordinateSystemDocument,
  CreateExperimentFromCoordinateSystemMutation,
  CreateExperimentFromCoordinateSystemMutationVariables,
  ExperimentsForWorldDocument,
  ExperimentsForWorldQuery,
  ExperimentsForWorldQueryVariables,
} from "../api/graphql";

/**
 * The experiment composed over a world — found if one exists, staged if not.
 *
 * Staging is mikro's `createSceneFromCoordinateSystem` over time: the server walks
 * everything placeable on the system (traces, spike sets, event tables,
 * annotations) and adds a layer per item. This is how a run becomes something the
 * timeline draws: a session IS its clock, the system its datasets are timed onto,
 * so its experiment is the one whose world is that clock.
 *
 * Looking first matters because the button that calls this is pressed again and
 * again — minting a fresh experiment per click would bury the one someone already
 * annotated. Network-only: an experiment created elsewhere since the last read
 * must be found, not duplicated. Returns the experiment's id.
 */
export const findOrCreateExperimentForWorld = async (
  client: ApolloClient<NormalizedCache>,
  world: string,
  name?: string | null,
): Promise<string> => {
  const existing = await client.query<ExperimentsForWorldQuery, ExperimentsForWorldQueryVariables>({
    query: ExperimentsForWorldDocument,
    variables: { world },
    fetchPolicy: "network-only",
  });
  const found = existing.data?.experiments.at(0)?.id;
  if (found) return found;

  const created = await client.mutate<
    CreateExperimentFromCoordinateSystemMutation,
    CreateExperimentFromCoordinateSystemMutationVariables
  >({
    mutation: CreateExperimentFromCoordinateSystemDocument,
    variables: { input: { coordinateSystem: world, name: name ?? null } },
  });
  const id = created.data?.createExperimentFromCoordinateSystem?.id;
  if (!id) throw new Error("The server did not return the staged experiment");
  return id;
};
