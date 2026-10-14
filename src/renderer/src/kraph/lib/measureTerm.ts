import type { ApolloClient } from "@apollo/client";
import {
  AssertEntityExistsDocument,
  AssertMeasurementExistsDocument,
  AssertStructureExistsDocument,
  type AssertEntityExistsMutation,
  type AssertEntityExistsMutationVariables,
  type AssertMeasurementExistsMutation,
  type AssertMeasurementExistsMutationVariables,
  type AssertStructureExistsMutation,
  type AssertStructureExistsMutationVariables,
} from "@/kraph/api/graphql";
import type { Structure } from "@/core/types";

/**
 * The measurement word every "Measures <term>" claim is made under. A view
 * draws these once it declares a measurement category for this word; the
 * key is an AGE name, like every category key (`kraph/forms/utils.ts`).
 */
export const MEASURES_TERM = "MEASURES";

/**
 * "This datum measures a <term>": for each datum, a fresh instance of the
 * ENTITY word and the claim datum —measures→ instance.
 *
 * The datum is asserted first — a measurement's source is a structure node,
 * and `assertStructureExists` is idempotent, so a datum already on the record
 * is simply found. The word itself needs no step of its own: `assertEntityExists`
 * creates a word the organization has not used before.
 */
export const measureTerm = async (
  client: ApolloClient<any>,
  structures: readonly Structure[],
  termKey: string,
): Promise<void> => {
  const term = termKey.trim();
  if (!term) throw new Error("No term to measure");

  for (const datum of structures) {
    const structure = await client.mutate<
      AssertStructureExistsMutation,
      AssertStructureExistsMutationVariables
    >({
      mutation: AssertStructureExistsDocument,
      variables: { input: { identifier: datum.identifier, object: datum.id } },
    });
    const sourceId = structure.data?.assertStructureExists.structure.id;
    if (!sourceId) throw new Error("Could not record the datum being measured");

    const entity = await client.mutate<
      AssertEntityExistsMutation,
      AssertEntityExistsMutationVariables
    >({
      mutation: AssertEntityExistsDocument,
      variables: { input: { term } },
    });
    const targetId = entity.data?.assertEntityExists.instance.id;
    if (!targetId) throw new Error(`Could not record a new ${term}`);

    await client.mutate<AssertMeasurementExistsMutation, AssertMeasurementExistsMutationVariables>({
      mutation: AssertMeasurementExistsDocument,
      variables: { input: { sourceId, targetId, term: MEASURES_TERM } },
    });
  }
};
