// @vitest-environment jsdom
// (the generated Apollo layer touches `window` on load)
import { InMemoryCache } from "@apollo/client";
import { describe, expect, it } from "vitest";

import {
  AnnotationKind,
  GetSceneAnnotationsDocument,
  type GetSceneAnnotationsQuery,
  type SceneAnnotationFragment,
} from "@/mikro/api/graphql";
import {
  removeSceneAnnotation,
  sceneAnnotationsVariables,
  upsertSceneAnnotation,
} from "./annotationCache";

const shape = (id: string, name = `shape ${id}`): SceneAnnotationFragment => ({
  __typename: "Annotation",
  id,
  name,
  kind: AnnotationKind.Point,
  vectors: [[0, 0, 0]],
  strokeColor: [255, 255, 255, 255],
  fillColor: null,
  strokeWidth: 1,
  filled: false,
  coordinates: [],
});

const seeded = (collectionId: string, shapes: SceneAnnotationFragment[]) => {
  const cache = new InMemoryCache();
  cache.writeQuery<GetSceneAnnotationsQuery>({
    query: GetSceneAnnotationsDocument,
    variables: sceneAnnotationsVariables(collectionId),
    data: { __typename: "Query", annotations: shapes } as GetSceneAnnotationsQuery,
  });
  return cache;
};

const listed = (cache: InMemoryCache, collectionId: string) =>
  cache
    .readQuery<GetSceneAnnotationsQuery>({
      query: GetSceneAnnotationsDocument,
      variables: sceneAnnotationsVariables(collectionId),
    })
    ?.annotations.map((annotation) => `${annotation.id}:${annotation.name}`);

describe("annotationCache", () => {
  it("appends a drawn shape to its own collection's list only", () => {
    const cache = seeded("1", [shape("a")]);
    cache.writeQuery<GetSceneAnnotationsQuery>({
      query: GetSceneAnnotationsDocument,
      variables: sceneAnnotationsVariables("2"),
      data: { __typename: "Query", annotations: [] } as GetSceneAnnotationsQuery,
    });
    upsertSceneAnnotation(cache, "1", shape("b"));
    expect(listed(cache, "1")).toEqual(["a:shape a", "b:shape b"]);
    expect(listed(cache, "2")).toEqual([]);
  });

  it("is idempotent — a live layer hears its own draw back", () => {
    const cache = seeded("1", [shape("a")]);
    upsertSceneAnnotation(cache, "1", shape("b"));
    upsertSceneAnnotation(cache, "1", shape("b"));
    expect(listed(cache, "1")).toEqual(["a:shape a", "b:shape b"]);
  });

  it("replaces an edited shape in place", () => {
    const cache = seeded("1", [shape("a"), shape("b")]);
    upsertSceneAnnotation(cache, "1", shape("a", "renamed"));
    expect(listed(cache, "1")).toEqual(["a:renamed", "b:shape b"]);
  });

  it("does not invent a list that was never loaded", () => {
    const cache = new InMemoryCache();
    upsertSceneAnnotation(cache, "1", shape("a"));
    expect(listed(cache, "1")).toBeUndefined();
  });

  it("removes a deleted shape from the list and the cache", () => {
    const cache = seeded("1", [shape("a"), shape("b")]);
    removeSceneAnnotation(cache, "a");
    removeSceneAnnotation(cache, "a"); // the mutation and the live event both report it
    expect(listed(cache, "1")).toEqual(["b:shape b"]);
    expect(cache.extract()["Annotation:a"]).toBeUndefined();
  });
});
