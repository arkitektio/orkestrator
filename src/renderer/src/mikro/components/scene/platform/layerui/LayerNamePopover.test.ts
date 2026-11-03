import { describe, expect, it, vi } from "vitest";

// The client hook pulls in the whole connection layer; `setAnchorLabel` is
// handed its client, so the hook is never called here.
vi.mock("@/mikro/api/funcs", () => ({ useMikro: () => null }));

import { anchorAt, layerPins, setAnchorLabel } from "./LayerNamePopover";
import { layerDisplayLabel, sceneLayerLabel } from "./layerIdentity";
import type { LayerState } from "../model/layerModel";

const layer = (over: {
  id?: string;
  name?: string | null;
  lensId?: string;
  lensName?: string | null;
  dataset?: string;
}): LayerState =>
  ({
    __typename: "IntensityLayer",
    id: over.id ?? "1",
    name: over.name ?? null,
    phasors: [],
    channels: [],
    // As the store holds it: the server's slices here, and the lens below is
    // the brick POOL lens with the channel slice taken out (`poolLensOf`).
    sourceSlices: [{ axis: "c", start: 1, stop: 2 }],
    lens: {
      __typename: "ArrayLens",
      id: over.lensId ?? "10",
      name: over.lensName ?? null,
      slices: [],
      activeAnchors: [],
      nameAnchors: [],
      dataset: { id: over.dataset ?? "ds", name: "cells.zarr" },
    },
  }) as unknown as LayerState;

/** A scene store with just what `setAnchorLabel` touches. */
const store = (layers: LayerState[]) => {
  const state = {
    layers: [...layers],
    sceneLayers: layers.map((l) => ({ id: l.id, lens: { ...l.lens } })),
    updateLayer: vi.fn((next: LayerState) => {
      state.layers = state.layers.map((l) => (l.id === next.id ? next : l));
    }),
    patchSceneLayer: vi.fn(),
  };
  return { api: { getState: () => state } as never, state };
};

const client = (lensNames: Record<string, string | null> = {}) => ({
  mutate: vi.fn(async ({ variables }: { variables: { lens: string; label: string | null } }) => ({
    data: {
      setPositionLabel: {
        id: variables.lens,
        name: variables.label,
        label: "x",
        nameAnchors: [
          {
            id: "a1",
            coordinates: { c: 1 },
            channelLabel: { label: "Ch1" },
            positionLabel: variables.label ? { label: variables.label } : null,
          },
        ],
      },
    },
  })),
  query: vi.fn(async ({ variables }: { variables: { id: string } }) => ({
    data: { lens: { name: lensNames[variables.id] ?? null } },
  })),
});

describe("layerDisplayLabel", () => {
  it("is the metadata beneath the layer — never a name of its own", () => {
    expect(layerDisplayLabel(layer({ name: "Stale", lensName: "GFP" }))).toBe("GFP");
    expect(layerDisplayLabel(layer({ name: "Stale" }))).toBe("cells.zarr");
    expect(sceneLayerLabel({ id: "7", lens: { name: null, dataset: { name: "cells.zarr" } } })).toBe("cells.zarr");
  });
});

describe("setAnchorLabel", () => {
  it("sets the position label on the anchor beneath and patches the lens, not the layer", async () => {
    const named = layer({ name: "Stale" });
    const { api, state } = store([named]);
    const c = client();
    await setAnchorLabel(c as never, api, named, "  GFP ");

    expect(c.mutate).toHaveBeenCalledTimes(1); // one write: the anchor
    expect(c.mutate.mock.calls[0][0].variables).toEqual({ lens: "10", label: "GFP" });
    expect(state.layers[0].name).toBe("Stale"); // the layer row is never written
    expect(state.layers[0].lens.name).toBe("GFP");
    expect(layerDisplayLabel(state.layers[0])).toBe("GFP");
    // The anchor carries the label now, the recorded one beside it.
    const [anchor] = state.layers[0].lens.nameAnchors;
    expect(anchor.positionLabel?.label).toBe("GFP");
    expect(anchor.channelLabel?.label).toBe("Ch1");
  });

  it("an empty label removes it", async () => {
    const named = layer({ lensName: "GFP" });
    const { api } = store([named]);
    const c = client();
    await setAnchorLabel(c as never, api, named, "   ");
    expect(c.mutate.mock.calls[0][0].variables).toEqual({ lens: "10", label: null });
  });

  it("reads back the lens names of the other layers over the same array", async () => {
    const named = layer({ id: "1", lensId: "10" });
    const sibling = layer({ id: "2", lensId: "11", lensName: "c1" });
    const elsewhere = layer({ id: "3", lensId: "12", dataset: "other" });
    const { api, state } = store([named, sibling, elsewhere]);
    const c = client({ "11": "GFP" });
    await setAnchorLabel(c as never, api, named, "GFP");
    await vi.waitFor(() => expect(state.layers[1].lens.name).toBe("GFP"));
    expect(c.query).toHaveBeenCalledTimes(1); // not the layer over another array
  });
});

describe("anchorAt", () => {
  const anchor = (id: string, coordinates: Record<string, number>) =>
    ({ id, coordinates, channelLabel: null, positionLabel: null }) as never;

  it("is the anchor at exactly the lens' pins — the one setPositionLabel writes", () => {
    const pins = [{ axis: "c", value: 1 }];
    expect(anchorAt([anchor("t", { c: 1, t: 0 }), anchor("c", { c: 1 })], pins)).toMatchObject({ id: "c" });
    expect(anchorAt([anchor("other", { c: 2 })], pins)).toBeNull();
    expect(anchorAt(undefined, pins)).toBeNull();
  });
});

describe("layerPins", () => {
  it("reads the server's slices, not the pool lens' (which lost the channel)", () => {
    // The bug: a one-channel intensity layer read as pinning nothing.
    expect(layerPins(layer({}))).toEqual([{ axis: "c", value: 1 }]);
  });
});
