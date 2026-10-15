import type { ApolloCache } from "@apollo/client";

import {
  GetAnnotationActionDescriptorsDocument,
  type AnnotationActionDescriptorsFragment,
  type GetAnnotationActionDescriptorsQuery,
  type GetAnnotationActionDescriptorsQueryVariables,
} from "@/mikro/api/graphql";

/**
 * Leaves what a draw learnt about its shape (`CreateSceneAnnotation`) where
 * the card that opens on it reads (`GetAnnotationActionDescriptors` for the
 * shape and the probed lens), so the card asks nothing. The root
 * `annotation(id:)` field has no cache redirect, so a normalized Annotation
 * alone would not answer the card's query: the query itself is written.
 */
export const primeCardDescriptors = (
  cache: ApolloCache<unknown>,
  drawn: Pick<AnnotationActionDescriptorsFragment, "id" | "descriptors" | "descriptorsUnder">,
  lensId: string,
) =>
  cache.writeQuery<GetAnnotationActionDescriptorsQuery, GetAnnotationActionDescriptorsQueryVariables>({
    query: GetAnnotationActionDescriptorsDocument,
    variables: { id: drawn.id, lens: lensId },
    data: {
      annotation: {
        __typename: "Annotation",
        id: drawn.id,
        descriptors: drawn.descriptors,
        descriptorsUnder: drawn.descriptorsUnder ?? null,
      },
    },
  });
