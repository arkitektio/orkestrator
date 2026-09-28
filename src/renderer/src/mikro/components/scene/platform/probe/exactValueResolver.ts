import type { ProbeFetchKey } from "./probeTypes";

/**
 * Async exact-value orchestration for the probe: at most ONE fetch in flight,
 * a hover storm collapses into a latest-wins pending slot, stale settlements
 * are dropped, and a small delivered-LRU absorbs cursor jitter across a voxel
 * boundary and back. Pure and dependency-injected for unit tests. Currently
 * unwired on the hover path (the hover readout stays at resident-LOD values
 * by design); wire `fetch` to `BrickResidencyManager.fetchExactVoxel` and
 * `deliver` to the store's exact-value merge to reintroduce upgrades (e.g.
 * for saved probes).
 */

const DELIVERED_LRU_SIZE = 8;

const keyId = (key: ProbeFetchKey): string =>
  `${key.layerId}:${key.voxelIndex.join(",")}:${key.sliceSignature}`;

export type ExactValueResolver = {
  request(key: ProbeFetchKey): void;
  dispose(): void;
};

export function createExactValueResolver(deps: {
  fetch: (key: ProbeFetchKey) => Promise<number[] | null>;
  deliver: (key: ProbeFetchKey, values: number[]) => void;
}): ExactValueResolver {
  let disposed = false;
  let inFlight: string | null = null;
  let pending: ProbeFetchKey | null = null;
  /** Id of the most recent request — only its settlement may deliver. */
  let latestId: string | null = null;
  const delivered = new Map<string, number[]>();

  const rememberDelivered = (id: string, values: number[]) => {
    delivered.delete(id);
    delivered.set(id, values);
    if (delivered.size > DELIVERED_LRU_SIZE) {
      const oldest = delivered.keys().next().value;
      if (oldest !== undefined) delivered.delete(oldest);
    }
  };

  const launch = (key: ProbeFetchKey) => {
    const id = keyId(key);
    inFlight = id;
    deps
      .fetch(key)
      .then((values) => {
        if (disposed) return;
        if (values !== null) {
          rememberDelivered(id, values);
          // Deliver only when this is still the newest request.
          if (id === latestId) deps.deliver(key, values);
        }
      })
      .catch(() => {
        // A failed fetch is dropped; a later request may retry the voxel.
      })
      .finally(() => {
        if (disposed) return;
        inFlight = null;
        if (pending !== null) {
          const next = pending;
          pending = null;
          launch(next);
        }
      });
  };

  return {
    request(key: ProbeFetchKey) {
      if (disposed) return;
      const id = keyId(key);
      if (id === latestId) return; // Dedupe: already newest (in flight or done).
      latestId = id;

      const cached = delivered.get(id);
      if (cached !== undefined) {
        rememberDelivered(id, cached); // Refresh LRU recency.
        deps.deliver(key, cached);
        return;
      }
      if (inFlight !== null) {
        pending = key; // Latest-wins: replace, never queue.
        return;
      }
      launch(key);
    },
    dispose() {
      disposed = true;
      pending = null;
    },
  };
}
