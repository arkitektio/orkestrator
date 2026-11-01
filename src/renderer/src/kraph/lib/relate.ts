import type { ApolloClient } from "@apollo/client";
import {
  AssertRelationExistsDocument,
  AssertStructureExistsDocument,
  AssertStructureRelationExistsDocument,
  type AssertRelationExistsMutation,
  type AssertRelationExistsMutationVariables,
  type AssertStructureExistsMutation,
  type AssertStructureExistsMutationVariables,
  type AssertStructureRelationExistsMutation,
  type AssertStructureRelationExistsMutationVariables,
} from "@/kraph/api/graphql";
import { sameStructure } from "@/core/smart/structure";
import type { Structure } from "@/core/types";

/** What sort of thing is being related, and so what sort of word relates them. */
export type RelateKind = "entities" | "data";

export type Relate = {
  kind: RelateKind;
  left: readonly Structure[];
  right: readonly Structure[];
  /** The word, by key: a claim names a word, never a category or a graph. */
  term: string;
};

/** Every distinct pair across the two sides; nothing relates to itself. */
export const relatePairs = (left: readonly Structure[], right: readonly Structure[]) =>
  left.flatMap((source) =>
    right.flatMap((target) => (sameStructure(source, target) ? [] : [{ source, target }])),
  );

/** A batch that stopped partway: `describeError` takes the sentence as it stands. */
class RelatedSomeError extends Error {
  technical: string;

  constructor(done: number, total: number, cause: unknown) {
    super(`Related ${done} of ${total}, then stopped. The first ${done} stand.`);
    this.technical = cause instanceof Error ? cause.message : String(cause);
  }
}

/**
 * "[AIS 1] [is part of] [neuron 4]": one claim per pair, naming the word and no
 * graph. The word is created if the organization has not used it before; a view
 * that declares no category for it simply will not draw it.
 *
 * Entities are their own ids. A datum is first asserted as a structure, which is
 * idempotent, so a datum already on the record is simply found.
 */
export const relate = async (
  client: ApolloClient<any>,
  { kind, left, right, term }: Relate,
): Promise<number> => {
  const word = term.trim();
  if (!word) throw new Error("No word to relate them with");

  const pairs = relatePairs(left, right);
  if (pairs.length === 0) throw new Error("Nothing to relate: both sides are the same thing");

  const structureIds = new Map<string, string>();
  const structureId = async (datum: Structure) => {
    const key = `${datum.identifier}:${datum.id}`;
    const known = structureIds.get(key);
    if (known) return known;
    const result = await client.mutate<
      AssertStructureExistsMutation,
      AssertStructureExistsMutationVariables
    >({
      mutation: AssertStructureExistsDocument,
      variables: { input: { identifier: datum.identifier, object: datum.id } },
    });
    const id = result.data?.assertStructureExists.structure.id;
    if (!id) throw new Error("Could not record the datum being related");
    structureIds.set(key, id);
    return id;
  };

  let done = 0;
  try {
    for (const { source, target } of pairs) {
      if (kind === "entities") {
        await client.mutate<AssertRelationExistsMutation, AssertRelationExistsMutationVariables>({
          mutation: AssertRelationExistsDocument,
          variables: { input: { sourceId: source.id, targetId: target.id, term: word } },
        });
      } else {
        const sourceId = await structureId(source);
        const targetId = await structureId(target);
        await client.mutate<
          AssertStructureRelationExistsMutation,
          AssertStructureRelationExistsMutationVariables
        >({
          mutation: AssertStructureRelationExistsDocument,
          variables: { input: { sourceId, targetId, term: word } },
        });
      }
      done += 1;
    }
  } catch (error) {
    if (done === 0) throw error;
    throw new RelatedSomeError(done, pairs.length, error);
  }
  return done;
};
