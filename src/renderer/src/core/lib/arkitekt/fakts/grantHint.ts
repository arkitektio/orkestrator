import type { StoredProfile } from "./profileStorageSchema";

/**
 * Who the app is asking the human to approve as.
 *
 * A grant opens the deployment's configure page in the user's real browser,
 * where they may be signed into several accounts across several hubs — and the
 * page cannot read our mind. Re-approving an expired session is the case that
 * hurts: the user knows which account they were in, the page does not, and
 * picking the wrong one produces a second profile for the same person and a
 * fresh round of confusion.
 *
 * So when we already know whose session we are reviving, we say so:
 * `…/configure/<code>?hub=<hub id>&sub=<user id>`. It is a HINT, carried in the
 * URL for the page to preselect — never a claim of identity. The token that
 * comes back says who was actually approved, and `setProfileIdentity` re-keys
 * the profile from that answer, so a user who deliberately picks a different
 * account gets exactly what they picked.
 */
export type GrantHint = {
  /** lok hub id, `sub`'s counterpart — which workspace on the deployment. */
  hub?: string | null;
  /** lok user id, in the OIDC sense of `sub`: which account. */
  sub?: string | null;
};

/** The hint a known profile carries. Empty is fine — both parts are optional. */
export const grantHintForProfile = (profile: StoredProfile): GrantHint => ({
  // `hubId` is nullish until lok's `mycontext` answers with a hub (see
  // `ProfileIdentitySchema`), so this is `undefined` on every profile written
  // before that ships and the URL simply carries `sub` alone.
  hub: profile.identity.hubId ?? null,
  sub: profile.identity.userId ?? null,
});

export const hasGrantHint = (hint?: GrantHint): boolean =>
  Boolean(hint?.hub || hint?.sub);

/**
 * The verification URL with the hint attached.
 *
 * Only ADDS parameters, and only ones the server did not already set: the
 * server owns this URL (it carries the user code), and a deployment that has
 * started answering with its own `hub`/`sub` knows better than we do. An
 * unparseable URL is handed back untouched rather than dropped — a grant with
 * no hint still works, a grant with no URL does not.
 */
export const withGrantHint = (uri: string, hint?: GrantHint): string => {
  if (!hasGrantHint(hint)) return uri;

  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return uri;
  }

  if (hint?.hub && !url.searchParams.has("hub")) {
    url.searchParams.set("hub", hint.hub);
  }
  if (hint?.sub && !url.searchParams.has("sub")) {
    url.searchParams.set("sub", hint.sub);
  }

  return url.toString();
};
