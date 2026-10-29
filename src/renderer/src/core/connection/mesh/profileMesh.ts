import type { FaktsEndpoint } from "@/core/connection/arkitekt/fakts/endpointSchema";
import type { GrantHint } from "@/core/connection/arkitekt/fakts/grantHint";
import type { GrantedMesh } from "@/core/connection/arkitekt/fakts/meshGrant";
import {
  normalizeBaseUrl,
  type ProfileMesh,
  type StoredProfileBook,
} from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { isValidControlUrl, type MeshConfig } from "../../../../../main/mesh/protocol";
import { meshAvailable, meshBridge } from "./bridge";
import { meshFirewallGate } from "./firewallNotice";
import { meshStatusStore } from "./meshStatusStore";

/**
 * A mesh belongs to a profile — organisation and hub — and this is how one
 * gets there, and the only way:
 *
 *  - a login to a deployment whose `.well-known/fakts` names a mesh asks lok
 *    for a one-shot key (`flow.tsx`), unless the profile being re-approved has
 *    its mesh switched off;
 *  - if the approver allows it, the key comes back with the tokens and goes
 *    straight to main (`joinMesh`), which holds it until the node is in and
 *    keeps the node up meanwhile; the profile record keeps the mesh — never
 *    the key;
 *  - from then on every window in that profile claims it when it is needed
 *    (`MeshSync`, the one claimer), and the node's own state under
 *    `<userData>/mesh/<id>` carries the login. A node that lost it gets a
 *    fresh key from lok the same way (`useMeshKeyRenewal`).
 *
 * Nothing here ever opens a sign-in page, and no failure here may turn a
 * successful login into an error.
 */

/**
 * The mesh of the stored profile a grant is re-approving — decided BEFORE the
 * grant, because whether to ask for a key at all depends on its switch.
 *
 * With a hint, the profile it names. Without one (the "add a login" paths
 * pass none), the one profile on that deployment that has a mesh, if there is
 * exactly one. Once the grant has named its identity, `meshForIdentity` is
 * the better answer and wins.
 */
export const hintedProfileMesh = (
  book: StoredProfileBook,
  endpoint: FaktsEndpoint,
  hint: GrantHint | undefined,
): ProfileMesh | undefined => {
  const baseUrl = normalizeBaseUrl(endpoint.base_url);
  const hinted = !!(hint?.sub || hint?.hub);
  const matches = Object.values(book.profiles).filter(
    (profile) =>
      normalizeBaseUrl(profile.identity.baseUrl) === baseUrl &&
      (hinted
        ? (!hint?.sub || profile.identity.userId === hint.sub) &&
          (!hint?.hub || profile.identity.hubId === hint.hub)
        : !!profile.mesh),
  );
  // Two rows we cannot tell apart: guessing would hand one's node to the other.
  return matches.length === 1 ? matches[0].mesh : undefined;
};

/** The mesh of the profile a grant's identity names exactly — its final id. */
export const meshForIdentity = (book: StoredProfileBook, profileId: string | undefined): ProfileMesh | undefined =>
  profileId ? book.profiles[profileId]?.mesh : undefined;

/**
 * The mesh a grant re-authenticates. Once the grant has named its identity,
 * only that profile's: the hint matches user and hub, not organisation, so the
 * hinted profile can be the same user in another organisation — another mesh,
 * whose node (and its state on disk) must not be handed to this one.
 */
export const previousMeshForGrant = (
  book: StoredProfileBook,
  profileId: string | undefined,
  hinted: ProfileMesh | undefined,
): ProfileMesh | undefined => (profileId ? meshForIdentity(book, profileId) : hinted);

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

/**
 * Whether a grant asks lok for a mesh key: the deployment names a mesh, this
 * build has the mesh client, and the profile being re-approved has not
 * switched its mesh off.
 */
export const asksForMeshKey = (endpoint: FaktsEndpoint, requestMeshKey = true): boolean =>
  !!endpoint.mesh_coord_url && requestMeshKey && meshAvailable();

/**
 * The mesh a grant hands to the profile row. With a key, the joining mesh
 * (`meshFromGrant`). Without one although a key was asked for, the row's mesh
 * marked `keyMissingAt`: its node cannot get in until lok mints a key, and
 * telling the user to sign in once more would not change that. Otherwise
 * nothing, which leaves the row alone.
 */
