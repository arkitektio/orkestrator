// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("./Arkitekt", () => ({ Arkitekt: {} }));
vi.mock("@/core/command/QuickPalette", () => ({ QuickPalette: () => null }));

import { isOverlayElement } from "./QuickShell";

const el = (html: string, attrs: Record<string, string> = {}) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  for (const [k, v] of Object.entries(attrs)) div.setAttribute(k, v);
  return div;
};

describe("isOverlayElement", () => {
  it("counts a portalled dialog or popover", () => {
    expect(isOverlayElement(el('<div role="dialog">x</div>'))).toBe(true);
    expect(isOverlayElement(el("<div data-radix-popper-content-wrapper>menu</div>"))).toBe(true);
  });

  it("ignores the app root, tooltips, scripts and empty portals", () => {
    expect(isOverlayElement(el("<div>app</div>", { id: "root" }))).toBe(false);
    expect(isOverlayElement(el('<div><div role="tooltip">hint</div></div>'))).toBe(false);
    expect(isOverlayElement(document.createElement("script"))).toBe(false);
    expect(isOverlayElement(el(""))).toBe(false);
  });
});
