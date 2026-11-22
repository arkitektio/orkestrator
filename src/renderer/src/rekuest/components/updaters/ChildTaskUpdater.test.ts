import { describe, expect, it } from "vitest";
import { isDirectChild } from "./ChildTaskUpdater";

describe("isDirectChild", () => {
  // `childTasks(id)` carries every descendant: its parent's and its root's topic.
  it("takes a task the page's task called", () => {
    expect(isDirectChild({ parent: "41" }, "41")).toBe(true);
  });

  it("leaves out a grandchild, which its own parent lists", () => {
    expect(isDirectChild({ parent: "57" }, "41")).toBe(false);
    expect(isDirectChild({ parent: null }, "41")).toBe(false);
  });
});