export const meshAfterGrant = (
  endpoint: FaktsEndpoint,
  granted: GrantedMesh | undefined,
  previous: ProfileMesh | undefined,
  { asked, now = Date.now() }: { asked: boolean; now?: number },
): ProfileMesh | undefined => {
  if (granted?.authKey) return meshFromGrant(endpoint, granted, previous);
  return asked && previous ? { ...previous, keyMissingAt: now } : undefined;
};

/** What main is told for a profile's mesh: nothing when absent or switched off. */
export const meshClaimFor = (mesh: ProfileMesh | undefined): MeshConfig | null =>
  mesh?.enabled ? { id: mesh.id, label: mesh.label, controlUrl: mesh.controlUrl, hosts: mesh.hosts } : null;

/**
 * Tell main which mesh this window needs: desired state, nothing else. Only
 * `MeshSync` calls this — one claimer per window. Best-effort.
 */
export const claimProfileMesh = async (mesh: ProfileMesh | undefined): Promise<void> => {
  const bridge = meshBridge();
  if (!bridge) return;
  // Starting meshd is when Windows asks about incoming connections.
  const firewall = meshFirewallGate(!!meshClaimFor(mesh));
  if (firewall) await firewall;
  try {
    meshStatusStore().accept(await bridge.claim({ mesh: meshClaimFor(mesh) }));
  } catch (error) {
    console.warn("[mesh] could not claim this profile's mesh:", error);
  }
};

/* ──────────────────────────── on demand ───────────────────────────────── */

/**
 * Who needs which mesh running right now. The mesh is not started because
 * the hub HAS an address on it — only when something is about to use one: a
 * service whose direct addresses all failed, a service that last answered
 * through the mesh, or `"self"` when lok itself sits behind it. Hubs with
 * working direct addresses never start it (and never get Windows' firewall
 * question).
 *
 * `MeshSync` claims a mesh while anyone demands it. A
 * service that ends up on a direct address releases its demand; one that
 * lives on the mesh keeps it, and so keeps the mesh up.
 */
const demands = new Map<string, Set<string>>();
const demandListeners = new Set<() => void>();
let demandSnapshot: ReadonlyMap<string, readonly string[]> = new Map();

const publishDemands = () => {
  demandSnapshot = new Map([...demands].filter(([, by]) => by.size > 0).map(([id, by]) => [id, [...by].sort()]));
  demandListeners.forEach((listener) => listener());
};

export const demandedMeshes = {
  subscribe: (listener: () => void) => {
    demandListeners.add(listener);
    return () => demandListeners.delete(listener);
  },
  getSnapshot: (): ReadonlyMap<string, readonly string[]> => demandSnapshot,
};

export const demandMesh = (meshId: string, by: string) => {
  const current = demands.get(meshId) ?? new Set<string>();
  if (current.has(by)) return;
  demands.set(meshId, current.add(by));
  publishDemands();
};

export const releaseMesh = (meshId: string, by: string) => {
  if (!demands.get(meshId)?.delete(by)) return;
  publishDemands();
};

/** A new session: whatever another profile's mesh was wanted for is moot. */
export const releaseOtherMeshes = (keep: string | undefined) => {
  let changed = false;
  for (const id of [...demands.keys()]) {
    if (id === keep) continue;
    demands.delete(id);
    changed = true;
  }
  if (changed) publishDemands();
};

/** Tests only. */
export const resetMeshDemands = () => {
  demands.clear();
  publishDemands();
};

/* ─────────────────────────────── join ─────────────────────────────────── */

/**
 * Hand main a one-shot key for a profile's mesh node: from a grant, or a
 * fresh one lok minted (`renewMeshKey`). Main holds it until the node is in,
 * keeps the node up while it joins whether or not a window claims it, and
 * parks it afterwards unless one does ("join once, then park": a hub with no
 * address on the mesh yet still registers the node, so the day it gains one
 * needs no new sign-in). Resolves once main has the key; callers own errors.
 */
export const joinMesh = async (mesh: ProfileMesh, authKey: string): Promise<void> => {
  const bridge = meshBridge();
  const config = meshClaimFor(mesh);
  if (!bridge || !config) return;
  // Starting meshd is when Windows asks about incoming connections.
  const firewall = meshFirewallGate(true);
  if (firewall) await firewall;
  meshStatusStore().accept(await bridge.join({ mesh: config, authKey }));
};

const newMeshId = (): string => crypto.randomUUID();

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};
