import { Arkitekt } from "@/app/Arkitekt";
import { claimProfileMesh, meshClaimFor } from "@/lib/mesh/profileMesh";
import { useEffect } from "react";

/**
 * Tells main which organisation mesh this window needs: the one on its active
 * profile, if that has one and it is switched on. Main runs the union of every
 * window's claim, so switching profile here swaps the mesh, and a mesh stays
 * up while any window is still in its profile.
 *
 * Mounted outside every service guard on purpose: the services themselves may
 * sit behind the mesh, so it has to be up before they are checked. Renders
 * nothing.
 */
export const MeshSync = () => {
  const mesh = Arkitekt.useActiveProfile()?.mesh;
  // Re-claim only when what main would be told changes, not on every book write.
  const claim = JSON.stringify(meshClaimFor(mesh));

  useEffect(() => {
    void claimProfileMesh(mesh);
    // `claim` is the identity of `mesh` for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim]);

  return null;
};

export default MeshSync;
