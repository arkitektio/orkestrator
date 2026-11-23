import { describe, expect, it } from "vitest";
import { agentConnectionKey } from "./connectionKey";

describe("agentConnectionKey", () => {
  const state = (profile: string | null, hub?: string) => ({
    profileBook: { activeProfileId: profile },
    connection: hub ? { endpoint: { base_url: hub } } : null,
  });

  it("is another agent for another login on the same hub", () => {
    expect(agentConnectionKey(state("alice", "https://hub"))).not.toBe(
      agentConnectionKey(state("bob", "https://hub")),
    );
  });

  it("is the same agent across a token refresh of one login", () => {
    expect(agentConnectionKey(state("alice", "https://hub"))).toBe(agentConnectionKey(state("alice", "https://hub")));
  });

  it("is no agent without a connection", () => {
    expect(agentConnectionKey(state("alice"))).toBeNull();
  });
});
