import { describe, expect, it } from "vitest";
import { BACKDROP_MAX_BYTES, backdropProblem, importBackdrop } from "./backdropStore";
import { defaultSettings, settingsValidator } from "./validator";

describe("backdropStore", () => {
  it("takes a PNG, and the other image types the rail can paint", () => {
    expect(backdropProblem({ type: "image/png", size: 1024 })).toBeNull();
    expect(backdropProblem({ type: "image/webp", size: 1024 })).toBeNull();
    expect(backdropProblem({ type: "image/svg+xml", size: 1024 })).toBeNull();
  });

  it("refuses what is not an image, saying what it wants", () => {
    expect(backdropProblem({ type: "application/pdf", size: 1024 })).toMatch(/has to be an image/);
  });

  it("refuses an image too large to scroll over, with both sizes", () => {
    const problem = backdropProblem({ type: "image/png", size: BACKDROP_MAX_BYTES + 1 });
    expect(problem).toMatch(/at most 8\.0 MB/);
  });

  it("does not store a file it refuses", async () => {
    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    await expect(importBackdrop(file)).rejects.toThrow(/has to be an image/);
  });
});

describe("backdrop settings", () => {
  it("defaults to no backdrop", () => {
    expect(settingsValidator.parse(defaultSettings)).toMatchObject({
      railBackdrop: "none",
      railBackdropOpacity: 1,
      railBackdropFit: "fill",
    });
  });

  it("knows only its own backdrops", () => {
    expect(settingsValidator.safeParse({ ...defaultSettings, railBackdrop: "sunset" }).success).toBe(false);
  });
});
