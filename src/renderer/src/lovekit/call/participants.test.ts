import { describe, expect, it } from "vitest";
import type { CallParticipantFragment } from "../api/graphql";
import { applyParticipantEvent } from "./participants";

const person = (identity: string, joinedAt = 1): CallParticipantFragment => ({
  __typename: "CallParticipant",
  identity,
  name: identity,
  joinedAt,
});

describe("applyParticipantEvent", () => {
  it("adds who joins, once", () => {
    const next = applyParticipantEvent([person("a")], { joined: person("b") });
    expect(next.map((p) => p.identity)).toEqual(["a", "b"]);
    expect(applyParticipantEvent(next, { joined: person("b", 2) }).map((p) => [p.identity, p.joinedAt])).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });

  it("drops who leaves", () => {
    expect(applyParticipantEvent([person("a"), person("b")], { left: { identity: "a" } }).map((p) => p.identity)).toEqual(["b"]);
  });
});
