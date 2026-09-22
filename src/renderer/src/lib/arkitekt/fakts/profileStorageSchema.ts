import { z } from "zod";

import { FaktsEndpointSchema } from "./endpointSchema";
import {
  clearStoredArkitektStorage,
  loadStoredArkitektSession,
  StoredArkitektSession,
  StoredArkitektSessionSchema,
} from "./sessionStorageSchema";

/**
 * Several logins, parked side by side.
 *
 * The active organization is a claim inside the access token, minted server-side
 * when a human approves the device code — there is no org parameter on any grant
 * and no `setActiveOrganization` mutation, so a token for another organization
 * can only be obtained by running the device flow again. What this module adds is
 * that it only has to be run ONCE per organization: the resulting session is kept
 * rather than overwritten, and switching afterwards is a local refresh + a
 * connection swap.
 *
 * `StoredArkitektSession` is untouched and becomes the inner payload, so
 * everything already written to validate and hydrate a session keeps working.
 * Every helper here is a pure function over the book; only `loadStoredProfileBook`
 * and `writeStoredProfileBook` touch storage.
 */

export const PROFILE_BOOK_STORAGE_KEY = "arkitektProfiles";

/**
 * What the profile is, as the SERVER sees it — never anything the client mints.
 *
 * In particular not `client_id`: dynamic registration mints a fresh one on every
 * grant, so an id derived from it would change under the user each time they
 * re-approved, and the same organization would pile up as duplicate rows.
 */
export const ProfileIdentitySchema = z.object({
  /** `endpoint.base_url` — the deployment. */
  baseUrl: z.string(),
  /** lok user id; null until the first `mycontext` answers. */
  userId: z.string().nullable(),
  /** lok organization id; null on deployments with no organization concept. */
  organizationId: z.string().nullable(),
  /**
   * lok hub id — the third thing a smart model is local to, after the
   * deployment and the organization, and part of the profile's key.
   *
   * Written from `mycontext.hub` (`ProfileIdentitySync`). Still nullish: a
   * client bound to no hub answers null, and every profile stored before the
   * field existed reads `undefined` until its next `mycontext`. `matchScope`
   * therefore goes on treating a missing hub on either side as "cannot tell".
   */
  hubId: z.string().nullish(),
});

export type ProfileIdentity = z.infer<typeof ProfileIdentitySchema>;

/**
 * Everything needed to draw a row for a profile that is NOT currently connected.
 *
 * A cache, written while the profile is active, and deliberately never refreshed
 * in the background: labelling a parked profile would mean spending its parked
 * refresh token, which rotates on use. An organization renamed while you were
 * elsewhere shows its old name until you next switch to it.
 */
export const ProfileLabelSchema = z.object({
  /** `endpoint.name`. */
  endpointName: z.string().optional(),
  /** `fakts.self.deployment_name`. */
  deploymentName: z.string().optional(),
  username: z.string().optional(),
  organizationName: z.string().optional(),
  organizationSlug: z.string().optional(),
  /** `hub.name` — what the switcher shows to tell two hubs of one org apart. */
  hubName: z.string().optional(),
  /** `hub.identifier`, the reverse-domain name; for the switch prompt's detail. */
  hubSlug: z.string().optional(),
  /**
   * Plain numbers, so a parked row can be painted offline. Avatar URLs are
   * deliberately absent: media keys resolve against the ACTIVE connection's
   * datalayer endpoint, so a URL cached for a parked profile is not resolvable
   * while another profile is active.
   */
  brandHue: z.number().nullish(),
  brandChroma: z.number().nullish(),
  refreshedAt: z.number().optional(),
});

export type ProfileLabel = z.infer<typeof ProfileLabelSchema>;

export const ProfileStatusSchema = z.enum(["ok", "stale"]);
export type ProfileStatus = z.infer<typeof ProfileStatusSchema>;

