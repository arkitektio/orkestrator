// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  effectiveScalarTransfer,
  parseRenderNode,
  serializeRenderNode,
  toRgba,
  type ChannelRenderNode,
} from "./renderGraph";

describe("toRgba", () => {
  it("null passes through (no explicit color)", () => {
    expect(toRgba(null)).toBeNull();
  });

  it("appends an opaque alpha to an RGB triple (the save-rejection case)", () => {
    expect(toRgba([255, 168, 0])).toEqual([255, 168, 0, 255]);
  });

  it("RGBA passes through unchanged", () => {
    const rgba = [10, 20, 30, 128];
    expect(toRgba(rgba)).toBe(rgba);
  });

  it("over-long arrays are truncated to 4 defensively", () => {
    expect(toRgba([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4]);
  });
});

describe("transfer curve stops (server LookupStops)", () => {
  const channelFragment = (stops: unknown) =>
    ({
      __typename: "ChannelSourceNode",
      kind: "channel",
      label: null,
      lens: "lens-c1",
      visible: true,
      transfer: { colormap: null, stops },
    }) as unknown as Parameters<typeof parseRenderNode>[0];

  it("parses the curve sorted with values clamped into [0,1]", () => {
    const node = parseRenderNode(
      channelFragment([
        { position: 4000, value: 1.5 }, // value clamped to 1
        { position: 100, value: -0.2 }, // value clamped to 0
        { position: 900, value: 0.5 },
      ]),
    ) as ChannelRenderNode;
    expect(node.transfer.stops).toEqual([
      { position: 100, value: 0 },
      { position: 900, value: 0.5 },
      { position: 4000, value: 1 },
    ]);
  });

  it("treats fewer than two stops — or garbage — as no curve (gamma fallback)", () => {
    for (const raw of [null, undefined, [], [{ position: 100, value: 0.5 }], "nope", [{}]]) {
      const node = parseRenderNode(channelFragment(raw)) as ChannelRenderNode;
      expect(node.transfer.stops).toBeNull();
    }
  });

  it("round-trips the curve through serialize; effective transfer collapses gamma", () => {
    const node = parseRenderNode(
      channelFragment([
        { position: 100, value: 0 },
        { position: 4000, value: 1 },
      ]),
    ) as ChannelRenderNode;
    const input = serializeRenderNode(node, () => null) as { transfer?: { stops?: unknown } };
    expect(input.transfer?.stops).toEqual([
      { position: 100, value: 0 },
      { position: 4000, value: 1 },
    ]);
    // The shader's window becomes the curve domain, gamma the identity.
    expect(effectiveScalarTransfer(node.transfer)).toEqual({
      climMin: 100,
      climMax: 4000,
      gamma: 1,
    });
  });

  it("keeps the session-local color GRADIENT out of the server payload", () => {
    const node = parseRenderNode(channelFragment(null)) as ChannelRenderNode;
    node.transfer.colorStops = [
      { position: 0, color: [10, 20, 30, 255] },
      { position: 1, color: [200, 210, 220, 255] },
    ];
    const input = serializeRenderNode(node, () => null) as { transfer?: Record<string, unknown> };
    expect(input.transfer && "colorStops" in input.transfer).toBe(false);
    expect(input.transfer?.stops).toBeNull(); // and never leaks into the curve
  });
});

describe("a source node's channel (a lens id on the wire, an index in the model)", () => {
  const node = (lens: string | null) =>
    ({
      __typename: "ChannelSourceNode",
      kind: "channel",
      label: null,
      lens,
      visible: true,
      transfer: { colormap: null },
    }) as unknown as Parameters<typeof parseRenderNode>[0];

  const context = {
    intensityAxis: "c",
    // What `layerModel.graphChannelContext` answers: the position the named
    // lens pins, and the layer's own selection for a node naming none.
    indexOf: (lens: string | null | undefined) => (lens === "lens-c3" ? 3 : 1),
  };

  it("resolves the lens to an index through the layer's context", () => {
    const parsed = parseRenderNode(node("lens-c3"), context) as ChannelRenderNode;
    expect(parsed.intensityIndex).toBe(3);
    expect(parsed.intensityAxis).toBe("c");
    expect(parsed.lens).toBe("lens-c3");
  });

  it("reads the layer's own selection for a node that names no lens", () => {
    const parsed = parseRenderNode(node(null), context) as ChannelRenderNode;
    expect(parsed.intensityIndex).toBe(1);
    expect(parsed.lens).toBeNull();
  });

  it("is saved with the lens DERIVED from its index, never the id it was read with", () => {
    // An editor moves `intensityIndex` and leaves `lens` behind; sending the
    // stale id back would silently undo the edit.
    const parsed = parseRenderNode(node("lens-c3"), context) as ChannelRenderNode;
    const edited = { ...parsed, intensityIndex: 0 };
    const input = serializeRenderNode(edited, (source) => `lens-c${source.intensityIndex}`);
    expect(input.lens).toBe("lens-c0");
    expect("intensityIndex" in input).toBe(false);
    expect("intensityAxis" in input).toBe(false);
  });
});
