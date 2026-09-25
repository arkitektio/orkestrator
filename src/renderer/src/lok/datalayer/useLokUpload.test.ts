// @vitest-environment jsdom
// jsdom: the hook module reaches `@/app/Arkitekt`, whose import chain reads `window`.
import { describe, expect, it } from "vitest";
import { LOK_MEDIA_ACCEPT, LOK_MEDIA_MAX_BYTES, lokMediaProblem } from "./useLokUpload";

describe("lokMediaProblem", () => {
  it("takes the raster types lok allows, up to the cap", () => {
    for (const type of ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]) {
      expect(lokMediaProblem({ type, size: LOK_MEDIA_MAX_BYTES })).toBeNull();
    }
  });

  it("refuses SVG, HTML and untyped files", () => {
    for (const type of ["image/svg+xml", "text/html", ""]) {
      expect(lokMediaProblem({ type, size: 10 })).toMatch(/PNG, JPEG/);
    }
  });

  it("refuses anything over 10 MiB", () => {
    expect(lokMediaProblem({ type: "image/png", size: LOK_MEDIA_MAX_BYTES + 1 })).toMatch(/10 MB/);
  });

  it("offers only the allowed types in the file picker", () => {
    expect(LOK_MEDIA_ACCEPT.split(",")).not.toContain("image/svg+xml");
  });
});