export const StoredProfileSchema = z.object({
  id: z.string(),
  session: StoredArkitektSessionSchema,
  identity: ProfileIdentitySchema,
  label: ProfileLabelSchema.default({}),
  /** `stale` = the refresh chain is known-broken; reviving it costs a re-grant. */
  status: ProfileStatusSchema.default("ok"),
  statusMessage: z.string().optional(),
  createdAt: z.number(),
  lastUsedAt: z.number(),
});

export type StoredProfile = z.infer<typeof StoredProfileSchema>;

export const StoredProfileBookSchema = z.object({
  version: z.literal(2),
  activeProfileId: z.string().nullable(),
  profiles: z.record(z.string(), StoredProfileSchema),
  /**
   * Where to point a fresh grant when nothing is active — this is what
   * `reconnect()` used to read from the standalone `endpoint` key.
   */
  lastEndpoint: FaktsEndpointSchema.nullable().default(null),
});

export type StoredProfileBook = z.infer<typeof StoredProfileBookSchema>;

/**
 * The same outer shape, but with the profile entries left unparsed.
 *
 * One corrupt profile must not sign the user out of the other four, so entries
 * are validated individually below and the bad ones dropped.
 */
const LenientProfileBookSchema = z.object({
  version: z.literal(2),
  activeProfileId: z.string().nullable(),
  profiles: z.record(z.string(), z.unknown()),
  lastEndpoint: z.unknown().optional(),
});

export const emptyProfileBook = (): StoredProfileBook => ({
  version: 2,
  activeProfileId: null,
  profiles: {},
  lastEndpoint: null,
});

// ── identity ──

export const normalizeBaseUrl = (baseUrl: string): string =>
  baseUrl.trim().replace(/\/+$/, "").toLowerCase();

/**
 * The scope key shared by the profile book and the dashboard layout store.
 *
 * `Hero.tsx` has keyed its dockview layouts by exactly this string since before
 * profiles existed; making the profile id the same value means a switch re-scopes
 * the dashboard for free.
 *
 * The HUB is a fourth component, appended only when one is known. That is not
 * cosmetic: lok lets the same user approve the same app on the same device into
 * two different hubs, and those are two separate OAuth clients with two separate
 * refresh chains. Keyed without the hub they derive the same id, `reidentifyProfile`
 * collapses them, and the first hub's refresh token is lost — still valid on the
 * server, but held by nobody. Appending only when present keeps every id written
 * before `Context.hub` existed byte-identical; a profile re-keys once, the first
 * time lok names its hub.
 */
export const buildScopeKey = (
  baseUrl: string,
  userId: string,
  orgId: string,
  hubId?: string | null,
): string =>
  `${baseUrl}::${userId}::${orgId}${hubId ? `::${hubId}` : ""}`;

export const deriveProfileId = (identity: ProfileIdentity): string =>
  buildScopeKey(
    normalizeBaseUrl(identity.baseUrl),
    identity.userId ?? "unknown",
    identity.organizationId ?? "personal",
    identity.hubId,
  );

/**
 * The id a profile carries between its grant and its first `mycontext`.
 *
 * At the moment a grant completes the user and organization ids are simply not
 * known yet — they come from lok. The random component keeps two grants
 * completed back to back from colliding; `reidentifyProfile` re-keys the entry
 * (and collapses any duplicate) as soon as the real identity arrives.
 */
export const provisionalProfileId = (baseUrl: string): string =>
  `${normalizeBaseUrl(baseUrl)}::pending::${crypto.randomUUID()}`;

export const isProvisionalProfileId = (id: string): boolean =>
  id.includes("::pending::");

// ── deriving a profile from a session ──

export const deriveProfileLabel = (session: StoredArkitektSession): ProfileLabel => ({
  endpointName: session.endpoint.name,
  deploymentName: session.fakts.self.deployment_name,
});

export const createProfileFromSession = (
  session: StoredArkitektSession,
  now: number = Date.now(),
  id: string = provisionalProfileId(session.endpoint.base_url),
): StoredProfile => ({
  id,
  session,
  identity: {
    baseUrl: session.endpoint.base_url,
    userId: null,
    organizationId: null,
  },
  label: deriveProfileLabel(session),
  status: "ok",
  createdAt: now,
  lastUsedAt: now,
});

