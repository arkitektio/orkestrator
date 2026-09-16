import type { ApolloError } from "@apollo/client";
import type { GraphQLFormattedError } from "graphql";

/** The root field the Knowledge sidebar reads a datum through. */
export const KNOWLEDGE_ROOT_FIELD = "structureByIdentifier";

/**
 * `structureByIdentifier` is non-null server-side, so a datum nobody has made a
 * claim about answers with a GraphQL error on that field instead of `null`.
 * The sidebar treats that as "nothing known yet", which is an ordinary state,
 * not a failure — but only when *every* error sits on that field, so a real
 * fault elsewhere in the query still surfaces. Keyed on the error's `path`, not
 * its message, so a reworded backend does not turn empty panels into errors.
 *
 * Once the backend makes the field nullable this collapses to `data === null`.
 */
export const isNotKnownYetErrors = (
  errors?: readonly GraphQLFormattedError[] | null,
): boolean =>
  !!errors &&
  errors.length > 0 &&
  errors.every((error) => error.path?.[0] === KNOWLEDGE_ROOT_FIELD);

export const isNotKnownYet = (error?: ApolloError | null): boolean =>
  !!error && !error.networkError && isNotKnownYetErrors(error.graphQLErrors);
