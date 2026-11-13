import type { Alias } from "../fakts/faktsSchema";
import type { ServiceRuntimeState } from "../types";

/**
 * The app's connection to ONE service, as a state machine.
 *
 *   idle ──check──▶ probing ──answered──▶ up ──check──▶ up (rechecking)
 *                      │                   │
 *                  unanswered          unanswered
 *                      ▼                   ▼
 *                    down ──check──▶ probing (attempts kept)
 *
 * The rule it exists for: a service is `up` only on an address that answered
 * in THIS session. It used to start out "ready" on whatever address was
 * cached from the last one, so pages queried an address nobody had checked —
 * and showed errors until the check caught up and swapped the client.
 *
 * Pure: events in, state out. `runtimeOf` is how the rest of the app sees a
 * link — the `ServiceRuntimeState` fields the guards already read — so nothing
 * outside the connection layer knows links exist.
 */
export type Link =
  /** Configured, not checked in this session. */
  | { phase: "idle" }
  /** Being checked, with no address that is known to work. `attempts`: failed checks in a row. */
  | { phase: "probing"; since: number; attempts: number; downSince?: number }
  /**
   * Answering on `alias`. `rechecking` while a check runs; the client stays.
   * `failures`: network errors its client reported since it last answered.
   */
  | { phase: "up"; alias: Alias; verifiedAt: number; rechecking: boolean; failures: number }
  /** No address answered. `since` is when it went down, `at` the last failed check. */
  | { phase: "down"; reason: string; since: number; at: number; attempts: number };

export type LinkEvent =
  /** A check starts. */
  | { type: "check"; at: number }
  /** An address answered its challenge. */
  | { type: "answered"; alias: Alias; at: number }
  /** Every address said no. */
  | { type: "unanswered"; reason: string; at: number }
  /** The service's client could not reach it (not: it answered with an error). */
  | { type: "network-error" }
  /** A new session: nothing known about the last one applies. */
  | { type: "reset" };

export const IDLE: Link = { phase: "idle" };

export const reduceLink = (link: Link, event: LinkEvent): Link => {
  switch (event.type) {
    case "reset":
      return IDLE;
    case "check":
      if (link.phase === "up") return link.rechecking ? link : { ...link, rechecking: true };
      if (link.phase === "probing") return link;
      // A check of a link that is down remembers how long it has been.
      return link.phase === "down"
        ? { phase: "probing", since: event.at, attempts: link.attempts, downSince: link.since }
        : { phase: "probing", since: event.at, attempts: 0 };
    case "answered":
      return { phase: "up", alias: event.alias, verifiedAt: event.at, rechecking: false, failures: 0 };
    case "unanswered":
      return {
        phase: "down",
        reason: event.reason,
        since: link.phase === "down" ? link.since : link.phase === "probing" ? (link.downSince ?? event.at) : event.at,
        at: event.at,
        attempts: (link.phase === "down" || link.phase === "probing" ? link.attempts : 0) + 1,
      };
    case "network-error":
      return link.phase === "up" ? { ...link, failures: link.failures + 1 } : link;
  }
};

/** Network errors in a row before an `up` link is worth checking again. */
export const SUSPECT_AFTER = 2;

/** Up, but its client keeps failing to reach it: check it again. */
export const isSuspect = (link: Link): boolean =>
  link.phase === "up" && !link.rechecking && link.failures >= SUSPECT_AFTER;

const RETRY_BASE_MS = 5_000;
const RETRY_CAP_MS = 60_000;

/** How long after a failed check a `down` link is tried again: 5 s, doubling, a minute at most. */
export const retryDelay = (attempts: number): number =>
  Math.min(RETRY_CAP_MS, RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1));

/** When a `down` link is due for its next check; undefined for any other. */
export const retryAt = (link: Link): number | undefined =>
  link.phase === "down" ? link.at + retryDelay(link.attempts) : undefined;

/** A link, in the fields the guards and pages read. Nothing for one never checked. */
export const runtimeOf = (link: Link): Partial<ServiceRuntimeState> => {
  switch (link.phase) {
    case "idle":
      return {};
    case "probing":
      return { status: "checking", errors: [], revalidating: false };
    case "up":
      return { status: "ready", errors: [], revalidating: link.rechecking, lastCheckedAt: link.verifiedAt };
    case "down":
      return { status: "invalid", errors: [link.reason], revalidating: false, lastCheckedAt: link.at };
  }
};
