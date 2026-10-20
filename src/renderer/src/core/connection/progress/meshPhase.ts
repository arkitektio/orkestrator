import type { ProfileMesh } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";
import type { MeshProgress } from "./store";

/**
 * The active profile's mesh, as the progress surfaces tell it: main's
 * sidecar and node states plus the renderer's own firewall explainer.
 * `undefined` when there is nothing to say — no mesh, switched off, or
 * neither running nor asked for.
 */
export const meshProgressFor = ({
  mesh,
  payload,
  askingFirewall,
  demandedBy,
}: {
  mesh: ProfileMesh | undefined;
  payload: MeshStatusPayload | undefined;
  askingFirewall: boolean;
  demandedBy: string[];
}): Omit<MeshProgress, "since"> | undefined => {
  if (!mesh?.enabled) return undefined;
  const base = { meshId: mesh.id, label: mesh.label, demandedBy };
  const wanted = demandedBy.length > 0;

  if (askingFirewall) return { ...base, phase: "firewall" };

  const sidecar = payload?.sidecar;
  if (sidecar?.state === "unavailable") return { ...base, phase: "unavailable", detail: sidecar.detail };
  if (sidecar?.state === "crashed") return { ...base, phase: "failed", detail: sidecar.detail };

  const status = payload?.meshes.find((snapshot) => snapshot.config.id === mesh.id)?.status;
  switch (status?.state) {
    case undefined:
    case "stopped":
      if (!wanted) return undefined;
      return { ...base, phase: sidecar?.state === "starting" ? "starting-client" : "idle" };
    case "starting":
      return { ...base, phase: sidecar?.state === "ready" ? "joining" : "starting-client" };
    case "running":
      return { ...base, phase: "running" };
    case "needs-login":
      return { ...base, phase: "needs-login" };
    case "needs-machine-auth":
      return { ...base, phase: "needs-machine-auth" };
    case "error":
      return { ...base, phase: "failed", detail: status.error };
  }
};
