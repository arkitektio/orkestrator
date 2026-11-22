import { InMemoryCache } from "@apollo/client";
import { parse } from "graphql";
import { describe, expect, it } from "vitest";

import { addSceneLayer, createdLayer, removeSceneLayer } from "./sceneLayerCache";

// The scene as the cache holds it: what `GetScene` reads, cut to the fields the
// writes here touch. A real cache, so normalization is Apollo's own.
const SCENE = parse(`
  query Scene {
    scene(id: "s1") {
      id
      layers {
        id
        name
      }
    }
  }
`);
const LAYER = parse(`
  fragment L on ImageLayer {
    id
    name
  }
`);

type SceneData = { scene: { __typename: "Scene"; id: string; layers: { __typename: string; id: string; name: string }[] } };

const sceneWith = (...names: string[]) => {
  const cache = new InMemoryCache();
  cache.writeQuery({
    query: SCENE,
    data: {
      scene: {
        __typename: "Scene",
        id: "s1",
        layers: names.map((name, index) => ({ __typename: "ImageLayer", id: `l${index + 1}`, name })),
      },
    },
  });
  return cache;
};

const layerNames = (cache: InMemoryCache) => cache.readQuery<SceneData>({ query: SCENE })?.scene.layers.map((layer) => layer.name);

/** What a create's answer leaves behind: the layer, written before anything links it. */
const answered = (cache: InMemoryCache, id: string, name: string) => {
  cache.writeFragment({ fragment: LAYER, data: { __typename: "ImageLayer", id, name } });
  return { __typename: "ImageLayer" as const, id };
};

describe("sceneLayerCache", () => {
  it("links a created layer into its scene once, however often it is heard", () => {
    const cache = sceneWith("cells");
    const layer = answered(cache, "l2", "nuclei");

    addSceneLayer(cache, "s1", layer);
    // The subscription hears our own create back.
    addSceneLayer(cache, "s1", layer);

    expect(layerNames(cache)).toEqual(["cells", "nuclei"]);
  });

  it("keeps an edit made after the create: linking writes nothing of the layer", () => {
    const cache = sceneWith("cells");
    const layer = answered(cache, "l2", "nuclei");
    // A staged preview is saved, then its card's edits are replayed against it.
    cache.writeFragment({ fragment: LAYER, data: { __typename: "ImageLayer", id: "l2", name: "nuclei (tuned)" } });

    addSceneLayer(cache, "s1", layer);

    expect(layerNames(cache)).toEqual(["cells", "nuclei (tuned)"]);
  });

  it("drops a deleted layer from the scene and from the cache", () => {
    const cache = sceneWith("cells", "nuclei");

    removeSceneLayer(cache, "s1", "l1");

    expect(layerNames(cache)).toEqual(["nuclei"]);
    expect(cache.extract()["ImageLayer:l1"]).toBeUndefined();
    // Heard twice (our delete, then its event): the second changes nothing.
    removeSceneLayer(cache, "s1", "l1");
    expect(layerNames(cache)).toEqual(["nuclei"]);
  });

  it("leaves a scene nothing has loaded alone", () => {
    const cache = new InMemoryCache();
    addSceneLayer(cache, "s9", answered(cache, "l1", "cells"));
    removeSceneLayer(cache, "s9", "l1");
    expect(cache.extract()["Scene:s9"]).toBeUndefined();
  });

  it("reads the one layer a create answers with, under whatever its field is called", () => {
    expect(createdLayer({ createIntensityLayer: { __typename: "IntensityLayer", id: "7" } })).toEqual({
      __typename: "IntensityLayer",
      id: "7",
    });
    expect(createdLayer({ createIntensityLayer: null })).toBeNull();
    expect(createdLayer(undefined)).toBeNull();
  });
});
