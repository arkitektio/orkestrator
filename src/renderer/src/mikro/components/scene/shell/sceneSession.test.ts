import { describe, expect, it, vi } from "vitest";

import type { SceneFragment } from "@/mikro/api/graphql";
import type { SceneScope } from "./sceneScopeBuild";
import { createSceneSession, type SceneSessionEnv, type SceneSessionInput } from "./sceneSession";

/**
 * The scene lifecycle with no React and no IO: `build`, `fold` and `retry` are
 * promises the test settles by hand, so every interleaving the old
 * effect-and-ref version had to survive is spelled out and held still.
 */

const fragment = (id: string, layerIds: string[], extra: Record<string, unknown> = {}) =>
  ({
    id,
    worldCoordinateSystem: { id: "w" },
    layers: layerIds.map((layerId) => ({ id: layerId, pathToWorld: null })),
    ...extra,
  }) as unknown as SceneFragment;

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };
const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/** Let every settled promise's continuation run. */
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const harness = () => {
  const builds: { scene: SceneFragment; isCancelled: () => boolean; done: Deferred<SceneScope> }[] = [];
  const folds: {
    scene: SceneFragment;
    scope: SceneScope;
    isCancelled: () => boolean;
    done: Deferred<{ failedStoreIds: string[] } | null>;
  }[] = [];
  const retries: SceneFragment[] = [];
  const timers: (() => void)[] = [];
  const env: SceneSessionEnv = {
    build: (args) => {
      const done = deferred<SceneScope>();
      builds.push({ scene: args.scene, isCancelled: args.isCancelled, done });
      return done.promise;
    },
    fold: (args) => {
      const done = deferred<{ failedStoreIds: string[] } | null>();
      folds.push({ scene: args.scene, scope: args.scope, isCancelled: args.isCancelled, done });
      return done.promise;
    },
    retry: async (args) => {
      retries.push(args.scene);
    },
    setTimer: (fn) => {
      timers.push(fn);
      return timers.length - 1;
    },
    clearTimer: (handle) => {
      timers[handle as number] = () => {};
    },
  };
  const session = createSceneSession(env);
  const published = vi.fn();
  session.subscribe(published);
  const client = {} as SceneSessionInput["client"];
  const datalayer = "http://datalayer" as unknown as SceneSessionInput["datalayer"];
  const give = (scene: SceneFragment | null, viewKey = "xyz") =>
    session.update({
      scene,
      viewAxes: [] as unknown as SceneSessionInput["viewAxes"],
      viewKey,
      client,
      datalayer,
    });
  const scopeNamed = (name: string) => ({ name }) as unknown as SceneScope;
  return { session, builds, folds, retries, timers, published, give, scopeNamed };
};

