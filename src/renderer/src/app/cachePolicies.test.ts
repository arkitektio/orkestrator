import { describe, expect, it } from "vitest";
import { compoundKey } from "./cachePolicies";

describe("compoundKey (elektro Cell / Section)", () => {
  it("keys on the compound id, so two models' somas never merge", () => {
    expect(compoundKey({ __typename: "Section", id: "soma", compoundId: "12:pyr:soma" })).toBe(
      "Section:12:pyr:soma",
    );
    expect(compoundKey({ __typename: "Section", id: "soma", compoundId: "13:pyr:soma" })).toBe(
      "Section:13:pyr:soma",
    );
  });

  it("leaves an object without a compound id un-normalized", () => {
    expect(compoundKey({ __typename: "Section", id: "soma" })).toBe(false);
    expect(compoundKey({ __typename: "Cell", id: "pyr", compoundId: null })).toBe(false);
  });
});
