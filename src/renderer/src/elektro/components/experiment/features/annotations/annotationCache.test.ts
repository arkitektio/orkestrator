// @vitest-environment jsdom
import { InMemoryCache, gql } from "@apollo/client";
import { describe, expect, it } from "vitest";
import possibleTypes from "@/elektro/api/fragments";
import { AnnotationKind } from "@/elektro/api/graphql";
import {
  appendAnnotation,
  appendLayer,
  defaultCollectionId,
  evictAnnotation,
  optimisticAnnotation,
} from "./annotationCache";

const SCENE = gql`
  query Scene {
    experiment {
      __typename
      id
      annotationCollection { __typename id }
      layers {
        __typename
        id
        ... on AnnotationLayer {
          annotationCollection {
            __typename
            id
            annotations { __typename id kind }
          }
        }
      }
    }
  }
`;

const seed = () => {
  const cache = new InMemoryCache({ possibleTypes: possibleTypes.possibleTypes });
  cache.writeQuery({
    query: SCENE,
    data: {
      experiment: {
        __typename: "Experiment",
        id: "e1",
        annotationCollection: { __typename: "AnnotationCollection", id: "c1" },
        layers: [
          {
            __typename: "AnnotationLayer",
            id: "l1",
            annotationCollection: {
              __typename: "AnnotationCollection",
              id: "c1",
              annotations: [{ __typename: "Annotation", id: "a1", kind: "EVENT" }],
            },
          },
        ],
      },
    },
  });
  const read = () =>
    cache.readQuery<{
      experiment: {
        layers: { id: string; annotationCollection?: { annotations: { id: string }[] } }[];
      };
    }>({ query: SCENE })!.experiment;
  return { cache, read };
};

/** Write a created annotation as Apollo does before calling `update`. */
const writeCreated = (cache: InMemoryCache, id: string, collectionId = "c1") => {
  const created = { __typename: "Annotation" as const, id, kind: "EPOCH", collection: { __typename: "AnnotationCollection" as const, id: collectionId } };
  cache.writeFragment({
    id: cache.identify(created),
    fragment: gql`fragment A on Annotation { id kind collection { id } }`,
    data: created,
  });
  return created as never;
};

describe("annotationCache", () => {
  it("reads the experiment's default collection", () => {
    const { cache } = seed();
    expect(defaultCollectionId(cache, "e1")).toBe("c1");
    expect(defaultCollectionId(cache, "unknown")).toBeNull();
  });

  it("appends a created annotation to its collection once", () => {
    const { cache, read } = seed();
    const created = writeCreated(cache, "a2");
    expect(appendAnnotation(cache, created)).toBe(true);
    // The real result after the optimistic one: already listed, no change.
    expect(appendAnnotation(cache, created)).toBe(false);
    expect(read().layers[0].annotationCollection?.annotations.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("reports a collection the cache does not hold", () => {
    const { cache } = seed();
    expect(appendAnnotation(cache, writeCreated(cache, "a3", "elsewhere"))).toBe(false);
  });

  it("evicts a deleted annotation from every list", () => {
    const { cache, read } = seed();
    evictAnnotation(cache, "a1");
    expect(read().layers[0].annotationCollection?.annotations).toEqual([]);
  });

  it("appends a minted layer to the experiment", () => {
    const { cache, read } = seed();
    const layer = {
      __typename: "AnnotationLayer",
      id: "l2",
      annotationCollection: { __typename: "AnnotationCollection", id: "c2", annotations: [] },
    };
    cache.writeFragment({
      id: cache.identify(layer),
      fragment: gql`fragment L on AnnotationLayer { id annotationCollection { id annotations { id kind } } }`,
      data: layer,
    });
    expect(appendLayer(cache, "e1", layer)).toBe(true);
    expect(read().layers.map((l) => l.id)).toEqual(["l1", "l2"]);
  });

  it("builds an optimistic result in the target collection", () => {
    const result = optimisticAnnotation(
      { kind: AnnotationKind.Line, vectors: [[1, 0, 2]], coordinates: [{ name: "c", value: 0 }] },
      "c9",
    );
    expect(result.createAnnotation).toMatchObject({
      __typename: "Annotation",
      kind: "LINE",
      vectors: [[1, 0, 2]],
      collection: { id: "c9" },
    });
    expect(result.createAnnotation.id).toMatch(/^optimistic-/);
  });
});
