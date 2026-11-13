import { useCallback, useEffect, useMemo, useRef } from "react";

import { Arkitekt } from "@/core/connection/arkitekt/host";
import { directnessTargets, summarizeDirectness, type Directness } from "./directness";
import { useMeshes } from "./useMeshes";

/** A machine is not pinged again sooner than this, however often it is asked for. */
export const DIRECTNESS_EVERY_MS = 30_000;

/**
 * Whether the mesh reaches the active organization's services directly or
 * through a relay (`directness.ts`), and a way to ask again.
 *
 * It asks once when the machines are first known (the mesh came up, a service
 * settled on a mesh address) and whenever `check` is called — the rail calls
 * it on hover — but never more than once per machine in `DIRECTNESS_EVERY_MS`.
 * The answers land in the window's mesh status store, so every reader of it
 * (the Mesh page's rows too) sees them.
 */
export const useMeshDirectness = (): Directness & { check: () => void } => {
  const services = Arkitekt.useAvailableServices();
  const hostKey = services
    .map((service) => service.alias?.host)
    .filter((host): host is string => !!host)
    .sort()
    .join("\n");
  const { payload, pings, ping } = useMeshes();

  const targets = useMemo(() => directnessTargets(hostKey ? hostKey.split("\n") : [], payload), [hostKey, payload]);
  const targetKey = targets.map((target) => `${target.meshId}::${target.target}`).join("\n");

  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  const pingRef = useRef(ping);
  pingRef.current = ping;
  const askedAt = useRef(new Map<string, number>());

  const check = useCallback(() => {
    const now = Date.now();
    for (const target of targetsRef.current) {
      // An offline machine has nothing to answer with.
      if (target.status === "offline") continue;
      const key = `${target.meshId}::${target.target}`;
      if (now - (askedAt.current.get(key) ?? -Infinity) < DIRECTNESS_EVERY_MS) continue;
      askedAt.current.set(key, now);
      void pingRef.current(target.meshId, target.target);
    }
  }, []);

  // Once per set of machines: when it changes, the new ones are asked.
  useEffect(() => {
    if (targetKey) check();
  }, [targetKey, check]);

  const directness = useMemo(() => summarizeDirectness(targets, pings), [targets, pings]);
  return useMemo(() => ({ ...directness, check }), [directness, check]);
};
