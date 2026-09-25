import type { FaktsEndpoint } from "@/core/connection/arkitekt/fakts/endpointSchema";
import type { GrantHint } from "@/core/connection/arkitekt/fakts/grantHint";
import type { GrantedMesh } from "@/core/connection/arkitekt/fakts/meshGrant";
import {
  normalizeBaseUrl,
  type ProfileMesh,
  type StoredProfileBook,
} from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { isValidControlUrl, type MeshConfig } from "../../../../../main/mesh/protocol";
import { meshBridge } from "./bridge";
import { watchMesh, type GateOutcome } from "./meshGate";

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

/* ─────────────────────── join once, then park ─────────────────────────── */

/**
 * Meshes this window is joining right now only to register the node. The
 * grant's key is one-shot: a hub with no address on the mesh does not need it
 * running, but skipping the join would cost a new sign-in the day it gains
 * one. So the node joins (its identity lands on disk), and is then stopped.
 *
 * `MeshSync` is the window's one claimer and must keep claiming a mesh while
 * it joins — otherwise its "not needed" claim of `null`, landing straight
 * after the grant is admitted, would stop the node before it got in.
 */
const joining = new Set<string>();
const joiningListeners = new Set<() => void>();
let joiningSnapshot: ReadonlySet<string> = new Set();

const publishJoining = () => {
  joiningSnapshot = new Set(joining);
  joiningListeners.forEach((listener) => listener());
};

export const joiningMeshes = {
  subscribe: (listener: () => void) => {
    joiningListeners.add(listener);
    return () => joiningListeners.delete(listener);
  },
  getSnapshot: (): ReadonlySet<string> => joiningSnapshot,
};

export const JOIN_AND_PARK_TIMEOUT_MS = 30_000;

/** Join with the one-shot key, then let the node go once it ran (or gave up). */
export const joinAndPark = async (
  mesh: ProfileMesh,
  authKey: string,
  { timeoutMs = JOIN_AND_PARK_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<GateOutcome> => {
  if (!meshBridge() || !mesh.enabled) return "none";
  joining.add(mesh.id);
  publishJoining();
  const gate = watchMesh(mesh, { timeoutMs });
  try {
    await claimProfileMesh(mesh, authKey);
    return await gate.ready;
  } finally {
    gate.dispose();
    joining.delete(mesh.id);
    publishJoining();
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
