import type { SceneFragment } from "@/mikro/api/graphql";
import { sceneLayerSignature, sceneScopeSignature } from "../platform/model/sceneStructure";
import type {
  DatalayerEndpoint,
  MikroClient,
  SceneScope,
  SceneViewAxes,
  buildSceneScope,
  foldSceneLayers,
  retryFailedArrays,
} from "./sceneScopeBuild";

/**
 * The scene's lifecycle as ONE state machine: which scope is built, which
 * layer set is folded into it, and what to do when the scene it is handed
 * changes.
 *
 * ## Why this is not two React effects
 *
 * It used to be. The fragment a scene arrives as is re-emitted by the cache
 * for changes that must do nothing here (a saved render graph, a pinned view),
 * so the effects could not depend on it; they depended on SIGNATURES of it and
 * read the fragment itself through a ref assigned during render. A fragment
 * landing mid-fold was healed by stamping a signature into React state so the
 * effect would notice the mismatch and run again. The dependency arrays were
 * being used as a change detector, and the refs were how the effects reached
 * around them for the data they actually needed.
 *
 * Here the latest input is a field. `update` stores it and `settle` decides,
 * by the same two signatures, between the three tiers of the rebuild contract
 * (`SceneProvider`): REBUILD the scope, RECONCILE the layer set, or IGNORE.
 * Everything that runs later — a build starting, a fold finishing, the retry
 * timer firing — reads that one field, so "the current fragment" has a single
 * meaning and no closure can hold a stale one.
 *
 * ## Invariants
 *
 * - The published snapshot changes ONLY when a scope is built, fails or is
 *   torn down. A fold publishes nothing: the scope object is the same one, and
 *   a layer change must never be able to move a consumer off "ready" (that
 *   unmounts the canvas and disposes the renderer and every atlas).
 * - A build or fold records the layer signature of the fragment it USED, then
 *   settles again. A fragment that arrived meanwhile is folded next.
 * - A result nobody wants any more — its generation has passed — is dropped.
 */

export type SceneSessionInput = {
  scene: SceneFragment | null;
  viewAxes: SceneViewAxes;
  /** `viewAxes` as a key: a different plane is a different scope. */
  viewKey: string;
  client: MikroClient;
  datalayer: DatalayerEndpoint;
};

export type SceneSessionSnapshot = {
  /** The live scope, stamped with what it was built for. */
  built: { scopeSignature: string; viewKey: string; scope: SceneScope } | null;
  failure: { scopeSignature: string; error: Error } | null;
};

export type SceneSessionEnv = {
  build: typeof buildSceneScope;
  fold: typeof foldSceneLayers;
  retry: typeof retryFailedArrays;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

export type SceneSession = {
  /** Hand the session the scene as it is NOW. Cheap when nothing it keys on
   * changed, so it is called on every fragment identity. */
  update(input: SceneSessionInput): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): SceneSessionSnapshot;
  /** Cancel everything and forget; a later `update` starts clean. */
  dispose(): void;
};

/** How long after a fold whose arrays did not all open the one retry runs. */
export const ARRAY_RETRY_MS = 2000;

const EMPTY: SceneSessionSnapshot = { built: null, failure: null };

/** What a scope is built FOR: any of these moving is a rebuild. */
type BuildKey = {
  scopeSignature: string | null;
  viewKey: string;
  client: MikroClient;
  datalayer: DatalayerEndpoint;
};

const sameBuildKey = (a: BuildKey | null, b: BuildKey): boolean =>
  a !== null &&
  a.scopeSignature === b.scopeSignature &&
  a.viewKey === b.viewKey &&
  a.client === b.client &&
  a.datalayer === b.datalayer;

