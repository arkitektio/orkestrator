import { describe, expect, it } from "vitest";
import { activeMetadataLayerId } from "./activeMetadataLayer";

const layers = [
  { id: "a", visible: false },
  { id: "b", visible: true },
  { id: "c", visible: true },
];

describe("activeMetadataLayerId", () => {
  it("prefers the sidebar selection, even when that layer is hidden", () => {
    expect(activeMetadataLayerId("a", "c", layers)).toBe("a");
  });

  it("falls back to the probe pin when nothing is selected", () => {
    expect(activeMetadataLayerId(null, "c", layers)).toBe("c");
  });

  it("falls back to the first visible layer with neither", () => {
    expect(activeMetadataLayerId(null, null, layers)).toBe("b");
  });

  it("ignores a selection whose layer no longer exists", () => {
    expect(activeMetadataLayerId("gone", null, layers)).toBe("b");
  });

  it("is null when no layer can answer", () => {
    expect(activeMetadataLayerId(null, null, [{ id: "a", visible: false }])).toBeNull();
  });
});
