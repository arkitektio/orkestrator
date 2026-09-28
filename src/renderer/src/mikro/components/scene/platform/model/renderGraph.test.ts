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
      intensityAxis: "c",
      intensityIndex: 0,
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
    const input = serializeRenderNode(node) as { transfer?: { stops?: unknown } };
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
    const input = serializeRenderNode(node) as { transfer?: Record<string, unknown> };
    expect(input.transfer && "colorStops" in input.transfer).toBe(false);
    expect(input.transfer?.stops).toBeNull(); // and never leaks into the curve
  });
});
