import { normalizeBaseUrl } from "@/core/connection/arkitekt/fakts/profileStorageSchema";

/**
 * Where a shared link's object lives.
 *
 * A smart model is not globally named: `@mikro/image:5` means one thing inside
 * one ServiceInstance, reached through one hub, in one organization, on one
 * coord server — and something else entirely on the next deployment. A link
 * that carries only `/mikro/images/5` therefore does not fail on the wrong
 * server, it quietly opens the wrong object. This is what a link carries so the
 * receiving app can refuse to guess.
 *
 * Deliberately NOT the user: a colleague opening the link has a different
 * `userId` on the same server and organization, so including it would make
 * every shared link a mismatch. That is why this is not `buildScopeKey`, whose
 * `baseUrl::userId::orgId` is right for scoping *local* storage and wrong for
 * scoping a link.
 */
export type ShareScope = {
  /** `endpoint.base_url`, normalized — the coord server. */
  baseUrl: string;
  /** lok organization id; null on deployments with no organization concept. */
  org: string | null;
  /**
   * lok hub id, from `mycontext.hub` by way of the profile's identity.
   *
   * Null rather than absent in three ordinary cases: a client bound to no hub,
   * a profile stored before lok answered with one and not yet resynced, and a
   * link copied before this shipped. `matchScope` therefore reads a missing hub
   * on either side as "cannot tell" instead of "different" — a link that
   * predates the field must not start prompting for a pointless switch.
   */
  hub: string | null;
};

/** The interstitial route a scoped link points at. */
export const SHARE_GATE_PATH = "/open";

const normalizeScope = (scope: ShareScope): ShareScope => ({
  baseUrl: normalizeBaseUrl(scope.baseUrl),
  org: scope.org ?? null,
  hub: scope.hub ?? null,
});

/**
 * The app-relative gate location for a scoped link.
 *
 * The target path is one encoded parameter rather than a path suffix, so the
 * page's own query (`?sidebar=false`) cannot collide with the scope's, and so
 * the whole thing survives being nested inside `?orkestrator=` as one opaque
 * value.
 */
export const encodeShareScope = (scope: ShareScope, path: string): string => {
  const { baseUrl, org, hub } = normalizeScope(scope);
  const params = new URLSearchParams();
  params.set("to", baseUrl);
  if (org) params.set("org", org);
  if (hub) params.set("hub", hub);
  params.set("path", path);
  return `${SHARE_GATE_PATH}?${params.toString()}`;
};

/** The same, with the scope reduced to a digest that names no host. */
export const encodeOpaqueScope = (digest: string, path: string): string => {
  const params = new URLSearchParams();
  params.set("s", digest);
  params.set("path", path);
  return `${SHARE_GATE_PATH}?${params.toString()}`;
};

/**
 * What a gate link asks for: a scope to be on, and a path to land on.
 *
 * `scope` is null for the opaque form, where the scope survives only as a
 * digest — enough to recognise a profile we already hold, never enough to
 * describe one we do not.
 */
export type ShareRequest = {
  scope: ShareScope | null;
  digest: string | null;
  path: string;
};

export const decodeShareRequest = (search: string): ShareRequest | null => {
  const params = new URLSearchParams(search);
  const path = params.get("path");
  if (!path) return null;

  const digest = params.get("s");
  if (digest) return { scope: null, digest, path };

  const baseUrl = params.get("to");
  if (!baseUrl) return null;

  return {
    scope: normalizeScope({
      baseUrl,
      org: params.get("org"),
      hub: params.get("hub"),
    }),
    digest: null,
    path,
  };
};

/**
 * The scope as one string, for hashing and for comparing.
 *
 * JSON rather than a `::`-joined key because a separator cannot express the
 * difference between a missing component and one whose value happens to look
 * like the placeholder: an organization literally named "-" must not hash to
 * the same thing as a deployment with no organization at all.
 */
export const scopeKey = (scope: ShareScope): string => {
  const { baseUrl, org, hub } = normalizeScope(scope);
  return JSON.stringify([baseUrl, org, hub]);
};

/**
 * A short, one-way name for a scope, so a link can be pasted in public.
 *
 * The readable form puts a hostname and an organization slug in the URL, which
 * is exactly what should not appear in a paper or a public issue. This is the
 * same scope with nothing legible left: it can still recognise a profile that
 * is already on this machine, which is all the gate needs, and it cannot be
 * turned back into an invitation — hence the opaque form never offers to
 * connect.
 *
 * Eight hex characters collide only against the handful of profiles stored
 * locally, never against the internet.
 */
export const scopeDigest = async (scope: ShareScope): Promise<string> => {
  const bytes = new TextEncoder().encode(scopeKey(scope));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash).slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Does the link's scope describe the connection we are on?
 *
 * Server and organization must agree. The hub is compared only when BOTH sides
 * name one: a link written before hubs existed, or a parked profile whose
 * identity predates its first `mycontext`, knows no hub, and reading that
 * silence as a mismatch would send every older link through a switch prompt it
 * does not need.
 */
export const matchScope = (link: ShareScope, active: ShareScope): boolean => {
  const a = normalizeScope(link);
  const b = normalizeScope(active);
  if (a.baseUrl !== b.baseUrl) return false;
  if (a.org !== b.org) return false;
  if (a.hub !== null && b.hub !== null && a.hub !== b.hub) return false;
  return true;
};
