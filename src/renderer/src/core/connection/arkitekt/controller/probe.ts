import { sameAlias } from "../alias/helpers";
import { checkAliasHealth, type AliasFailure } from "../alias/resolve";
import { usableAliases } from "../alias/serviceAlias";
import type { Alias, Instance } from "../fakts/faktsSchema";

/** One probe of one alias, as it starts and as it ends. */
export type AliasAttemptEvent =
  | { alias: Alias; route: "direct" | "mesh"; state: "trying" }
  | { alias: Alias; route: "direct" | "mesh"; state: "ok" }
  | { alias: Alias; route: "direct" | "mesh"; state: "failed"; failure?: AliasFailure };

/** How long the alias that answered last time is tried alone. */
export const PROBE_HEAD_START_MS = 1_000;
/** With no direct answer by then, the mesh is asked for while the direct probes go on. */
export const PROBE_MESH_AFTER_MS = 1_500;
/** How long an answer waits for a preferred alias still in flight. */
export const PROBE_TIE_MS = 150;

/**
 * The alias a service should be reached on: a race, not a walk.
 *
 * It used to be a walk — the cached alias, then every direct one in turn with
 * its full timeout, and the mesh only once all of those had failed — so a
 * laptop that left the LAN paid five seconds per dead address before the mesh
 * was even started. Now:
 *
 *  1. the alias it answered on last time goes first and alone, but only for a
 *     head start (`headStartMs`), not for its whole timeout;
 *  2. then every direct alias is probed at once;
 *  3. the mesh is asked for (`meshUp`) straight away when the last alias was a
 *     mesh one or there is no direct alias at all, the moment every direct one
 *     has failed, and otherwise after `meshAfterMs` without an answer — while
 *     the direct probes keep running. Its aliases are probed once `meshUp`
 *     settles, however it settled, so a failure is still reported as the
 *     service being unreachable, with the doctor to say why.
 *
 * The first answer wins, except that an alias earlier in the preference order
 * (last, direct in fakts' order, mesh in fakts' order) still in flight gets
 * `tieMs` to answer too. A hub whose direct addresses work therefore never
 * asks for the mesh. Rejects only when every usable alias said no, or with
 * the caller's own cancel.
 *
 * `usableAliases` applies: a strict instance's plain aliases are not used off
 * the mesh. `onAttempt` and `onMeshWait` narrate; they never change the race.
 */
export const probeService = ({
  instance,
  cached,
  timeout = 5000,
  controller,
  routed = () => false,
  meshUp = async () => {},
  onAttempt,
  onMeshWait,
  headStartMs = PROBE_HEAD_START_MS,
  meshAfterMs = PROBE_MESH_AFTER_MS,
  tieMs = PROBE_TIE_MS,
}: {
  instance: Instance;
  cached?: Alias;
  /** Per alias. */
  timeout?: number;
  controller: AbortController;
  /** Does this alias go through the mesh? */
  routed?: (alias: Alias) => boolean;
  /** Asks for the mesh; settles when mesh-routed aliases are worth trying. */
  meshUp?: () => Promise<unknown>;
  onAttempt?: (event: AliasAttemptEvent) => void;
  /** `true` while the race waits on `meshUp`, `false` once it moves on. */
  onMeshWait?: (waiting: boolean) => void;
  headStartMs?: number;
  meshAfterMs?: number;
  tieMs?: number;
}): Promise<Alias> =>
  new Promise<Alias>((resolve, reject) => {
    const usable = usableAliases(instance, routed);
    // As fakts list it NOW, not as it was stored: the stored copy can predate
    // what lok says of the address, which decides its route. A cached plain
    // alias of an instance that has since become strict is not in `usable`.
    const last = cached ? usable.find((alias) => sameAlias(alias, cached)) : undefined;
    const direct = usable.filter((alias) => !routed(alias));
    const behindMesh = usable.filter(routed);
    const order = [...(last ? [last] : []), ...[...direct, ...behindMesh].filter((alias) => alias !== last)];
    const rank = (alias: Alias) => order.indexOf(alias);

    // Ours to abort: the losers of the race are cancelled, the caller's controller is not touched.
    const inner = new AbortController();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const launched = new Set<Alias>();
    const flying = new Set<Alias>();
    const answered: Alias[] = [];
    let settled = false;
    let meshAsked = false;
    let meshWaiting = false;

    const finish = (conclude: () => void) => {
      if (settled) return;
      settled = true;
      timers.forEach(clearTimeout);
      controller.signal.removeEventListener("abort", onAbort);
      if (meshWaiting) onMeshWait?.(false);
      meshWaiting = false;
      inner.abort();
      conclude();
    };
    const onAbort = () =>
      finish(() =>
        reject(
          controller.signal.reason instanceof Error
            ? controller.signal.reason
            : new DOMException("The alias check was cancelled", "AbortError"),
        ),
      );
    const after = (ms: number, run: () => void) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!settled) run();
      }, ms);
      timers.add(timer);
    };

    const decide = (force = false) => {
      if (settled) return;
      if (answered.length > 0) {
        const winner = answered.reduce((best, alias) => (rank(alias) < rank(best) ? alias : best));
        const preferredPending = [...flying].some((alias) => rank(alias) < rank(winner));
        if (force || !preferredPending) finish(() => resolve(winner));
        return;
      }
      if (flying.size > 0) return;
      // Whatever was tried said no: move on at once rather than sit out a timer.
      if (!direct.every((alias) => launched.has(alias))) return launchDirect();
      if (launched.size === order.length) {
        return finish(() => reject(new Error(`No working alias found for service: ${instance.service}`)));
      }
      askMesh();
    };

    const launch = (alias: Alias) => {
      if (settled || launched.has(alias)) return;
      launched.add(alias);
      flying.add(alias);
      const route = routed(alias) ? ("mesh" as const) : ("direct" as const);
      onAttempt?.({ alias, route, state: "trying" });
      let failure: AliasFailure | undefined;
      checkAliasHealth(alias, timeout, inner, (why) => (failure = why)).then(
        (ok) => {
          if (settled) return;
          flying.delete(alias);
          onAttempt?.(ok ? { alias, route, state: "ok" } : { alias, route, state: "failed", failure });
          if (ok) {
            answered.push(alias);
            if (answered.length === 1) after(tieMs, () => decide(true));
          }
          decide();
        },
        () => {
          // Only our own abort lands here, and that only happens once settled.
          if (settled) return;
          flying.delete(alias);
          decide();
        },
      );
    };
    const launchDirect = () => {
      direct.forEach(launch);
      decide();
    };
    const askMesh = () => {
      if (settled || meshAsked || behindMesh.length === 0) return;
      meshAsked = true;
      meshWaiting = true;
      onMeshWait?.(true);
      void Promise.resolve()
        .then(meshUp)
        .catch(() => undefined)
        .then(() => {
          if (settled) return;
          meshWaiting = false;
          onMeshWait?.(false);
          behindMesh.forEach(launch);
          decide();
        });
    };

    if (controller.signal.aborted) return onAbort();
    controller.signal.addEventListener("abort", onAbort);

    if (last) {
      if (routed(last)) askMesh();
      else launch(last);
      after(headStartMs, launchDirect);
    } else {
      direct.forEach(launch);
    }
    if (direct.length === 0) askMesh();
    else after(meshAfterMs, askMesh);
    // Nothing usable at all: say so now, there is no probe to wait for.
    if (order.length === 0) decide();
  });
