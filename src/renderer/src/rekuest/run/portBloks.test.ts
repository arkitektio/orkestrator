import { describe, expect, it } from "vitest";
import { usesPortBlok } from "./portBloks";

describe("usesPortBlok", () => {
  it("finds a port blok at any depth, and none among plain widgets", () => {
    const plain = { widget: { __typename: "SliderAssignWidget" } };
    const blok = { widget: { __typename: "BlokAssignWidget" } };

    expect(usesPortBlok([plain, { widget: null, children: [plain, { children: [blok] }] }])).toBe(true);
    expect(usesPortBlok([plain, { widget: null, children: [plain, null] }])).toBe(false);
    expect(usesPortBlok(undefined)).toBe(false);
  });
});
