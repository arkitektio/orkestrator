import { describe, expect, it } from "vitest";
import {
  connecting,
  KEY_LIFETIME_MS,
  KEY_MAX_ATTEMPTS,
  leaseExpired,
  LEASE_MS,
  needsConnect,
  newRecord,
  onError,
  onStatus,
  presented,
  usableKey,
  withKey,
} from "./node";
import type { MeshConfig } from "./protocol";

const LAB: MeshConfig = { id: "lab", label: "Lab", controlUrl: "https://mesh.example.org", hosts: [] };

const joining = (now = 0) => {
  const keyed = withKey(newRecord("lab"), "tskey", LAB, now);
  return connecting(keyed, 1, usableKey(keyed, now));
};

describe("node rules", () => {
  it("a key opens a lease, and a node that is in takes no key", () => {
    const keyed = withKey(newRecord("lab"), "tskey", LAB, 100);
    expect(keyed.key).toEqual({ value: "tskey", until: 100 + KEY_LIFETIME_MS, attempts: 0 });
    expect(keyed.lease?.until).toBe(100 + LEASE_MS);

    const inside = onStatus(connecting(newRecord("lab"), 1, undefined), { id: "lab", state: "running" });
    expect(withKey(inside, "tskey", LAB, 0)).toBe(inside);
  });

  it("reconnects for a key it has not tried, only while not in", () => {
    const keyless = onStatus(connecting(newRecord("lab"), 1, undefined), { id: "lab", state: "needs-login" });
    expect(needsConnect(keyless, 0)).toBe(false);
    expect(needsConnect(withKey(keyless, "tskey", LAB, 0), 0)).toBe(true);
    expect(needsConnect(joining(), 0)).toBe(false);
  });

  it("gives a key up once it expired or failed to land too often", () => {
    let record = withKey(newRecord("lab"), "tskey", LAB, 0);
    expect(usableKey(record, KEY_LIFETIME_MS + 1)).toBeUndefined();
    for (let i = 0; i < KEY_MAX_ATTEMPTS; i++) record = connecting(record, i + 1, usableKey(record, 0));
    expect(usableKey(record, 0)).toBeUndefined();
  });

  it("reads a joining node's passing NeedsLogin as starting", () => {
    const record = onStatus(joining(), { id: "lab", state: "needs-login" });
    expect(presented(record).state).toBe("starting");
    expect(presented(leaseExpired(record, LEASE_MS + 1)).state).toBe("needs-login");
  });

  it("being in consumes the key and ends the join; a refusal drops the key with its reason", () => {
    const inside = onStatus(joining(), { id: "lab", state: "running" });
    expect(inside.key).toBeUndefined();
    expect(inside.lease).toBeUndefined();

    const refused = onError(onStatus(joining(), { id: "lab", state: "needs-login" }), "invalid auth key");
    expect(refused).toMatchObject({ key: undefined, lease: undefined, lastError: "invalid auth key" });
    expect(presented(refused)).toMatchObject({ state: "needs-login", lastError: "invalid auth key" });
  });

  it("a running node's complaint is not a refusal", () => {
    const inside = onStatus(connecting(newRecord("lab"), 1, undefined), { id: "lab", state: "running" });
    expect(onError(inside, "transient")).toBe(inside);
  });
});
