import { Arkitekt } from "@/core/connection/arkitekt/host";
import { meshNeeded } from "@/core/connection/mesh/meshNeed";
import { claimProfileMesh, joiningMeshes, meshClaimFor } from "@/core/connection/mesh/profileMesh";
import { useEffect, useSyncExternalStore } from "react";

/**
 * Tells main which organisation mesh this window needs: the one on its active
 * profile — if it is switched on AND the hub actually has an address on it
 * (`meshNeeded`), or while it is joining once to register the node
 * (`joinAndPark`). Main runs the union of every window's claim, so switching
 * profile here swaps the mesh, a mesh stays up while any window still needs
 * it, and a hub whose fakts gain an address on the mesh starts it by itself.
 *
 * Mounted outside every service guard on purpose: the services themselves may
 * sit behind the mesh. This is the window's one claimer; the provider only
 * WATCHES the node (`lib/mesh/meshGate.ts`) and holds the checks of
 * mesh-routed services until it runs. Renders nothing.
 */
export const MeshSync = () => {
  const profile = Arkitekt.useActiveProfile();
  const mesh = profile?.mesh;
  const joining = useSyncExternalStore(joiningMeshes.subscribe, joiningMeshes.getSnapshot);
  const wanted = !!mesh && (meshNeeded(profile?.session.fakts, mesh) || joining.has(mesh.id));
  // Re-claim only when what main would be told changes, not on every book write.
  const claim = JSON.stringify(meshClaimFor(wanted ? mesh : undefined));

  useEffect(() => {
    void claimProfileMesh(wanted ? mesh : undefined);
    // `claim` is the identity of `mesh` for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim]);

  return null;
};

export default MeshSync;
