// @vitest-environment jsdom
import { InMemoryCache, gql } from "@apollo/client";
import { describe, expect, it } from "vitest";
import possibleTypes from "@/elektro/api/fragments";
import { evictLayer } from "./layerCache";

const SCENE = gql`
  query Scene {
    experiment {
      __typename
      id
      layers {
        __typename
        id
        name
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
        layers: [
          { __typename: "TraceLayer", id: "1", name: "trace" },
          { __typename: "SpikesLayer", id: "2", name: "raster" },
          { __typename: "AnnotationLayer", id: "3", name: "marks" },
        ],
      },
    },
  });
  return cache;
};

const layerIds = (cache: InMemoryCache) =>
  cache.readQuery<{ experiment: { layers: { id: string }[] } }>({ query: SCENE })?.experiment.layers.map((layer) => layer.id);

describe("evictLayer", () => {
  it("drops a deleted layer of whatever type from the scene, and only it", () => {
    const cache = seed();
    evictLayer(cache, "2");
    expect(layerIds(cache)).toEqual(["1", "3"]);
    expect(cache.extract()["SpikesLayer:2"]).toBeUndefined();
    expect(cache.extract()["TraceLayer:1"]).toBeDefined();
  });

  it("leaves the scene alone for an id it does not hold", () => {
    const cache = seed();
    evictLayer(cache, "9");
    expect(layerIds(cache)).toEqual(["1", "2", "3"]);
  });
});
