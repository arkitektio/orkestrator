import { describe, expect, it } from "vitest";
import type { HubHealthFragment } from "@/lok/api/graphql";
import type { Instance } from "../fakts/faktsSchema";
import {
  clientSideFor,
  compareService,
  hubEntryFor,
  toHubHealthFacts,
  type HubHealthFacts,
} from "./hubHealth";

const alias = (id: string) => ({ id, host: `${id}.example`, ssl: true, challenge: "ht" });

const instance = (identifier: string, aliasIds: string[]): Instance => ({
  identifier,
  service: "live.arkitekt.mikro",
  aliases: aliasIds.map(alias),
});

const entry = (id: string, aliasIds: string[], healthy = true, reason: string | null = null) => ({
  healthy,
  reason,
  instance: { id, instanceId: "default", name: id, aliases: aliasIds.map((a) => ({ id: a })) },
});

const fragment = (overrides: Partial<HubHealthFragment> = {}): HubHealthFragment => ({
  id: "1",
  name: "lab-hub",
  identifier: "lab.hub",
  version: "1.4.0",
  online: true,
  lastSeenAt: "2026-09-23T10:00:00Z",
  lastHealthy: true,
  meshConnected: true,
  meshHost: "lab-hub.tailnet.ts.net",
  latestHealth: {
    id: "r1",
    healthy: false,
    createdAt: "2026-09-23T10:00:00Z",
    instances: [entry("3", ["a1"]), entry("4", ["b1"], false, "database unreachable")],
  },
  ...overrides,
});

const facts = (overrides: Partial<HubHealthFacts> = {}): HubHealthFacts => ({
  name: "lab-hub",
  online: true,
  lastSeenAt: "2026-09-23T10:00:00Z",
  version: "1.4.0",
  services: { mikro: { healthy: true }, rekuest: { healthy: false, reason: "db down" } },
  ...overrides,
});

describe("hubEntryFor", () => {
  it("joins on the lok instance id fakts carries as identifier", () => {
    expect(hubEntryFor(instance("3", ["zz"]), [entry("4", []), entry("3", [])])?.instance.id).toBe("3");
  });

  it("falls back to a shared alias id", () => {
    expect(hubEntryFor(instance("live.arkitekt.mikro", ["b1"]), [entry("3", ["a1"]), entry("4", ["b1"])])?.instance.id).toBe("4");
  });

  it("finds nothing for an instance the hub did not report", () => {
    expect(hubEntryFor(instance("9", ["x"]), [entry("3", ["a1"])])).toBeUndefined();
  });
});

describe("toHubHealthFacts", () => {
  it("keys the report by the app's service keys and drops unknown instances", () => {
    const result = toHubHealthFacts(fragment(), {
      mikro: instance("3", ["a1"]),
      rekuest: instance("4", ["b1"]),
    });
    expect(result.services).toEqual({
      mikro: { healthy: true, reason: null },
      rekuest: { healthy: false, reason: "database unreachable" },
    });
    expect(result.meshHost).toBe("lab-hub.tailnet.ts.net");
  });

  it("copes with a hub that never reported", () => {
    const result = toHubHealthFacts(
      fragment({ lastSeenAt: null, latestHealth: null, meshHost: "", meshConnected: null }),
      { mikro: instance("3", ["a1"]) },
    );
    expect(result.services).toEqual({});
    expect(result.lastSeenAt).toBeNull();
    expect(result.meshHost).toBeUndefined();
  });
});

describe("compareService", () => {
  it.each([
    ["mikro", "ok", "agree-ok"],
    ["mikro", "failing", "path-broken"],
    ["rekuest", "failing", "agree-down"],
    ["rekuest", "ok", "stale-report"],
    ["mikro", "checking", "unknown"],
    ["kabinet", "failing", "unknown"],
  ] as const)("%s seen %s from here → %s", (key, client, verdict) => {
    expect(compareService(facts(), key, client).verdict).toBe(verdict);
  });

  it("treats a quiet hub's last word as stale", () => {
    expect(compareService(facts({ online: false }), "mikro", "failing")).toMatchObject({
      hub: "offline",
      verdict: "hub-offline",
    });
    expect(compareService(facts({ online: false }), "mikro", "ok").verdict).toBe("stale-report");
  });

  it("has nothing to say about a hub that never reported", () => {
    expect(compareService(facts({ lastSeenAt: null }), "mikro", "failing")).toMatchObject({
      hub: "unreported",
      verdict: "unknown",
    });
  });

  it("carries the hub's reason", () => {
    expect(compareService(facts(), "rekuest", "failing").reason).toBe("db down");
  });
});

describe("clientSideFor", () => {
  it("maps runtime statuses", () => {
    expect(clientSideFor("ready")).toBe("ok");
    expect(clientSideFor("invalid")).toBe("failing");
    expect(clientSideFor("checking")).toBe("checking");
    expect(clientSideFor("unconfigured")).toBeUndefined();
  });
});
