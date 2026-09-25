import { describe, expect, it } from "vitest";
import { NameScope } from "./tslNames";

describe("NameScope", () => {
  it("mints prefixed names per member", () => {
    const scope = new NameScope();
    const m0 = scope.prefixed("m0");
    const m1 = scope.prefixed("m1");
    expect(m0("bestNorm")).toBe("m0_bestNorm");
    expect(m1("bestNorm")).toBe("m1_bestNorm");
  });

  it("throws on a repeat within one scope", () => {
    // The failure mode this exists for: two emitters minting the same name into
    // one flat WGSL scope, where the second silently shadows the first.
    const scope = new NameScope();
    const m0 = scope.prefixed("m0");
    m0("srcNorm");
    expect(() => m0("srcNorm")).toThrow(/duplicate name "m0_srcNorm"/);
  });

  it("throws when two different prefixes collide into the same name", () => {
    const scope = new NameScope();
    scope.prefixed("a")("b_c");
    expect(() => scope.prefixed("a_b")("c")).toThrow(/duplicate name "a_b_c"/);
  });

  it("mints bare names for the empty prefix, so the single-member path is unchanged", () => {
    const scope = new NameScope();
    const bare = scope.prefixed("");
    expect(bare("ch")).toBe("ch");
    expect(() => bare("ch")).toThrow();
  });

  it("keeps scopes independent", () => {
    const first = new NameScope();
    const second = new NameScope();
    first.prefixed("m0")("acc");
    expect(() => second.prefixed("m0")("acc")).not.toThrow();
  });

  it("reports what it has claimed", () => {
    const scope = new NameScope();
    const m0 = scope.prefixed("m0");
    m0("a");
    m0("b");
    expect(scope.claimed()).toEqual(["m0_a", "m0_b"]);
    expect(scope.has("m0_a")).toBe(true);
    expect(scope.has("m0_c")).toBe(false);
  });

  it("catches the historical shadowing case: an unnamed inner loop over the channel loop", () => {
    // The real bug: a nested Loop reused the channel loop's iterator name, so
    // element(i) indexed by resident level instead of channel.
    const scope = new NameScope();
    const outer = scope.prefixed("");
    outer("ch");
    expect(() => outer("ch")).toThrow(/flat WGSL scope/);
  });
});
