import { Arkitekt } from "@/core/connection/arkitekt/host";
import { claimProfileMesh, demandedMeshes, joiningMeshes, meshClaimFor } from "@/core/connection/mesh/profileMesh";
import { useEffect, useSyncExternalStore } from "react";
import { MeshProgressSync } from "./MeshProgressSync";

/**
 * Tells main which organisation mesh this window needs: the one on its active
 * profile — if it is switched on AND something demands it right now (a
 * service check that reached its mesh addresses, a service living on the
 * mesh, lok behind it: `demandMesh`), or while it is joining once to
 * register the node (`joinAndPark`). Main runs the union of every window's
 * claim, so switching profile here swaps the mesh and a mesh stays up while
 * any window still needs it.
 *
 * Mounted outside every service guard on purpose: the services themselves may
 * sit behind the mesh. This is the window's one claimer; the provider only
 * demands and WATCHES the node (`mesh/meshGate.ts`). It also keeps the
 * progress store's mesh slot current (`MeshProgressSync`).
 */
export const MeshSync = () => {
  const profile = Arkitekt.useActiveProfile();
  const mesh = profile?.mesh;
  const joining = useSyncExternalStore(joiningMeshes.subscribe, joiningMeshes.getSnapshot);
  const demanded = useSyncExternalStore(demandedMeshes.subscribe, demandedMeshes.getSnapshot);
  const demandedBy = mesh ? [...(demanded.get(mesh.id) ?? []), ...(joining.has(mesh.id) ? ["join"] : [])] : [];
  const wanted = !!mesh && demandedBy.length > 0;
  // Re-claim only when what main would be told changes, not on every book write.
  const claim = JSON.stringify(meshClaimFor(wanted ? mesh : undefined));

  useEffect(() => {
    void claimProfileMesh(wanted ? mesh : undefined);
    // `claim` is the identity of `mesh` for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim]);

  return <MeshProgressSync mesh={mesh} demandedBy={demandedBy} />;
};

export default MeshSync;
