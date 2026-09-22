import type { FaktsEndpoint } from "@/lib/arkitekt/fakts/endpointSchema";
import type { GrantHint } from "@/lib/arkitekt/fakts/grantHint";
import type { GrantedMesh } from "@/lib/arkitekt/fakts/meshGrant";
import {
  normalizeBaseUrl,
  type ProfileMesh,
  type StoredProfileBook,
} from "@/lib/arkitekt/fakts/profileStorageSchema";
import { isValidControlUrl, type MeshConfig } from "../../../../main/mesh/protocol";
import { meshBridge } from "./bridge";

/**
 * A mesh belongs to a profile — organisation and hub — and this is how one
 * gets there, and the only way:
 *
 *  - a login to a deployment whose `.well-known/fakts` names a mesh asks lok
 *    for a one-shot key (`flow.tsx`), unless the profile being re-approved has
 *    its mesh switched off;
 *  - if the approver allows it, the key comes back with the tokens, the
 *    window claims the mesh with it at once (`claimProfileMesh`), and the
 *    profile record keeps the mesh — never the key;
 *  - from then on every window in that profile claims it (`MeshSync`), and
 *    the node's own state under `<userData>/mesh/<id>` carries the login.
 *
 * Nothing here ever opens a sign-in page, and no failure here may turn a
 * successful login into an error.
 */

/** The stored profile a grant is re-approving, when the hint says which. */
export const hintedProfileMesh = (
  book: StoredProfileBook,
  endpoint: FaktsEndpoint,
  hint: GrantHint | undefined,
): ProfileMesh | undefined => {
  if (!hint?.sub && !hint?.hub) return undefined;
  const baseUrl = normalizeBaseUrl(endpoint.base_url);
  const matches = Object.values(book.profiles).filter(
    (profile) =>
      normalizeBaseUrl(profile.identity.baseUrl) === baseUrl &&
      (!hint.sub || profile.identity.userId === hint.sub) &&
      (!hint.hub || profile.identity.hubId === hint.hub),
  );
  // Two rows the hint cannot tell apart: guessing would hand one's node to the other.
  return matches.length === 1 ? matches[0].mesh : undefined;
};

/**
 * The mesh a fresh grant puts on its profile: only when lok minted a key, so
 * the node is about to join with it. A re-approved profile's mesh keeps its
 * id (the key then re-authenticates the same node), its pins and its switch.
 */
export const meshFromGrant = (
  endpoint: FaktsEndpoint,
  granted: GrantedMesh | undefined,
  previous: ProfileMesh | undefined,
): ProfileMesh | undefined => {
  if (!granted?.authKey) return undefined;
  const controlUrl = granted.controlUrl ?? endpoint.mesh_coord_url ?? undefined;
  if (!controlUrl || !isValidControlUrl(controlUrl)) return undefined;
  return {
    id: previous?.id ?? newMeshId(),
    label: endpoint.name || hostOf(controlUrl),
    controlUrl,
    hosts: previous?.hosts ?? [],
    enabled: previous?.enabled ?? true,
  };
};

/** What main is told for a profile's mesh: nothing when absent or switched off. */
export const meshClaimFor = (mesh: ProfileMesh | undefined): MeshConfig | null =>
  mesh?.enabled ? { id: mesh.id, label: mesh.label, controlUrl: mesh.controlUrl, hosts: mesh.hosts } : null;

/** Claim this window's profile mesh; `authKey` is used once and forgotten. Best-effort. */
export const claimProfileMesh = async (mesh: ProfileMesh | undefined, authKey?: string): Promise<void> => {
  const bridge = meshBridge();
  if (!bridge) return;
  try {
    await bridge.claim({ mesh: meshClaimFor(mesh), authKey: authKey || undefined });
  } catch (error) {
    console.warn("[mesh] could not claim this profile's mesh:", error);
  }
};

const newMeshId = (): string => crypto.randomUUID();

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};