// ── pure operations on the book ──

export const getActiveProfile = (book: StoredProfileBook): StoredProfile | null =>
  book.activeProfileId ? (book.profiles[book.activeProfileId] ?? null) : null;

export const getActiveSession = (
  book: StoredProfileBook,
): StoredArkitektSession | null => getActiveProfile(book)?.session ?? null;

/** Most recently used first — the order the switcher lists them in. */
export const listProfiles = (book: StoredProfileBook): StoredProfile[] =>
  Object.values(book.profiles).sort((a, b) => b.lastUsedAt - a.lastUsedAt);

export const upsertProfile = (
  book: StoredProfileBook,
  profile: StoredProfile,
): StoredProfileBook => ({
  ...book,
  profiles: { ...book.profiles, [profile.id]: profile },
});

export const setLastEndpoint = (
  book: StoredProfileBook,
  lastEndpoint: StoredProfileBook["lastEndpoint"],
): StoredProfileBook => ({ ...book, lastEndpoint });

export const setActiveProfile = (
  book: StoredProfileBook,
  profileId: string | null,
  now: number = Date.now(),
): StoredProfileBook => {
  if (profileId === null) {
    return { ...book, activeProfileId: null };
  }

  const profile = book.profiles[profileId];
  if (!profile) {
    return book;
  }

  return {
    ...book,
    activeProfileId: profileId,
    profiles: {
      ...book.profiles,
      [profileId]: { ...profile, lastUsedAt: now },
    },
    lastEndpoint: profile.session.endpoint,
  };
};

const patchProfile = (
  book: StoredProfileBook,
  profileId: string,
  patch: (profile: StoredProfile) => StoredProfile,
): StoredProfileBook => {
  const profile = book.profiles[profileId];
  // A write aimed at a profile that has since been removed is dropped rather
  // than resurrecting it: an in-flight token refresh can land after the user
  // removed the profile it belongs to.
  if (!profile) {
    return book;
  }

  return { ...book, profiles: { ...book.profiles, [profileId]: patch(profile) } };
};

export const updateProfileSession = (
  book: StoredProfileBook,
  profileId: string,
  session: StoredArkitektSession,
): StoredProfileBook =>
  patchProfile(book, profileId, (profile) => ({ ...profile, session }));

export const markProfileStale = (
  book: StoredProfileBook,
  profileId: string,
  statusMessage: string,
): StoredProfileBook =>
  patchProfile(book, profileId, (profile) => ({
    ...profile,
    status: "stale",
    statusMessage,
  }));

/**
 * Take the PERSISTED book as truth, keeping only this window's choice of
 * active profile.
 *
 * Several windows share one book; each has its own in-memory copy and its own
 * live profile. Every field but `activeProfileId` is owned by whoever wrote
 * last (a token rotated elsewhere is the live one). Which profile a window is
 * looking at is that window's business — a popout switching organization must
 * not yank the main window along — so `mine.activeProfileId` wins while that
 * profile still exists.
 */
export const adoptPersistedBook = (
  persisted: StoredProfileBook,
  mine: StoredProfileBook,
): StoredProfileBook => {
  const keepMine = mine.activeProfileId !== null && mine.activeProfileId in persisted.profiles;
  return {
    ...persisted,
    activeProfileId: keepMine ? mine.activeProfileId : persisted.activeProfileId,
  };
};

export const markProfileOk = (
  book: StoredProfileBook,
  profileId: string,
): StoredProfileBook =>
  patchProfile(book, profileId, (profile) => ({
    ...profile,
    status: "ok",
    statusMessage: undefined,
  }));

