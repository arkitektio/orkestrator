import { useContext } from "react";
import { createStore } from "zustand/vanilla";

import { createScopedStoreHooks } from "@/core/util/createScopedStore";
import type { PreviewLayerInput } from "@/mikro/api/graphql";
import type { PreviewedEngineLayer, PreviewedLayer } from "@/mikro/forms/addLayer/previewLayer";

/**
 * Layers a float has STAGED: drawn in the scene, saved nowhere.
 *
 * Each is the server's preview of a create (`previewLayer`), so it is drawn
 * from exactly the fields a saved layer has; it joins the scene's layers where
 * the scene folds the server's (`SceneProvider`), under an id no server row
 * has (`staged:…`). Keeping one sends the same input to the create; discarding
 * one drops it here, and nothing on the server changes. What the input names
 * (a lens an action made, a channel lens) is the server's either way: only the
 * LAYER is staged.
 *
 * Lives for the SCENE, not the store scope: a view switch rebuilds the scope,
 * and a staged layer must not vanish with it. Leaving the scene drops them all,
 * with nothing to clean up.
 */
export interface StagedLayer {
  /** `staged:…`: the layer's id in the scene, and the entry's identity. */
  key: string;
  /** The float that staged it, which owns it. */
  owner: string;
  label: string;
  input: PreviewLayerInput;
  /** The preview, its id rewritten to `key`. */
  layer: PreviewedLayer;
  /** The same preview as the Add Layer engine counts it, id rewritten too. */
  engine: PreviewedEngineLayer;
  /** The lens it was staged from: what a derivation row toggles. */
  source?: string;
  /** The run that made it (`resultOriginKey`): a rerun replaces its layers. */
  origin?: string;
  /** A Keep is in flight: the saved layer arrives with the scene's refetch. */
  keeping?: boolean;
}

export interface StagedLayersState {
  entries: StagedLayer[];
  /** Add, or replace the entry with the same key. */
  stage: (entry: StagedLayer) => void;
  discard: (keys: readonly string[]) => void;
  discardOwner: (owner: string) => void;
  setKeeping: (key: string, keeping: boolean) => void;
}

export const STAGED_PREFIX = "staged:";

/** Whether a layer id is a staged layer's, which no server row has. */
export const isStagedLayerId = (id: string | null | undefined): boolean => !!id && id.startsWith(STAGED_PREFIX);

/** A stable spelling of a value, its keys sorted. */
const stableJson = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(stableJson).join(",")}]`
    : value && typeof value === "object"
      ? `{${Object.keys(value)
          .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
          .join(",")}}`
      : JSON.stringify(value);

/** One key per input: the same layer staged twice is one entry. */
export const stagedKeyOf = (input: PreviewLayerInput): string => {
  const text = stableJson(input);
  // FNV-1a: short and stable; the input itself stays on the entry.
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${STAGED_PREFIX}${hash.toString(36)}`;
};

export const createStagedLayersStore = () =>
  createStore<StagedLayersState>()((set, get) => ({
    entries: [],
    stage: (entry) => {
      const entries = get().entries;
      const index = entries.findIndex((existing) => existing.key === entry.key);
      set({ entries: index < 0 ? [...entries, entry] : entries.map((existing, at) => (at === index ? entry : existing)) });
    },
    discard: (keys) => {
      if (!keys.length) return;
      const drop = new Set(keys);
      const entries = get().entries;
      if (entries.some((entry) => drop.has(entry.key))) set({ entries: entries.filter((entry) => !drop.has(entry.key)) });
    },
    discardOwner: (owner) => {
      const entries = get().entries;
      if (entries.some((entry) => entry.owner === owner)) set({ entries: entries.filter((entry) => entry.owner !== owner) });
    },
    setKeeping: (key, keeping) =>
      set({ entries: get().entries.map((entry) => (entry.key === key ? { ...entry, keeping } : entry)) }),
  }));

const {
  StoreContext: StagedLayersStoreContext,
  useScopedStore: useStagedLayersStore,
  useStoreApi: useStagedLayersStoreApi,
} = createScopedStoreHooks<StagedLayersState>("StagedLayersStore");

export { StagedLayersStoreContext, useStagedLayersStore, useStagedLayersStoreApi };

/** The store, or null outside a `SceneProvider`. */
export const useOptionalStagedLayersStoreApi = () => useContext(StagedLayersStoreContext);
