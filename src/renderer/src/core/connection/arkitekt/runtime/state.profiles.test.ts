import { describe, expect, it } from "vitest";

import { buildServiceStates } from "./state";
import type { ServiceBuilderMap, ServiceRuntimeState } from "../types";

const ALIAS = { id: "a1", host: "localhost", ssl: false, challenge: "ht" };

const sessionFor = (host: string) =>
  ({
    endpoint: {},
    fakts: {
      instances: { lok: { service: "live.arkitekt.lok", identifier: "3", aliases: [ALIAS] } },
      self: { deployment_name: host, alias: ALIAS },
      statuses: {},
    },
    token: {},
    aliasMap: { aliasMap: { lok: ALIAS } },
  }) as never;

const serviceBuilderMap = {
  lok: { key: "lok", service: "live.arkitekt.lok", builder: () => ({ client: {} }) },
} as unknown as ServiceBuilderMap;

/** What a previous profile left behind after a failed health check. */
const previousStates: Record<string, ServiceRuntimeState> = {
  lok: {
    key: "lok",
    configured: true,
    definition: serviceBuilderMap.lok,
    status: "invalid",
    errors: ["Failed to connect to the previous organization"],
    lastCheckedAt: 1,
  } as ServiceRuntimeState,
};

describe("buildServiceStates across a profile switch", () => {
  it("carries previous health forward when re-checking the SAME session", () => {
    // This inheritance is the point of `previousStates` and must keep working:
    // a re-check of one service must not blank the others.
    const states = buildServiceStates(
      serviceBuilderMap,
      sessionFor("alpha.test"),
      undefined,
      previousStates,
    );
    expect(states.lok.status).toBe("invalid");
    expect(states.lok.errors).toHaveLength(1);
  });

  it("drops it when previousStates is withheld, as a profile switch does", () => {
    // A healthy organization must not inherit the previous one's "invalid"
    // badges and stale error strings — they describe a deployment the user is
    // no longer signed in to.
    const states = buildServiceStates(
      serviceBuilderMap,
      sessionFor("beta.test"),
      undefined,
      undefined,
    );
    expect(states.lok.status).not.toBe("invalid");
    expect(states.lok.errors).toEqual([]);
    expect(states.lok.lastCheckedAt).toBeUndefined();
  });
});
