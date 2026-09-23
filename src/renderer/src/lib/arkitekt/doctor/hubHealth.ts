import type { HubHealthFragment } from "@/lok-next/api/graphql";
import type { Instance } from "../fakts/faktsSchema";
import type { ServiceHealthStatus } from "../types";

/**
 * What the hub says about itself, next to what this computer sees.
 *
 * The hub posts a health report to lok on an interval; lok is the
 * coordination server, so it is reachable even when every service on the hub
 * is not. That makes it the one witness that can split "the service is down"
 * from "the path between you and the service is broken" — which no probe run
 * from this side can tell apart.
 *
 * Plain data only: `diagnose` must stay testable from fixtures, so nothing
 * below the adapter knows about GraphQL.
 */

export type HubServiceHealth = {
  healthy: boolean;
  reason?: string | null;
};

export type HubHealthFacts = {
  name: string;
  /** lok's own verdict: reported within the last three intervals. */
  online: boolean;
  /** ISO timestamp of the last report; null if it never reported. */
  lastSeenAt?: string | null;
  lastHealthy?: boolean | null;
  version: string;
  /** Null when the hub never reported mesh state. */
  meshConnected?: boolean | null;
  /** The hub node's MagicDNS name or mesh IP; empty when unknown. */
  meshHost?: string;
  /**
   * Keyed by the app's service key (the fakts `instances` key), so a probe
   * target can be tied to the hub's word about the same service. Instances the
   * hub reported that this app does not use are dropped.
   */
  services: Record<string, HubServiceHealth>;
};

type HubInstanceEntry = NonNullable<HubHealthFragment["latestHealth"]>["instances"][number];

/**
 * The hub's entry for one fakts instance. Fakts carries the lok instance id
 * as `identifier`; the alias ids are the same rows on both sides, so they
 * are the fallback if that ever stops being true.
 */
export const hubEntryFor = <E extends { instance: { id: string; aliases: { id: string }[] } }>(
  instance: Instance,
  entries: E[],
): E | undefined =>
  entries.find((entry) => entry.instance.id === instance.identifier) ??
  entries.find((entry) =>
    entry.instance.aliases.some((hubAlias) =>
      instance.aliases.some((alias) => alias.id === hubAlias.id),
    ),
  );

/** The one GraphQL → facts adapter. */
export const toHubHealthFacts = (
  hub: HubHealthFragment,
  instances: Record<string, Instance>,
): HubHealthFacts => {
  const entries: HubInstanceEntry[] = hub.latestHealth?.instances ?? [];
  const services: Record<string, HubServiceHealth> = {};
  for (const [key, instance] of Object.entries(instances)) {
    const entry = hubEntryFor(instance, entries);
    if (entry) services[key] = { healthy: entry.healthy, reason: entry.reason ?? null };
  }

  return {
    name: hub.name,
    online: hub.online,
    lastSeenAt: hub.lastSeenAt ?? null,
    lastHealthy: hub.lastHealthy ?? null,
    version: hub.version,
    meshConnected: hub.meshConnected ?? null,
    meshHost: hub.meshHost || undefined,
    services,
  };
};

/* ───────────────────────────── comparison ─────────────────────────────── */

export type HubSide = "healthy" | "unhealthy" | "unreported" | "offline";
export type ClientSide = "ok" | "failing" | "checking";

/**
 * - `agree-ok` / `agree-down`: both sides say the same thing.
 * - `hub-offline`: the hub stopped reporting and nothing answers — the hub
 *   itself (machine, network, reporter) is the likely cause.
 * - `path-broken`: the hub sees the service healthy, this computer cannot
 *   reach it — the problem is between the two.
 * - `stale-report`: the hub says down (or went quiet), yet the service answers.
 * - `unknown`: one side has nothing to say yet.
 */
export type HubVerdict =
  | "agree-ok"
  | "agree-down"
  | "hub-offline"
  | "path-broken"
  | "stale-report"
  | "unknown";

export type HubComparison = {
  hub: HubSide;
  client: ClientSide;
  verdict: HubVerdict;
  reason?: string | null;
};

export const hubSideFor = (facts: HubHealthFacts, serviceKey: string): HubSide => {
  if (!facts.lastSeenAt) return "unreported";
  // A quiet hub's last word is stale, whatever it said.
  if (!facts.online) return "offline";
  const entry = facts.services[serviceKey];
  if (!entry) return "unreported";
  return entry.healthy ? "healthy" : "unhealthy";
};

export const clientSideFor = (status: ServiceHealthStatus): ClientSide | undefined => {
  switch (status) {
    case "ready":
      return "ok";
    case "invalid":
      return "failing";
    case "checking":
    case "configured":
      return "checking";
    default:
      return undefined;
  }
};

export const compareService = (
  facts: HubHealthFacts,
  serviceKey: string,
  client: ClientSide,
): HubComparison => {
  const hub = hubSideFor(facts, serviceKey);
  const reason = facts.services[serviceKey]?.reason ?? null;
  const verdict = ((): HubVerdict => {
    if (client === "checking" || hub === "unreported") return "unknown";
    if (hub === "healthy") return client === "ok" ? "agree-ok" : "path-broken";
    if (hub === "unhealthy") return client === "ok" ? "stale-report" : "agree-down";
    return client === "ok" ? "stale-report" : "hub-offline";
  })();
  return { hub, client, verdict, reason };
};

export const HUB_SIDE_LABEL: Record<HubSide, string> = {
  healthy: "healthy",
  unhealthy: "unhealthy",
  unreported: "not reported",
  offline: "not reporting",
};

export const CLIENT_SIDE_LABEL: Record<ClientSide, string> = {
  ok: "reachable",
  failing: "unreachable",
  checking: "checking",
};

/** One sentence per verdict, shared by the Services page and the doctor. */
export const HUB_VERDICT_TEXT: Record<HubVerdict, string> = {
  "agree-ok": "Both sides agree it is up.",
  "agree-down": "The hub reports it down too — this is not your connection.",
  "hub-offline": "The hub has stopped reporting, so the hub itself is likely down.",
  "path-broken": "The hub sees it running, so the problem is between this computer and the hub.",
  "stale-report": "It answers from here even though the hub's last report says otherwise.",
  unknown: "",
};
