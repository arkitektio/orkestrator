import { useEffect, useState } from "react";
import type { MeshLockInitResult, MeshLockSignResult, MeshPingResult, MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { meshBridge } from "./bridge";

/**
 * Live mesh state for a window: pulled once on mount, then pushed by main on
 * every change (`mesh:event`), so every window agrees. Which mesh a window
 * runs is not decided here: it follows the active profile (`MeshSync`).
 */
export const useMeshes = () => {
  const [payload, setPayload] = useState<MeshStatusPayload | undefined>();
  const [error, setError] = useState<string | undefined>();
  /** Latest ping attempt per `<meshId>::<target>`, pushed by main as they land. */
  const [pings, setPings] = useState<Record<string, MeshPingResult>>({});
  const bridge = meshBridge();

  useEffect(() => {
    if (!bridge) return;
    let live = true;
    bridge
      .status()
      .then((next) => live && setPayload(next))
      .catch((cause) => live && setError(String(cause)));
    const dispose = bridge.onEvent((event) => {
      if (event.type === "status") setPayload(event.payload);
      if (event.type === "ping") {
        setPings((current) => ({ ...current, [`${event.meshId}::${event.result.target}`]: event.result }));
      }
    });
    return () => {
      live = false;
      dispose();
    };
    // The bridge object is stable for the life of the window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    available: !!bridge,
    sidecar: payload?.sidecar ?? { state: "idle" as const },
    /** Every mesh some window claims; pick this window's out by id. */
    meshes: payload?.meshes ?? [],
    error,
    pings,
    /** Kicks off a ping; results arrive through `pings` as each attempt lands. */
    ping: async (meshId: string, target: string) => {
      const current = meshBridge();
      if (!current) return;
      const key = `${meshId}::${target}`;
      setPings((all) => ({ ...all, [key]: { target, attempt: 0, final: false, ok: false, direct: false } }));
      try {
        await current.ping({ meshId, target });
      } catch (cause) {
        setPings((all) => ({
          ...all,
          [key]: { target, attempt: 1, final: true, ok: false, direct: false, error: cause instanceof Error ? cause.message : String(cause) },
        }));
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
     * Tailnet Lock: make this computer the mesh's key authority. The result
     * carries the disablement secret — show it once, never keep it.
     */
    /**
     * Restart the mesh client and reconnect: a fresh node gets a fresh map
     * from the coordination server. Resolves with an error message, if any.
     */
    restart: async (): Promise<string | undefined> => {
      const current = meshBridge();
      if (!current) return "Meshes need the desktop app.";
      try {
        setPayload(await current.restart());
        return undefined;
      } catch (cause) {
        return cause instanceof Error ? cause.message : String(cause);
      }
    },
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
