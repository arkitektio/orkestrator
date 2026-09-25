import { describe, expect, it } from "vitest";

import { resolveContextObjects } from "./contextObjects";
import type { Modifier } from "./ExtensionContext";
import type { Structure } from "@/core/types";

const page: Structure[] = [{ identifier: "@mikro/image", id: "1" }];

describe("resolveContextObjects", () => {
  it("falls back to the page's objects without smart modifiers", () => {
    expect(resolveContextObjects([], page)).toBe(page);
    expect(resolveContextObjects([{ type: "search" }], page)).toBe(page);
  });

  it("lets smart modifiers take over, keeping only the latest identifier", () => {
    const modifiers: Modifier[] = [
      { type: "smart", identifier: "@mikro/image", id: "7" },
      { type: "smart", identifier: "@kraph/entity", id: "8" },
      { type: "smart", identifier: "@kraph/entity", id: "9" },
    ];
    expect(resolveContextObjects(modifiers, page)).toEqual([
      { identifier: "@kraph/entity", id: "8" },
      { identifier: "@kraph/entity", id: "9" },
    ]);
  });
});