export function createSceneSession(env: SceneSessionEnv): SceneSession {
  const setTimer = env.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms) as unknown);
  const clearTimer = env.clearTimer ?? ((handle: unknown) => clearTimeout(handle as never));

  const listeners = new Set<() => void>();
  let snapshot: SceneSessionSnapshot = EMPTY;

  /** The scene as last handed in. THE current fragment, for everyone. */
  let input: SceneSessionInput | null = null;

  /** Moves on every build start and on dispose: work stamped with an older
   * one is stale. */
  let generation = 0;
  let buildKey: BuildKey | null = null;
  let building = false;

  /** The layer signature currently in the scope's stores (null: no scope). */
  let foldedLayerSignature: string | null = null;
  /** Moves on every fold start, so a superseded fold can tell. */
  let foldToken = 0;
  /** The layer signature a running fold is folding (null: none running). */
  let foldingSignature: string | null = null;
  let retryTimer: unknown = null;

  const publish = (next: SceneSessionSnapshot) => {
    if (next === snapshot) return;
    snapshot = next;
    for (const listener of listeners) listener();
  };

  const clearRetry = () => {
    if (retryTimer !== null) {
      clearTimer(retryTimer);
      retryTimer = null;
    }
  };

  const startBuild = (key: BuildKey, current: SceneSessionInput) => {
    generation += 1;
    const gen = generation;
    foldToken += 1;
    foldingSignature = null;
    foldedLayerSignature = null;
    clearRetry();
    buildKey = key;
    publish(EMPTY);

    const scene = current.scene;
    if (!scene || key.scopeSignature === null) {
      building = false;
      return;
    }
    building = true;
    const scopeSignature = key.scopeSignature;
    // Of the fragment actually built — a newer one may arrive before this
    // resolves, and `settle` then folds exactly the difference.
    const builtLayerSignature = sceneLayerSignature(scene);
    env
      .build({
        scene,
        viewAxes: current.viewAxes,
        client: current.client,
        datalayer: current.datalayer,
        isCancelled: () => gen !== generation,
      })
      .then(
        (scope) => {
          if (gen !== generation) return;
          building = false;
          foldedLayerSignature = builtLayerSignature;
          publish({ built: { scopeSignature, viewKey: key.viewKey, scope }, failure: null });
          settle();
        },
        (error: unknown) => {
          if (gen !== generation) return;
          building = false;
          publish({
            built: null,
            failure: {
              scopeSignature,
              error: error instanceof Error ? error : new Error(String(error)),
            },
          });
        },
      );
  };

  const armRetry = (scope: SceneScope, gen: number) => {
    clearRetry();
    retryTimer = setTimer(() => {
      retryTimer = null;
      // The fragment of NOW: layers may have come and gone in two seconds.
      const current = input;
      if (gen !== generation || !current?.scene) return;
      void env.retry({
        scope,
        scene: current.scene,
        client: current.client,
        datalayer: current.datalayer,
        isCancelled: () => gen !== generation,
      });
    }, ARRAY_RETRY_MS);
  };

  const startFold = (scope: SceneScope, current: SceneSessionInput, signature: string) => {
    const scene = current.scene;
    if (!scene) return;
    foldToken += 1;
    const token = foldToken;
    const gen = generation;
    foldingSignature = signature;
    // A new fold reopens what is missing itself.
    clearRetry();
    const stale = () => token !== foldToken || gen !== generation;
    const finish = () => {
      foldingSignature = null;
      // What is in the stores now — or, after a failure, what was tried:
      // either way not something to attempt again until the layer set moves.
      foldedLayerSignature = signature;
    };
    env
      .fold({
        scope,
        scene,
        client: current.client,
        datalayer: current.datalayer,
        isCancelled: stale,
      })
      .then(
        (result) => {
          if (stale() || result === null) return;
          finish();
          if (result.failedStoreIds.length > 0) armRetry(scope, gen);
          settle();
        },
        (error: unknown) => {
          if (stale()) return;
          finish();
          console.warn("[scene] layer fold failed", error);
        },
      );
  };

  /** Bring what is built and folded in line with the latest input. */
  const settle = () => {
    const current = input;
    if (!current) return;
    const key: BuildKey = {
      scopeSignature: current.scene ? sceneScopeSignature(current.scene) : null,
      viewKey: current.viewKey,
      client: current.client,
      datalayer: current.datalayer,
    };
    if (!sameBuildKey(buildKey, key)) {
      startBuild(key, current);
      return;
    }
    // Still building: the build stamps its own fragment and settles when it
    // lands. Failed, or no scene: nothing to fold into.
    const built = snapshot.built;
    if (building || !built || !current.scene) return;

    const signature = sceneLayerSignature(current.scene);
    if (signature === foldedLayerSignature) {
      // Back to what is already in the stores (a layer staged and discarded
      // again): whatever fold is running is folding something else.
      if (foldingSignature !== null) {
        foldToken += 1;
        foldingSignature = null;
      }
      return;
    }
    // A fold of exactly this layer set is already on its way.
    if (signature === foldingSignature) return;
    startFold(built.scope, current, signature);
  };

  return {
    update(next) {
      input = next;
      settle();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    dispose() {
      generation += 1;
      foldToken += 1;
      clearRetry();
      input = null;
      buildKey = null;
      building = false;
      foldingSignature = null;
      foldedLayerSignature = null;
      publish(EMPTY);
    },
  };
}