export const removeProfile = (
  book: StoredProfileBook,
  profileId: string,
): StoredProfileBook => {
  if (!book.profiles[profileId]) {
    return book;
  }

  const profiles = { ...book.profiles };
  delete profiles[profileId];

  // Removing the profile you are signed into drops you to logged-out rather than
  // silently signing you into a different organization: a switch is a thing the
  // user asks for, never a side effect of tidying up.
  const activeProfileId =
    book.activeProfileId === profileId ? null : book.activeProfileId;

  return { ...book, profiles, activeProfileId };
};

/**
 * Move a profile from one id to another, once its real identity is known.
 *
 * This is how a `::pending::` id becomes `baseUrl::user::org`. If the derived id
 * already exists the two are COLLAPSED — the same organization IN THE SAME HUB
 * approved twice is one profile, and the newer session wins because it carries
 * the newer refresh token, which is what keeps re-approving a login you already
 * have from appending a duplicate row. That is also what lok does server-side:
 * re-approving the same user, device, app and hub rotates that hub's client and
 * ends its old chain.
 *
 * Two DIFFERENT hubs derive different ids and must not collapse: they are two
 * registrations with two live refresh chains, and dropping one here would strand
 * a credential that the server still honours.
 *
 * Which is why collapsing is allowed for a PROVISIONAL id only — a grant that
 * has just happened, whose row holds nothing the server has not just reissued.
 * An ESTABLISHED profile being re-keyed (lok answered differently than last
 * time, e.g. with no hub on a deployment that does not fill `Context.hub`) must
 * never land on top of another established row: that is a plain switch
 * destroying the login you switched away from. It is updated in place instead,
 * keeping its id and both refresh chains.
 */
export const reidentifyProfile = (
  book: StoredProfileBook,
  currentId: string,
  identity: ProfileIdentity,
  label?: ProfileLabel,
): StoredProfileBook => {
  const profile = book.profiles[currentId];
  if (!profile) {
    return book;
  }

  // A missing hub is "not answered", never "no hub any more". Deployments that
  // do not fill `Context.hub`, and clients bound to no hub, both answer null —
  // and re-keying a profile backwards onto the hub-less id is exactly how two
  // hub rows would collide.
  const nextIdentity: ProfileIdentity = {
    ...identity,
    hubId: identity.hubId ?? profile.identity.hubId,
  };

  const nextId = deriveProfileId(nextIdentity);
  const existing = book.profiles[nextId];

  if (existing && nextId !== currentId && !isProvisionalProfileId(currentId)) {
    // Two established rows, two live refresh chains: keep both, take the new
    // labelling, and leave the id alone.
    return patchProfile(book, currentId, (current) => ({
      ...current,
      identity: nextIdentity,
      label: { ...current.label, ...label },
    }));
  }

  const merged: StoredProfile = {
    ...profile,
    id: nextId,
    identity: nextIdentity,
    label: { ...profile.label, ...label },
    // Keep the older creation date when collapsing onto an existing row, so
    // "added on" does not jump forward every time the user re-approves.
    createdAt: existing ? Math.min(existing.createdAt, profile.createdAt) : profile.createdAt,
    lastUsedAt: Math.max(existing?.lastUsedAt ?? 0, profile.lastUsedAt),
  };

  const profiles = { ...book.profiles };
  delete profiles[currentId];
  profiles[nextId] = merged;

  return {
    ...book,
    profiles,
    activeProfileId:
      book.activeProfileId === currentId ? nextId : book.activeProfileId,
  };
};

export const updateProfileLabel = (
  book: StoredProfileBook,
  profileId: string,
  label: ProfileLabel,
): StoredProfileBook =>
  patchProfile(book, profileId, (profile) => ({
    ...profile,
    label: { ...profile.label, ...label },
  }));

