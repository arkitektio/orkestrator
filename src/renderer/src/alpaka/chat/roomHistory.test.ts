import { describe, expect, it } from "vitest";
import type { ListMessageFragment } from "../api/graphql";
import { withEarlier } from "./roomHistory";

const message = (id: string): ListMessageFragment => ({
  __typename: "Message",
  id,
  text: id,
  isStreaming: false,
  createdAt: id,
  agent: { __typename: "Agent", id: "a", name: "default", user: { __typename: "User", id: "u", preferredUsername: "ada" } },
  attachedStructures: [],
});

describe("withEarlier", () => {
  it("adds the older page to what the room holds, each message once", () => {
    const held = [message("5"), message("4")];
    const merged = withEarlier(held, [message("4"), message("3"), message("2")]);
    expect(merged.map((m) => m.id)).toEqual(["5", "4", "3", "2"]);
  });
});
