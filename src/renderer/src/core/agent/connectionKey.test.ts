import { describe, expect, it } from "vitest";
import { agentConnectionKey, sameAgentConnection } from "./connectionKey";

describe("agentConnectionKey", () => {
  const state = (login: string | null, hub?: string, rekuestHost?: string) => ({
    storedSession: login ? { token: { client_id: login } } : null,
    connection: hub
      ? {
          endpoint: { base_url: hub },
          aliasMap: rekuestHost ? { rekuest: { host: rekuestHost, port: 443, path: "/rekuest" } } : {},
        }
      : null,
  });

  it("is another agent for another login on the same hub", () => {
    expect(agentConnectionKey(state("alice", "https://hub", "hub"))).not.toBe(
      agentConnectionKey(state("bob", "https://hub", "hub")),
    );
  });

  it("is another agent on another hub", () => {
    expect(agentConnectionKey(state("alice", "https://a", "a"))).not.toBe(
      agentConnectionKey(state("alice", "https://b", "b")),
    );
  });

  it("is the same agent across a token refresh of one login", () => {
    expect(agentConnectionKey(state("alice", "https://hub", "hub"))).toBe(
      agentConnectionKey(state("alice", "https://hub", "hub")),
    );
  });

  it("is no agent without a connection, or before rekuest has answered on an address", () => {
    expect(agentConnectionKey(state("alice"))).toBeNull();
    // A switch brings the new hub up with no service addresses: the agent waits for rekuest's.
    expect(agentConnectionKey(state("alice", "https://hub"))).toBeNull();
  });
});

describe("sameAgentConnection", () => {
  const ctx = (login: string, hub: string) => ({
    storedSession: { token: { client_id: login } },
    connection: { endpoint: { base_url: hub }, aliasMap: { rekuest: { host: hub } } },
  });

  it("takes a refresh of its own connection, and nothing of the next hub's", () => {
    const built = agentConnectionKey(ctx("alice", "https://a"));
    expect(sameAgentConnection(built, ctx("alice", "https://a"))).toBe(true);
    // Mid-switch: the store holds the other hub's connection before this agent is torn down.
    expect(sameAgentConnection(built, ctx("bob", "https://b"))).toBe(false);
    expect(sameAgentConnection(built, { connection: null })).toBe(false);
  });
});
