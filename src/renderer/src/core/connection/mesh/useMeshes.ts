import { useSyncExternalStore } from "react";
import type { MeshLockInitResult, MeshLockSignResult } from "../../../../../main/mesh/protocol";
import { meshBridge } from "./bridge";
import { meshStatusStore } from "./meshStatusStore";

/**
 * Live mesh state for a window, read from the window's one status store
 * (`meshStatusStore.ts`) — every window agrees, and no hook opens a
 * subscription of its own. Which mesh a window runs is not decided here: it
 * follows the active profile (`MeshSync`).
 */
export const useMeshes = () => {
  const store = meshStatusStore();
  const { payload, error } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  /** Latest ping attempt per `<meshId>::<target>`, pushed by main as they land. */
  const pings = useSyncExternalStore(store.subscribePings, store.getPings);

  return {
    available: store.available,
    /** The payload as main sent it; undefined until it has. */
    payload,
    sidecar: payload?.sidecar ?? { state: "idle" as const },
    /** Every mesh some window claims or main is joining; pick this window's out by id. */
    meshes: payload?.meshes ?? [],
    error,
    pings,
    /** Kicks off a ping; results arrive through `pings` as each attempt lands. */
    ping: async (meshId: string, target: string) => {
      const current = meshBridge();
      if (!current) return;
      store.setPing(meshId, { target, attempt: 0, final: false, ok: false, direct: false });
      try {
        await current.ping({ meshId, target });
      } catch (cause) {
        store.setPing(meshId, {
          target,
          attempt: 1,
          final: true,
          ok: false,
          direct: false,
          error: cause instanceof Error ? cause.message : String(cause),
        });
      }
    },
    /**
     * Tailnet Lock: approve a waiting machine. The waiting list updates by
     * itself once the next status no longer lists it.
     */
    lockSign: async (meshId: string, nodeKey: string): Promise<MeshLockSignResult> => {
      const current = meshBridge();
      if (!current) return { ok: false, error: "Meshes need the desktop app." };
      try {
        return await current.lockSign({ meshId, nodeKey });
      } catch (cause) {
        return { ok: false, error: cause instanceof Error ? cause.message : String(cause) };
      }
    },
    /**
     * Restart the mesh client and reconnect: a fresh node gets a fresh map
     * from the coordination server. Resolves with an error message, if any.
     */
    restart: async (): Promise<string | undefined> => {
      const current = meshBridge();
      if (!current) return "Meshes need the desktop app.";
      try {
        store.accept(await current.restart());
        return undefined;
      } catch (cause) {
        return cause instanceof Error ? cause.message : String(cause);
      }
    },
    /**
     * Tailnet Lock: make this computer the mesh's key authority. The result
     * carries the disablement secret — show it once, never keep it.
     */
    lockInit: async (meshId: string, trustedKeys: string[]): Promise<MeshLockInitResult> => {
      const current = meshBridge();
      if (!current) return { ok: false, error: "Meshes need the desktop app." };
      try {
        return await current.lockInit({ meshId, trustedKeys });
      } catch (cause) {
        return { ok: false, error: cause instanceof Error ? cause.message : String(cause) };
      }
    },
  };
};
