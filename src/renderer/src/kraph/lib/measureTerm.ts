import type { ApolloClient } from "@apollo/client";
import {
  AssertEntityExistsDocument,
  AssertInformsDocument,
  AssertMeasurementExistsDocument,
  AssertStructureExistsDocument,
  type AssertEntityExistsMutation,
  type AssertEntityExistsMutationVariables,
  type AssertInformsMutation,
  type AssertInformsMutationVariables,
  type AssertMeasurementExistsMutation,
  type AssertMeasurementExistsMutationVariables,
  type AssertStructureExistsMutation,
  type AssertStructureExistsMutationVariables,
} from "@/kraph/api/graphql";
import type { Structure } from "@/core/types";

/**
 * The measurement word when a sentence names none: a recent word saved before
 * sentences had one. A view draws these once it declares a measurement category
 * for this word.
 */
export const MEASURES_TERM = "MEASURES";

/** What is being measured: a new individual of a word, or one already known. */
export type MeasuredThing =
  | string
  | {
      id: string;
      /** The datum is already recorded as evidence for it. */
      informed?: boolean;
    };

/**
 * "This datum measures the <measure> of a <thing>": for each datum, the claim
 * datum —measure→ thing, naming a fresh instance of the word or one that exists.
 *
 * The datum is asserted first — a measurement's source is a structure node, and
 * `assertStructureExists` is idempotent, so a datum already on the record is
 * simply found. Neither word needs a step of its own: a claim creates a word the
 * organization has not used before.
 *
 * The datum is also recorded as evidence for the thing, so the thing shows on the
 * datum. `Structure.informs` is the only read that reaches it until the backend
 * has `Structure.claims` (`kraph/docs/SENTENCES.md`); drop that evidence then, as
 * it is a claim the person did not state.
 */
export const measureTerm = async (
  client: ApolloClient<any>,
  structures: readonly Structure[],
  thing: MeasuredThing,
  measure: string = MEASURES_TERM,
): Promise<void> => {
  const word = typeof thing === "string" ? thing.trim() : null;
  if (word === "") throw new Error("No term to measure");
  const measureWord = measure.trim();
  if (!measureWord) throw new Error("No word for what is being measured");

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

    let targetId: string | undefined;
    if (word !== null) {
      const entity = await client.mutate<
        AssertEntityExistsMutation,
        AssertEntityExistsMutationVariables
      >({
        mutation: AssertEntityExistsDocument,
        variables: {
          input: {
            term: word,
            supportingEvidence: [{ identifier: datum.identifier, object: datum.id }],
          },
        },
      });
      targetId = entity.data?.assertEntityExists.instance.id;
      if (!targetId) throw new Error(`Could not record a new ${word}`);
    } else {
      const known = thing as Exclude<MeasuredThing, string>;
      targetId = known.id;
      if (!known.informed) {
        await client.mutate<AssertInformsMutation, AssertInformsMutationVariables>({
          mutation: AssertInformsDocument,
          variables: {
            input: {
              entityId: known.id,
              structureIdentifier: datum.identifier,
              structureObject: datum.id,
            },
          },
        });
      }
    }

    await client.mutate<AssertMeasurementExistsMutation, AssertMeasurementExistsMutationVariables>({
      mutation: AssertMeasurementExistsDocument,
      variables: { input: { sourceId, targetId, term: measureWord } },
    });
  }
};
