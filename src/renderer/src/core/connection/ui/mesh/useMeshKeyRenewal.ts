import { useEffect, useState } from "react";
import { Arkitekt } from "@/core/connection/arkitekt/host";
import type { ProfileMesh } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { freshPacing, paceAfter, type MeshKeyPacing } from "@/core/connection/mesh/meshKey";
import { useMeshes } from "@/core/connection/mesh/useMeshes";

/**
 * A node this window needs that is not logged in gets a fresh key from lok
 * (`renewMeshKey`), instead of the user being told to sign in again.
 *
 * Asked only while the node reads `needs-login`, the window wants the mesh,
 * and main is not joining it with a key already (`joining` on the snapshot):
 * a newer key deletes the older one, so asking mid-join would break the join.
 * One window asks at a time (a Web Lock per mesh); the rest find the node
 * starting. Pacing
 * (`paceAfter`) spaces the asks, stops at a refusal only a sign-in or an
 * administrator can lift, and is forgotten once the node runs.
 */

/** Per mesh and refresh chain, for the life of the window. */
const pacing = new Map<string, MeshKeyPacing>();

/** Main hides a joining node's passing NeedsLogin; this only spaces a first ask from a fresh status. */
export const MESH_KEY_FIRST_DELAY_MS = 5_000;
/** Another window holds the lock: look again after this. */
const LOCK_BUSY_MS = 30_000;

type LockManagerLike = {
  request: <R>(name: string, options: { ifAvailable: boolean }, callback: (lock: unknown) => Promise<R>) => Promise<R>;
};

/** Runs `fn` unless another window is already asking; false when it did not run. */
const whileNobodyElseAsks = async (meshId: string, fn: () => Promise<void>): Promise<boolean> => {
  const locks = (typeof navigator === "undefined" ? undefined : (navigator as unknown as { locks?: LockManagerLike }).locks);
  if (!locks || typeof locks.request !== "function") {
    await fn();
    return true;
  }
  return locks.request(`arkitekt:meshkey:${meshId}`, { ifAvailable: true }, async (lock) => {
    if (!lock) return false;
    await fn();
    return true;
  });
};

/** Tests only. */
export const resetMeshKeyPacing = () => pacing.clear();

export const useMeshKeyRenewal = (profileId: string | undefined, mesh: ProfileMesh | undefined, wanted: boolean) => {
  const renew = Arkitekt.useRenewMeshKey();
  const chain = Arkitekt.useActiveProfile()?.session.token.client_id ?? "";
  const { meshes } = useMeshes();
  const [tick, setTick] = useState(0);

  const meshId = mesh?.enabled ? mesh.id : undefined;
  const snapshot = meshId ? meshes.find((candidate) => candidate.config.id === meshId) : undefined;
  const state = snapshot?.status.state;
  const key = meshId ? `${meshId}:${chain}` : undefined;
  const eligible = !!key && !!profileId && wanted && state === "needs-login" && !snapshot?.joining;

  useEffect(() => {
    if (key && state === "running") pacing.delete(key);
  }, [key, state]);

  useEffect(() => {
    if (!eligible || !key || !meshId || !profileId) return;
    if (!pacing.has(key)) pacing.set(key, { ...freshPacing(), notBefore: Date.now() + MESH_KEY_FIRST_DELAY_MS });
    const current = pacing.get(key)!;
    if (current.stopped) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void whileNobodyElseAsks(meshId, async () => {
        if (cancelled) return;
        const outcome = await renew(profileId);
        pacing.set(key, paceAfter(pacing.get(key) ?? freshPacing(), outcome, Date.now()));
        if (outcome.kind !== "key") console.warn(`[mesh] no fresh key for ${meshId}:`, outcome);
      })
        .then((ran) => {
          if (!ran) pacing.set(key, { ...(pacing.get(key) ?? freshPacing()), notBefore: Date.now() + LOCK_BUSY_MS });
        })
        .finally(() => {
          if (!cancelled) setTick((n) => n + 1);
        });
    }, Math.max(0, current.notBefore - Date.now()));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eligible, key, meshId, profileId, renew, tick]);
};
