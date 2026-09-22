// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { marksAvailable, renderMarkPng } from "./offscreen";

/**
 * jsdom has no WebGL, which makes it exactly the environment this needs to
 * survive: a machine with a blocked GPU behaves the same way. The rule is that
 * a mark degrades to `null` and `AppIcon` keeps its initials — never that an
 * icon throws and takes a page render with it.
 */
describe("without WebGL", () => {
  it("returns null instead of throwing", () => {
    expect(() =>
      renderMarkPng({ name: "stardist-node", identifier: "live.arkitekt.stardist" }, { px: 128 }),
    ).not.toThrow();
    expect(
      renderMarkPng({ name: "stardist-node", identifier: "live.arkitekt.stardist" }, { px: 128 }),
    ).toBeNull();
  });

  it("reports itself unavailable", () => {
    expect(marksAvailable()).toBe(false);
  });

  it("gives up after the first failure rather than retrying per icon", () => {
    // A grid of forty apps must not attempt forty renderer constructions.
    const createElement = vi.spyOn(document, "createElement");
    for (let i = 0; i < 20; i++) renderMarkPng({ name: `app-${i}` }, { px: 128 });
    expect(createElement).not.toHaveBeenCalled();
    createElement.mockRestore();
  });
});
