import { describe, expect, it } from "vitest";
import { rematerializeMappings } from "./blokRematerialize";

describe("rematerializeMappings", () => {
  it("keeps the agent of every key the blok still declares", () => {
    expect(
      rematerializeMappings(
        [
          { key: "self", agent: { id: "a1" } },
          { key: "stage", agent: { id: "a2" } },
        ],
        [{ key: "self" }, { key: "stage" }],
      ),
    ).toEqual([
      { key: "self", agent: "a1" },
      { key: "stage", agent: "a2" },
    ]);
  });

  it("binds a fork's app agent under the key the fork gave it", () => {
    expect(
      rematerializeMappings(
        [
          { key: "self", agent: { id: "a1" } },
          { key: "stage", agent: { id: "a2" } },
        ],
        [{ key: "openuc2" }, { key: "stage" }],
      ),
    ).toEqual([
      { key: "stage", agent: "a2" },
      { key: "openuc2", agent: "a1" },
    ]);
  });

  it("drops keys the blok no longer declares", () => {
    expect(
      rematerializeMappings([{ key: "gone", agent: { id: "a1" } }], [{ key: "self" }]),
    ).toEqual([]);
  });

  it("binds each key once", () => {
    expect(
      rematerializeMappings(
        [
          { key: "self", agent: { id: "a1" } },
          { key: "self", agent: { id: "a2" } },
        ],
        [{ key: "self" }],
      ),
    ).toEqual([{ key: "self", agent: "a1" }]);
  });
});
