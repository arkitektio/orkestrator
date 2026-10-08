import { describe, expect, it } from "vitest";
import { describeService, matchesWords } from "./service";

describe("describeService", () => {
  it("counts what a service declares, and leaves out what it does not", () => {
    expect(describeService({ signals: 3, structures: 1 })).toBe("3 signals · 1 structure");
    expect(describeService({ signals: 0, structures: 2 })).toBe("2 structures");
    expect(describeService({ signals: 0, structures: 0 })).toBe("");
  });
});

describe("matchesWords", () => {
  it("wants every word, anywhere, in any case", () => {
    const parts = ["@mikro/image", "Image", null, "A stored pixel array"];
    expect(matchesWords("", parts)).toBe(true);
    expect(matchesWords("MIKRO pixel", parts)).toBe(true);
    expect(matchesWords("mikro kraph", parts)).toBe(false);
  });
});