describe("scene session", () => {
  it("builds a scope for the scene it is first given", async () => {
    const h = harness();
    h.give(fragment("s1", ["a"]));
    expect(h.builds).toHaveLength(1);
    expect(h.session.getSnapshot().built).toBeNull();

    const scope = h.scopeNamed("one");
    h.builds[0].done.resolve(scope);
    await flush();

    expect(h.session.getSnapshot().built?.scope).toBe(scope);
    expect(h.session.getSnapshot().built?.viewKey).toBe("xyz");
    expect(h.folds).toHaveLength(0);
  });

  it("ignores a re-emission that changes neither the scope nor the layer set", async () => {
    const h = harness();
    h.give(fragment("s1", ["a"]));
    h.builds[0].done.resolve(h.scopeNamed("one"));
    await flush();
    const before = h.session.getSnapshot();
    h.published.mockClear();

    // A new object, new content — a saved render graph, a pinned view.
    h.give(fragment("s1", ["a"], { backgroundColor: "#000" }));
    await flush();

    expect(h.builds).toHaveLength(1);
    expect(h.folds).toHaveLength(0);
    expect(h.session.getSnapshot()).toBe(before);
    expect(h.published).not.toHaveBeenCalled();
  });

  it("folds a changed layer set into the SAME scope and publishes nothing", async () => {
    const h = harness();
    h.give(fragment("s1", ["a"]));
    const scope = h.scopeNamed("one");
    h.builds[0].done.resolve(scope);
    await flush();
    const ready = h.session.getSnapshot();
    h.published.mockClear();

    // The server minted an annotation layer.
    const withAnnotation = fragment("s1", ["a", "annotations"]);
    h.give(withAnnotation);
    expect(h.folds).toHaveLength(1);
    expect(h.folds[0].scene).toBe(withAnnotation);
    expect(h.folds[0].scope).toBe(scope);
    h.folds[0].done.resolve({ failedStoreIds: [] });
    await flush();

    // THE invariant: nothing a consumer could read as "not ready" — the canvas
    // stays mounted through a layer change.
    expect(h.builds).toHaveLength(1);
    expect(h.session.getSnapshot()).toBe(ready);
    expect(h.published).not.toHaveBeenCalled();

    // And it is settled: the same layer set again is nothing to do.
    h.give(fragment("s1", ["a", "annotations"]));
    expect(h.folds).toHaveLength(1);
  });

  it("builds what it had when the build started, then folds what arrived meanwhile", async () => {
    const h = harness();
    const first = fragment("s1", ["a"]);
    h.give(first);
    const later = fragment("s1", ["a", "b"]);
    h.give(later);
    // Same scope: no second build, and nothing to fold into yet.
    expect(h.builds).toHaveLength(1);
    expect(h.builds[0].scene).toBe(first);
    expect(h.folds).toHaveLength(0);

    h.builds[0].done.resolve(h.scopeNamed("one"));
    await flush();

    expect(h.folds).toHaveLength(1);
    expect(h.folds[0].scene).toBe(later);
  });

  it("drops a fold that was overtaken and folds the newest layer set", async () => {
    const h = harness();
    h.give(fragment("s1", ["a"]));
    h.builds[0].done.resolve(h.scopeNamed("one"));
    await flush();

    h.give(fragment("s1", ["a", "b"]));
    const newest = fragment("s1", ["a", "b", "c"]);
    h.give(newest);
    expect(h.folds).toHaveLength(2);
    expect(h.folds[0].isCancelled()).toBe(true);
    expect(h.folds[1].scene).toBe(newest);

    // The overtaken one landing late changes nothing.
    h.folds[0].done.resolve(null);
    h.folds[1].done.resolve({ failedStoreIds: [] });
    await flush();
    h.give(fragment("s1", ["a", "b", "c"]));
    expect(h.folds).toHaveLength(2);

    // A third change after it settled is folded too.
    h.give(fragment("s1", ["a"]));
    expect(h.folds).toHaveLength(3);
  });

  it("does not restart a fold for a re-emission of the layer set it is folding", async () => {
    const h = harness();
    h.give(fragment("s1", ["a"]));
    h.builds[0].done.resolve(h.scopeNamed("one"));
    await flush();

    h.give(fragment("s1", ["a", "b"]));
    h.give(fragment("s1", ["a", "b"], { backgroundColor: "#111" }));
    expect(h.folds).toHaveLength(1);
    expect(h.folds[0].isCancelled()).toBe(false);
  });

  it("abandons a fold when the layer set returns to what is already folded", async () => {
    const h = harness();
    h.give(fragment("s1", ["a"]));
    h.builds[0].done.resolve(h.scopeNamed("one"));
    await flush();

    // Staged, then discarded before the fold landed.
    h.give(fragment("s1", ["a", "staged"]));
    h.give(fragment("s1", ["a"]));
    expect(h.folds).toHaveLength(1);
    expect(h.folds[0].isCancelled()).toBe(true);
  });

  it("never publishes the result of a build that was overtaken", async () => {
    const h = harness();
    h.give(fragment("s1", ["a"]));
    h.give(fragment("s2", ["a"]));
    expect(h.builds).toHaveLength(2);
    expect(h.builds[0].isCancelled()).toBe(true);

    h.builds[0].done.resolve(h.scopeNamed("stale"));
    await flush();
    expect(h.session.getSnapshot().built).toBeNull();

    const fresh = h.scopeNamed("fresh");
    h.builds[1].done.resolve(fresh);
    await flush();
    expect(h.session.getSnapshot().built?.scope).toBe(fresh);
  });

  it("rebuilds when the view plane changes, and tears the old scope down at once", async () => {
    const h = harness();
    const scene = fragment("s1", ["a"]);
    h.give(scene, "xyz");
    h.builds[0].done.resolve(h.scopeNamed("xyz"));
    await flush();

    h.give(scene, "xzy");
    expect(h.session.getSnapshot().built).toBeNull();
    expect(h.builds).toHaveLength(2);
  });

  it("reports a failed build against its scope, and a new scope clears it", async () => {
    const h = harness();
    h.give(fragment("s1", ["a"]));
    h.builds[0].done.reject("no WebGPU");
    await flush();

    const failure = h.session.getSnapshot().failure;
    expect(failure?.error).toBeInstanceOf(Error);
    expect(failure?.error.message).toBe("no WebGPU");
    expect(failure?.scopeSignature).toContain("s1");
    // The same scene again does not retry on its own.
    h.give(fragment("s1", ["a"]));
    expect(h.builds).toHaveLength(1);

    h.give(fragment("s2", ["a"]));
    expect(h.session.getSnapshot().failure).toBeNull();
    expect(h.builds).toHaveLength(2);
  });

  it("holds no scope for no scene", async () => {
    const h = harness();
    h.give(fragment("s1", ["a"]));
    h.builds[0].done.resolve(h.scopeNamed("one"));
    await flush();

    h.give(null);
    expect(h.session.getSnapshot().built).toBeNull();
    expect(h.builds).toHaveLength(1);
  });

  it("retries arrays that would not open once, with the fragment of that moment", async () => {
    const h = harness();
    h.give(fragment("s1", ["a"]));
    h.builds[0].done.resolve(h.scopeNamed("one"));
    await flush();

    h.give(fragment("s1", ["a", "b"]));
    h.folds[0].done.resolve({ failedStoreIds: ["store-b"] });
    await flush();
    expect(h.timers).toHaveLength(1);

    // Content moved on while the timer ran (same layer set: no new fold).
    const current = fragment("s1", ["a", "b"], { backgroundColor: "#222" });
    h.give(current);
    h.timers[0]();
    await flush();

    expect(h.retries).toEqual([current]);
  });

  it("drops the retry when the scope it belonged to is gone", async () => {
    const h = harness();
    h.give(fragment("s1", ["a"]));
    h.builds[0].done.resolve(h.scopeNamed("one"));
    await flush();
    h.give(fragment("s1", ["a", "b"]));
    h.folds[0].done.resolve({ failedStoreIds: ["store-b"] });
    await flush();

    h.give(fragment("s2", ["a"]));
    h.timers[0]();
    await flush();
    expect(h.retries).toEqual([]);
  });

  it("starts clean after dispose — a StrictMode remount builds again", async () => {
    const h = harness();
    h.give(fragment("s1", ["a"]));
    h.session.dispose();
    expect(h.builds[0].isCancelled()).toBe(true);

    h.builds[0].done.resolve(h.scopeNamed("abandoned"));
    await flush();
    expect(h.session.getSnapshot().built).toBeNull();

    h.give(fragment("s1", ["a"]));
    expect(h.builds).toHaveLength(2);
    const scope = h.scopeNamed("remounted");
    h.builds[1].done.resolve(scope);
    await flush();
    expect(h.session.getSnapshot().built?.scope).toBe(scope);
  });
});
