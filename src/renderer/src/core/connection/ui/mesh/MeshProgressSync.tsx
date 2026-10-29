import type { ProfileMesh } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { meshFirewallAsk } from "@/core/connection/mesh/firewallNotice";
import { useMeshes } from "@/core/connection/mesh/useMeshes";
import { meshProgressFor } from "@/core/connection/progress/meshPhase";
import { setMeshProgress } from "@/core/connection/progress/store";
import { useEffect, useSyncExternalStore } from "react";

/**
 * Keeps the progress store's mesh slot in step with main's mesh events and
 * the firewall explainer. Narration only: it claims nothing. Renders nothing.
 */
export const MeshProgressSync = ({ mesh, demandedBy }: { mesh: ProfileMesh | undefined; demandedBy: string[] }) => {
  const { payload } = useMeshes();
  const askingFirewall = useSyncExternalStore(meshFirewallAsk.subscribe, meshFirewallAsk.getSnapshot);
  const progress = meshProgressFor({ mesh, payload, askingFirewall, demandedBy });
  const key = JSON.stringify(progress ?? null);

  useEffect(() => {
    setMeshProgress(progress && { ...progress, since: Date.now() });
    // `key` is the identity of `progress`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => () => setMeshProgress(undefined), []);

  return null;
};

export default MeshProgressSync;
