// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { shownContent } from "./MaterializedBlokRenderer";

const blok = { componentTree: [{ id: "head", component: "Text" }], demoState: { at: "head" } };
const revision = { componentTree: [{ id: "pinned", component: "Text" }], demoState: { at: "pinned" } };

describe("shownContent", () => {
  it("draws the revision a materialization shows", () => {
    expect(shownContent({ blok, revision })).toBe(revision);
  });

  it("draws the blok when it has no revision (a provided blok)", () => {
    expect(shownContent({ blok, revision: null })).toBe(blok);
    expect(shownContent({ blok })).toBe(blok);
  });
});
