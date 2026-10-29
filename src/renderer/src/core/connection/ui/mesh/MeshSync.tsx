import { Arkitekt } from "@/core/connection/arkitekt/host";
import { claimProfileMesh, demandedMeshes, meshClaimFor } from "@/core/connection/mesh/profileMesh";
import { useMeshes } from "@/core/connection/mesh/useMeshes";
import { useEffect, useSyncExternalStore } from "react";
import { MeshProgressSync } from "./MeshProgressSync";
import { useMeshKeyRenewal } from "./useMeshKeyRenewal";

/**
 * Tells main which organisation mesh this window needs: the one on its active
 * profile — if it is switched on AND something demands it right now (a
 * service check that reached its mesh addresses, a service living on the
 * mesh, lok behind it: `demandMesh`). Main runs the union of every window's
 * claim, so switching profile here swaps the mesh and a mesh stays up while
 * any window still needs it.
 *
 * A join needs no claim: main keeps a node it holds a key for up by itself
 * until the key landed (`joinMesh`), and `joining` on the snapshot says so —
 * here only so the progress strip shows it.
 *
 * Mounted outside every service guard on purpose: the services themselves may
 * sit behind the mesh. This is the window's one claimer; the provider only
 * demands and WATCHES the node (`mesh/meshGate.ts`). It also keeps the
 * progress store's mesh slot current (`MeshProgressSync`), and gets a node
 * that is not logged in a fresh key (`useMeshKeyRenewal`).
 */
export const MeshSync = () => {
  const profile = Arkitekt.useActiveProfile();
  const mesh = profile?.mesh;
  const demanded = useSyncExternalStore(demandedMeshes.subscribe, demandedMeshes.getSnapshot);
  const { meshes } = useMeshes();
  const demandedByServices = mesh ? (demanded.get(mesh.id) ?? []) : [];
  const joining = !!mesh && meshes.some((snapshot) => snapshot.config.id === mesh.id && snapshot.joining);
  const wanted = !!mesh && demandedByServices.length > 0;
  // Re-claim only when what main would be told changes, not on every book write.
  const claim = JSON.stringify(meshClaimFor(wanted ? mesh : undefined));

  // A node that is wanted but not logged in asks lok for a fresh key itself.
  useMeshKeyRenewal(profile?.id, mesh, wanted);

  useEffect(() => {
    void claimProfileMesh(wanted ? mesh : undefined);
    // `claim` is the identity of `mesh` for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim]);

  return <MeshProgressSync mesh={mesh} demandedBy={[...demandedByServices, ...(joining ? ["join"] : [])]} />;
};

export default MeshSync;
