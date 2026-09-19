import { describe, expect, it } from "vitest";
import { channelColors } from "./channelColor";

describe("channelColors", () => {
  it("keeps a single channel in the layer's colour", () => {
    expect(channelColors("hsl(120, 70%, 60%)", 1)).toEqual(["hsl(120, 70%, 60%)"]);
  });

  it("keeps channel 0 in the layer's colour and gives every other a distinct hue", () => {
    const colors = channelColors("hsl(120, 70%, 60%)", 6);
    expect(colors[0]).toBe("hsl(120, 70%, 60%)");
    expect(new Set(colors).size).toBe(6);
    expect(colors[1]).toBe("hsl(257.5, 70.0%, 60.0%)");
  });

  it("reads a persisted rgba colour, and saturates a grey enough to tell apart", () => {
    const colors = channelColors("rgba(128, 128, 128, 1)", 3);
    expect(colors[0]).toBe("rgba(128, 128, 128, 1)");
    expect(colors[1]).toMatch(/^hsl\([\d.]+, 55\.0%, 50\.\d%\)$/);
  });
});

describe("coloursChannels", () => {
  it("colours channels individually only in overlay by default, always or never on request", async () => {
    const { coloursChannels } = await import("./channelColor");
    expect(coloursChannels("OVERLAY", "OVERLAY")).toBe(true);
    expect(coloursChannels("OVERLAY", "STACKED")).toBe(false);
    expect(coloursChannels("ALWAYS", "STACKED")).toBe(true);
    expect(coloursChannels("NEVER", "OVERLAY")).toBe(false);
  });
});
