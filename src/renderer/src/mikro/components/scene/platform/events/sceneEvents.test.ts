import { describe, expect, it, vi } from "vitest";

import {
  drawnPayload,
  isPick,
  layersKey,
  layersPayload,
  pickPayload,
  probeLens,
  selectionPayload,
} from "./eventPayloads";
import { createSceneEvents } from "./sceneEvents";

const image = { id: "l1", __typename: "IntensityLayer", visible: true, lens: { id: "lens-1", dataset: { id: "d1" } } };
const labels = { id: "l2", __typename: "LabelLayer", visible: true, lens: { id: "lens-2", dataset: { id: "d2" } } };
const shapes = { id: "l3", __typename: "AnnotationLayer", visible: true, lens: null };

describe("createSceneEvents", () => {
  it("tells only its own listeners: two scopes of one scene are two emitters", () => {
    const page = createSceneEvents();
    const blok = createSceneEvents();
    const heard = vi.fn();
    const unsubscribe = blok.subscribeDrawn(heard);

    page.publishDrawn({ annotation: "a1", kind: "PATH" });
    expect(heard).not.toHaveBeenCalled();

    blok.publishDrawn({ annotation: "a2", kind: "PATH" });
    expect(heard).toHaveBeenCalledWith({ annotation: "a2", kind: "PATH" });

    unsubscribe();
    blok.publishDrawn({ annotation: "a3", kind: "PATH" });
    expect(heard).toHaveBeenCalledTimes(1);
  });
});

describe("payloads", () => {
  it("hands a drawn shape and its lens as structure references", () => {
    expect(drawnPayload({ annotation: "a1", kind: "PATH", lens: "lens-1", descriptors: { k: 1 } })).toEqual({
      annotation: { __identifier: "@mikro/annotation", object: "a1" },
      kind: "PATH",
      lens: { __identifier: "@mikro/arraylens", object: "lens-1" },
      descriptors: { k: 1 },
    });
    expect(drawnPayload({ annotation: "a1", kind: "POINT" }).lens).toBeNull();
  });

  it("names the selection, first shape first, with the lens under the probe", () => {
    const lens = probeLens([shapes, image, labels], "l2");
    expect(selectionPayload(["a1", "a2"], lens)).toEqual({
      annotation: { __identifier: "@mikro/annotation", object: "a1" },
      annotations: [
        { __identifier: "@mikro/annotation", object: "a1" },
        { __identifier: "@mikro/annotation", object: "a2" },
      ],
      lens: { __identifier: "@mikro/arraylens", object: "lens-2" },
    });
    // Nothing pinned: the first visible image layer's lens.
    expect(probeLens([shapes, image], null)).toEqual({ __identifier: "@mikro/arraylens", object: "lens-1" });
    expect(selectionPayload([], null).annotation).toBeNull();
  });

  it("is a pick only for a click that reads, never a hover or a vertex being placed", () => {
    const probe = { layerId: "l1", origin: "click", purpose: "readout", worldPos: [1, 2, 3], voxelIndex: [4, 5, 6] } as const;
    expect(isPick(probe)).toBe(true);
    expect(isPick({ ...probe, origin: "hover" })).toBe(false);
    expect(isPick({ ...probe, purpose: "placement" })).toBe(false);
    expect(pickPayload({ ...probe, worldPos: [1, 2, 3], voxelIndex: [4, 5, 6] }, [image])).toEqual({
      layer: "l1",
      world: [1, 2, 3],
      voxel: [4, 5, 6],
      lens: { __identifier: "@mikro/arraylens", object: "lens-1" },
    });
  });

  it("lists the layers, says which are new, and keys only on what a host can see", () => {
    expect(layersPayload([image, labels], new Set(["l1"]))).toEqual({
      layers: [
        { layer: "l1", kind: "IntensityLayer", lens: { __identifier: "@mikro/arraylens", object: "lens-1" } },
        { layer: "l2", kind: "LabelLayer", lens: { __identifier: "@mikro/arraylens", object: "lens-2" } },
      ],
      added: ["l2"],
    });
    expect(layersKey([image, labels])).toBe(layersKey([{ ...image, visible: false }, labels]));
    expect(layersKey([image])).not.toBe(layersKey([image, labels]));
  });
});
