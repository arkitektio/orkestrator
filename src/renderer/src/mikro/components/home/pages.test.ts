import { describe, expect, it } from "vitest";
import { hasMorePages, loadedPages } from "./pages";

const page = (size: number, answered = true) => ({ answered, roots: Array.from({ length: size }, (_, i) => i) });

describe("loadedPages", () => {
  it("keeps the pages in order up to the first that has not come", () => {
    expect(loadedPages(["a", undefined, "c"], 3)).toEqual(["a"]);
    expect(loadedPages(["a", "b", "c"], 2)).toEqual(["a", "b"]);
    expect(loadedPages([], 1)).toEqual([]);
  });
});

describe("hasMorePages", () => {
  it("offers more only after a full last page", () => {
    expect(hasMorePages([page(12), page(12)], 2, 12)).toBe(true);
    expect(hasMorePages([page(12), page(5)], 2, 12)).toBe(false);
  });

  it("waits for the page just asked for", () => {
    expect(hasMorePages([page(12)], 2, 12)).toBe(false);
    expect(hasMorePages([page(12, false)], 1, 12)).toBe(false);
  });
});