/** One group per deployment, each sorted most-recently-used first. */
export const groupProfilesByDeployment = (
  profiles: StoredProfile[],
): { baseUrl: string; name: string; profiles: StoredProfile[] }[] => {
  const groups = new Map<string, { baseUrl: string; name: string; profiles: StoredProfile[] }>();

  profiles.forEach((profile) => {
    const baseUrl = normalizeBaseUrl(profile.identity.baseUrl);
    const existing = groups.get(baseUrl);
    if (existing) {
      existing.profiles.push(profile);
      return;
    }

    groups.set(baseUrl, {
      baseUrl,
      name:
        profile.label.endpointName ||
        profile.label.deploymentName ||
        profile.identity.baseUrl,
      profiles: [profile],
    });
  });

  return Array.from(groups.values());
};

// ── storage ──

export function writeStoredProfileBook(
  book: StoredProfileBook,
  storage: Storage = localStorage,
): void {
  const parsed = StoredProfileBookSchema.parse(book);
  storage.setItem(PROFILE_BOOK_STORAGE_KEY, JSON.stringify(parsed));
}

/**
 * Migrate the four flat keys (`endpoint` / `fakts` / `token` / `aliasMap`) — the
 * one session this app could hold before profiles existed — into a one-entry book.
 *
 * The legacy keys are DELETED afterwards rather than kept in sync: two sources of
 * truth would mean a token refresh written to the book alone silently diverges
 * from what an older build would read back.
 */
export function migrateLegacyProfileStorage(
  storage: Storage = localStorage,
): StoredProfileBook {
  const loaded = loadStoredArkitektSession(storage);
  if (!loaded) {
    return emptyProfileBook();
  }

  const parsed = StoredArkitektSessionSchema.safeParse(loaded);
  if (!parsed.success) {
    // Same rule the provider has always applied to a session it cannot read:
    // drop it and fall back to a fresh connect. Throwing here would strand the
    // user on an error screen that survives reload, because the unreadable
    // entries would stay in storage.
    console.warn(
      "[arkitekt] Discarding unreadable legacy session during profile migration:",
      parsed.error.issues,
    );
    clearStoredArkitektStorage(undefined, storage);
    return emptyProfileBook();
  }

  const profile = createProfileFromSession(parsed.data);
  const book = setActiveProfile(
    setLastEndpoint(upsertProfile(emptyProfileBook(), profile), parsed.data.endpoint),
    profile.id,
  );

  writeStoredProfileBook(book, storage);
  clearStoredArkitektStorage(undefined, storage);

  return book;
}

/**
 * The single entry point for reading profiles. Never throws: an unreadable book
 * is a book we no longer have, and the user lands on the welcome screen rather
 * than on an error that survives reload.
 */
export function loadStoredProfileBook(
  storage: Storage = localStorage,
): StoredProfileBook {
  const raw = storage.getItem(PROFILE_BOOK_STORAGE_KEY);

  if (!raw) {
    return migrateLegacyProfileStorage(storage);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    console.warn("[arkitekt] Discarding unparseable profile book");
    storage.removeItem(PROFILE_BOOK_STORAGE_KEY);
    return emptyProfileBook();
  }

  const outer = LenientProfileBookSchema.safeParse(json);
  if (!outer.success) {
    console.warn(
      "[arkitekt] Discarding unreadable profile book:",
      outer.error.issues,
    );
    storage.removeItem(PROFILE_BOOK_STORAGE_KEY);
    return emptyProfileBook();
  }

  const profiles: Record<string, StoredProfile> = {};
  Object.entries(outer.data.profiles).forEach(([id, candidate]) => {
    const parsed = StoredProfileSchema.safeParse(candidate);
    if (!parsed.success) {
      console.warn(
        `[arkitekt] Dropping unreadable profile '${id}':`,
        parsed.error.issues,
      );
      return;
    }
    profiles[id] = parsed.data;
  });

  const lastEndpoint = FaktsEndpointSchema.safeParse(outer.data.lastEndpoint);

  const activeProfileId =
    outer.data.activeProfileId && profiles[outer.data.activeProfileId]
      ? outer.data.activeProfileId
      : null;

  return {
    version: 2,
    activeProfileId,
    profiles,
    lastEndpoint: lastEndpoint.success ? lastEndpoint.data : null,
  };
}
