import type { ActiveFakts } from "@/core/connection/arkitekt/fakts/faktsSchema";
import type { ProfileMesh } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { meshHosts } from "@/core/connection/arkitekt/controller/route";

/**
 * Does this hub need the mesh at all?
 *
 * Only if one of its addresses lives on it. Otherwise starting a node on
 * every launch, in every window, buys nothing: every service is reached
 * directly anyway. The answer is read from the hub's own fakts, so the moment
 * a refresh brings an address on the mesh, the mesh starts by itself.
 *
 * What "lives on it" means is decided in one place, `controller/route.ts`
 * (`onMesh`): pinned, said so by lok (`reach`), or a name main routes there.
 */

/** The hub's addresses that go through this mesh, deduplicated, in fakts order. */
export const meshAliases = (fakts: ActiveFakts | undefined, mesh: ProfileMesh | undefined): string[] =>
  meshHosts(fakts, mesh);

export const meshNeeded = (fakts: ActiveFakts | undefined, mesh: ProfileMesh | undefined): boolean =>
  meshAliases(fakts, mesh).length > 0;
