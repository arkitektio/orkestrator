import type { Alias, Instance } from "../fakts/faktsSchema";
import { sameAlias } from "./helpers";
import { checkAliasHealth, type AliasFailure } from "./resolve";

/** One probe of one alias, as it starts and as it ends. */
export type AliasAttemptEvent =
  | { alias: Alias; route: "direct" | "mesh"; state: "trying" }
  | { alias: Alias; route: "direct" | "mesh"; state: "ok" }
  | { alias: Alias; route: "direct" | "mesh"; state: "failed"; failure?: AliasFailure };

/**
 * The alias a service should be reached on, in the order that costs least:
 *
 *  1. the alias it answered on last time (one probe, the common case);
 *  2. every alias reachable directly — now, without waiting for anything;
 *  3. only then the aliases behind the mesh, once the mesh is up.
 *
 * Step 3's wait is what stops a launch from probing mesh addresses in the
 * seconds before the node has joined, timing out, and marking the service
 * invalid. `meshUp` settles when the node runs, fails or the wait runs out;
 * either way the mesh aliases are then tried, so a failure is still reported
 * as the service being unreachable — with the doctor to say why.
 *
 * `onAttempt` and `onMeshWait` narrate the walk for the progress surfaces;
 * they never change it.
 */
export const resolveServiceAlias = async ({
  instance,
  cached,
  timeout = 5000,
  controller,
  routed = () => false,
  meshUp = async () => {},
  onAttempt,
  onMeshWait,
}: {
  instance: Instance;
  cached?: Alias;
  timeout?: number;
  controller: AbortController;
  /** Does this alias go through the mesh? */
  routed?: (alias: Alias) => boolean;
  /** Settles when mesh-routed aliases are worth trying. */
  meshUp?: () => Promise<void>;
  onAttempt?: (event: AliasAttemptEvent) => void;
  /** `true` while the walk waits on `meshUp`, `false` once it moves on. */
  onMeshWait?: (waiting: boolean) => void;
}): Promise<Alias> => {
  const waitForMesh = async () => {
    onMeshWait?.(true);
    try {
      await meshUp();
    } finally {
      onMeshWait?.(false);
    }
  };
  const probe = async (alias: Alias): Promise<boolean> => {
    // Cancelled while it waited (for the mesh, say): stop, do not probe on.
    if (controller.signal.aborted) throw controller.signal.reason ?? new DOMException("The alias check was cancelled", "AbortError");
    const route = routed(alias) ? "mesh" : "direct";
    onAttempt?.({ alias, route, state: "trying" });
    let failure: AliasFailure | undefined;
    const ok = await checkAliasHealth(alias, timeout, controller, (why) => (failure = why));
    onAttempt?.(ok ? { alias, route, state: "ok" } : { alias, route, state: "failed", failure });
    return ok;
  };

  if (cached) {
    if (routed(cached)) await waitForMesh();
    if (await probe(cached)) return cached;
  }

  const untried = instance.aliases.filter((alias) => !sameAlias(alias, cached));
  /** The first that answers, in fakts' order; only the caller's cancel throws. */
  const tryAll = async (aliases: Alias[]): Promise<Alias | undefined> => {
    for (const candidate of aliases) {
      if (await probe(candidate)) return candidate;
    }
    return undefined;
  };

  const direct = await tryAll(untried.filter((alias) => !routed(alias)));
  if (direct) return direct;

  const behindMesh = untried.filter(routed);
  if (behindMesh.length > 0) {
    await waitForMesh();
    const viaMesh = await tryAll(behindMesh);
    if (viaMesh) return viaMesh;
  }

  throw new Error(`No working alias found for service: ${instance.service}`);
};
