import type { MeshConfig, MeshNodeStatus } from "./protocol";

/**
 * What main knows about one mesh's node, and the pure rules that move it.
 * No process, no timers, no I/O here: `MeshService` feeds events in and acts
 * on what comes back, so every rule is testable on its own.
 *
 * Three things are kept apart that used to share one message:
 *  - who WANTS the node — window claims (`claims.ts`) and a join `lease`;
 *  - the one-shot `key` main holds until the node is in with it;
 *  - which connect is current — `gen`, stamped by meshd on every event, so a
 *    replaced or disconnected node's late events are recognised and dropped.
 */

/** A key from a grant or `/f/meshkey/`: one-shot, short-lived, newer replaces older. */
export type PendingKey = {
  value: string;
  /** Not used after this (epoch ms). The server's own expiry is the authority. */
  until: number;
  /** Connects made with it; a key that keeps failing to land is given up. */
  attempts: number;
};

/** Main keeps the node wanted while it joins, whatever the windows claim. */
export type Lease = { config: MeshConfig; until: number };

export type NodeRecord = {
  id: string;
  /** The generation of the connect running now; meaningful while `connected`. */
  gen: number;
  /** meshd holds a node for this id under `gen`. */
  connected: boolean;
  /** The key value the current connect carried, if any. */
  connectedKey?: string;
  key?: PendingKey;
  lease?: Lease;
  /** The current node's last status, as meshd sent it (or main set it). */
  status: MeshNodeStatus;
  /** What the node last reported going wrong; cleared once it runs or connects anew. */
  lastError?: string;
};

/** Main-side lifetime of a key: shorter than the server's 15 minutes, which started earlier. */
export const KEY_LIFETIME_MS = 10 * 60_000;
export const KEY_MAX_ATTEMPTS = 3;
/** How long a join keeps the node up on its own. Long enough for a slow registration. */
export const LEASE_MS = 120_000;

export const newRecord = (id: string): NodeRecord => ({ id, gen: 0, connected: false, status: { id, state: "stopped" } });

/** A node that is in: logged in, or logged in and waiting for an administrator. */
export const isIn = (record: NodeRecord): boolean =>
  record.connected && (record.status.state === "running" || record.status.state === "needs-machine-auth");

export const usableKey = (record: NodeRecord, now: number): PendingKey | undefined =>
  record.key && record.key.until > now && record.key.attempts < KEY_MAX_ATTEMPTS ? record.key : undefined;

/** The current connect is joining with the key main holds. */
const joiningWithKey = (record: NodeRecord): boolean =>
  record.connected && !!record.key && record.connectedKey === record.key.value;

/** Take a key: a node already in has no use for it. */
export const withKey = (record: NodeRecord, value: string, config: MeshConfig, now: number): NodeRecord =>
  isIn(record)
    ? record
    : {
        ...record,
        key: { value, until: now + KEY_LIFETIME_MS, attempts: 0 },
        lease: { config, until: now + LEASE_MS },
      };

/**
 * Should the node be (re)connected, given it is wanted? Not connected, or a
 * key it has not tried yet while it is not in (a newer key deletes the older
 * one server-side, so a node still joining with that one would fail).
 */
export const needsConnect = (record: NodeRecord, now: number): boolean => {
  if (!record.connected) return true;
  const key = usableKey(record, now);
  return !!key && key.value !== record.connectedKey && !isIn(record);
};

/** A connect is going out under `gen`, with or without the held key. */
export const connecting = (record: NodeRecord, gen: number, key: PendingKey | undefined): NodeRecord => ({
  ...record,
  gen,
  connected: true,
  connectedKey: key?.value,
  key: key && record.key ? { ...record.key, attempts: record.key.attempts + 1 } : record.key,
  status: { id: record.id, state: "starting" },
  lastError: undefined,
});

/** No key and no login on disk: nothing to start, the node waits for a key. */
export const waitingForKey = (record: NodeRecord): NodeRecord => ({
  ...record,
  connected: false,
  connectedKey: undefined,
  status: { id: record.id, state: "needs-login" },
});

export const disconnected = (record: NodeRecord, state: MeshNodeStatus["state"] = "stopped", error?: string): NodeRecord => ({
  ...record,
  connected: false,
  connectedKey: undefined,
  status: { id: record.id, state, ...(error ? { error } : {}) },
});

/** The sidecar is gone for good (missing, outdated): a key cannot land, the join is over. */
export const unreachable = (record: NodeRecord, error: string): NodeRecord => ({
  ...disconnected(record, "error", error),
  key: undefined,
  lease: undefined,
});

/** Is this event about the node main holds now? */
export const isCurrent = (record: NodeRecord | undefined, gen: number | undefined): record is NodeRecord =>
  !!record && record.connected && gen === record.gen;

/**
 * A status of the current node. Being in consumes the key and ends the join;
 * a failed connect (meshd could not start it) leaves the node disconnected.
 */
export const onStatus = (record: NodeRecord, status: MeshNodeStatus): NodeRecord => {
  const next: NodeRecord = { ...record, status };
  if (status.state === "error") return { ...next, connected: false, connectedKey: undefined };
  if (status.state === "running" || status.state === "needs-machine-auth") {
    const consumed = joiningWithKey(record);
    return {
      ...next,
      lastError: status.state === "running" ? undefined : record.lastError,
      ...(consumed ? { key: undefined, lease: undefined } : {}),
    };
  }
  return next;
};

/**
 * An error the current node reported. While it joins with the held key, the
 * control server refused that key: it is dropped and the join ends. A node
 * that is in only had a passing complaint.
 */
export const onError = (record: NodeRecord, message: string): NodeRecord => {
  if (!message || record.status.state === "running") return record;
  if (joiningWithKey(record)) return { ...record, lastError: message, key: undefined, lease: undefined };
  return { ...record, lastError: message };
};

/** The lease ran out: the join stops holding the node up. The key stays until it expires. */
export const leaseExpired = (record: NodeRecord, now: number): NodeRecord =>
  record.lease && record.lease.until <= now ? { ...record, lease: undefined } : record;

/**
 * What the windows see. A node joining with a key passes through NeedsLogin
 * while its registration is in flight; that is not "not logged in", so it
 * reads as starting until the key lands or is refused.
 */
export const presented = (record: NodeRecord): MeshNodeStatus => {
  const masked =
    record.status.state === "needs-login" && !!record.lease && joiningWithKey(record) && !record.lastError;
  const status: MeshNodeStatus = masked ? { ...record.status, state: "starting" } : record.status;
  const { lastError: _raw, ...rest } = status;
  return record.lastError ? { ...rest, lastError: record.lastError } : rest;
};
