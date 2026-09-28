// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { ColorMap, PhasorColorMode, PhasorCursorKind } from "@/mikro/api/graphql";
import {
  flattenChannels,
  flattenPhasors,
  flattenSources,
  parseRenderGraph,
  serializeRenderGraph,
  type BlendRenderNode,
} from "./renderGraph";

/**
 * The shape the server sends: a PhasorNode's transfer is ALIASED to
 * `phasorTransfer` in the fragment (a ChannelSourceNode's `transfer` is a
 * TransferFunction, a PhasorNode's is a PhasorTransfer — same response key,
 * different types, which GraphQL rejects).
 */
const GRAPH = {
  root: {
    __typename: "BlendNode",
    kind: "blend",
    blending: "ADDITIVE",
    children: [
      {
        __typename: "ChannelSourceNode",
        kind: "channel",
        intensityAxis: "c",
        intensityIndex: 0,
        visible: true,
        transfer: { climMin: 10, climMax: 200, colormap: ColorMap.Grey, gamma: 1 },
      },
      {
        __typename: "PhasorNode",
        kind: "phasor",
        label: "lifetime",
        phasorAxis: "tau",
        harmonic: 2,
        intensityAxis: "c",
        intensityIndex: 0,
        visible: true,
        phasorTransfer: {
          colormap: ColorMap.Rainbow,
          mode: PhasorColorMode.Phase,
          min: "0.5 ns",
          max: "4 ns",
          weightByIntensity: true,
          intensity: { climMin: 5, climMax: 90, gamma: 0.8 },
          cursors: [
            {
              kind: PhasorCursorKind.Circle,
              label: "free NADH",
              visible: true,
              color: [255, 0, 0],
              g: 0.4,
              s: 0.3,
              radius: 0.05,
            },
          ],
        },
      },
    ],
  },
} as never;

describe("parseRenderGraph — a phasor node", () => {
  const graph = parseRenderGraph(GRAPH) as BlendRenderNode;

  it("parses it as a phasor leaf, not an empty blend container", () => {
    // The regression this whole feature started from: with no PhasorNode branch
    // in the fragment, `parseRenderNode` fell through to "unknown → blend" and
    // the node rendered nothing at all.
    const phasors = flattenPhasors(graph);
    expect(phasors).toHaveLength(1);
    expect(phasors[0].type).toBe("phasor");
    expect(phasors[0].phasorAxis).toBe("tau");
    expect(phasors[0].harmonic).toBe(2);
    expect(phasors[0].transfer.mode).toBe(PhasorColorMode.Phase);
    expect(phasors[0].transfer.min).toBe("0.5 ns");
    expect(phasors[0].transfer.intensity.climMax).toBe(90);
    expect(phasors[0].transfer.cursors[0].radius).toBe(0.05);
  });

  it("keeps channels and phasors apart, and lists both as sources in tree order", () => {
    expect(flattenChannels(graph)).toHaveLength(1);
    expect(flattenSources(graph).map((source) => source.type)).toEqual([
      "channel",
      "phasor",
    ]);
  });

  it("round-trips back into the LayerNodeInput shape", () => {
    const input = serializeRenderGraph(graph);
    const phasor = input.root.children?.[1];
    expect(phasor?.kind).toBe("phasor");
    expect(phasor?.phasorAxis).toBe("tau");
    expect(phasor?.harmonic).toBe(2);
    // Serialized under the SCHEMA's name (`phasorTransfer` on LayerNodeInput),
    // not the fragment's alias.
    expect(phasor?.phasorTransfer?.colormap).toBe(ColorMap.Rainbow);
    expect(phasor?.phasorTransfer?.max).toBe("4 ns");
    expect(phasor?.phasorTransfer?.cursors?.[0].g).toBe(0.4);
    expect(phasor?.phasorTransfer?.intensity?.gamma).toBe(0.8);
    // The channel keeps its own (TransferFunction) transfer.
    expect(input.root.children?.[0].transfer?.climMax).toBe(200);
  });
});
