import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  admitGrantedProfile,
  buildScopeKey,
  findProfileIdByChain,
  createProfileFromSession,
  deriveProfileId,
  emptyProfileBook,
  getActiveProfile,
  groupProfilesByDeployment,
  isProvisionalProfileId,
  listProfiles,
  loadStoredProfileBook,
  markProfileStale,
  PROFILE_BOOK_STORAGE_KEY,
  provisionalProfileId,
  reidentifyProfile,
  removeProfile,
  setActiveProfile,
  updateProfileMesh,
  updateProfileSession,
  upsertProfile,
  writeStoredProfileBook,
  type StoredProfileBook,
} from "./profileStorageSchema";

const ALIAS = { id: "a1", host: "localhost", ssl: false, challenge: "ht" };

const endpointFor = (host: string) => ({
  name: `deployment at ${host}`,
  version: "0.1.0",
  base_url: `https://${host}/lok/f/`,
  frontend_url: `https://${host}/`,
  configure: `https://${host}/configure/{code}`,
  device_authorization_endpoint: `https://${host}/lok/o/app-authorization/`,
  token_endpoint: `https://${host}/lok/o/token/`,
});

const sessionFor = (host: string, accessToken = "at") => ({
  endpoint: endpointFor(host),
  fakts: {
    instances: { lok: { service: "live.arkitekt.lok", identifier: "3", aliases: [ALIAS] } },
    self: { deployment_name: host, alias: ALIAS },
    statuses: { lok: "granted" },
  },
  token: {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: `rt-${accessToken}`,
    client_id: "cid",
    received_at: 1_700_000_000_000,
  },
  aliasMap: { aliasMap: { lok: ALIAS } },
});

/** What the four flat keys held, before profiles existed. */
const LEGACY_SESSION = sessionFor("lok.test");

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("deriveProfileId", () => {
  const identity = {
    baseUrl: "https://lok.test/lok/f/",
    userId: "u1",
    organizationId: "o1",
  };

  it("is stable across a token refresh", () => {
    // The whole point of deriving the id from server-side identity rather than
    // from `client_id`: dynamic registration mints a fresh client on every
    // grant, so a client-derived id would change under the user and the same
    // organization would pile up as duplicate rows.
    expect(deriveProfileId(identity)).toBe(deriveProfileId({ ...identity }));
  });

  it("distinguishes two organizations on one deployment", () => {
    expect(deriveProfileId(identity)).not.toBe(
      deriveProfileId({ ...identity, organizationId: "o2" }),
    );
  });

  it("distinguishes two users in one organization", () => {
    expect(deriveProfileId(identity)).not.toBe(
      deriveProfileId({ ...identity, userId: "u2" }),
    );
  });

  it("ignores trailing-slash and case differences in the base url", () => {
    expect(deriveProfileId({ ...identity, baseUrl: "https://LOK.test/lok/f/" })).toBe(
      deriveProfileId({ ...identity, baseUrl: "https://lok.test/lok/f" }),
    );
  });

  it("is the same string the dashboard scopes its layouts by", () => {
    // Hero.tsx keys dockview layouts by buildScopeKey(baseUrl, userId, orgId);
    // sharing the string is what re-scopes the dashboard on a switch for free.
    expect(deriveProfileId(identity)).toBe(
      buildScopeKey("https://lok.test/lok/f", "u1", "o1"),
    );
  });

  it("distinguishes two hubs of one organization", () => {
    // lok lets the same user approve the same app on the same device into two
    // hubs; those are two OAuth clients with two refresh chains. One id would
    // collapse them and strand a credential the server still honours.
    expect(deriveProfileId({ ...identity, hubId: "h1" })).not.toBe(
      deriveProfileId({ ...identity, hubId: "h2" }),
    );
  });

  it("leaves an id written before hubs existed unchanged", () => {
    // Appending only when a hub is known is what keeps every stored profile on
    // its current id — and its tabs — until lok first names its hub.
    expect(deriveProfileId({ ...identity, hubId: null })).toBe(deriveProfileId(identity));
    expect(deriveProfileId({ ...identity, hubId: undefined })).toBe(
      buildScopeKey("https://lok.test/lok/f", "u1", "o1"),
    );
  });

  it("falls back to 'personal' for a deployment with no organization", () => {
    expect(deriveProfileId({ ...identity, organizationId: null })).toContain("::personal");
  });
});

describe("provisionalProfileId", () => {
  it("is unique per grant and recognisable as provisional", () => {
    const a = provisionalProfileId("https://lok.test/lok/f/");
    const b = provisionalProfileId("https://lok.test/lok/f/");
    expect(a).not.toBe(b);
    expect(isProvisionalProfileId(a)).toBe(true);
    expect(isProvisionalProfileId(deriveProfileId({
      baseUrl: "https://lok.test/",
      userId: "u1",
      organizationId: "o1",
    }))).toBe(false);
  });
});

describe("loadStoredProfileBook with nothing stored", () => {
  it("returns an empty book", () => {
    expect(loadStoredProfileBook(storage)).toEqual(emptyProfileBook());
  });

  it("ignores the four flat keys builds before profiles used — no migration any more", () => {
    storage.setItem("endpoint", JSON.stringify(LEGACY_SESSION.endpoint));
    storage.setItem("token", JSON.stringify(LEGACY_SESSION.token));
    expect(loadStoredProfileBook(storage)).toEqual(emptyProfileBook());
    // Reading is a read: nothing is written or removed.
    expect(storage.getItem(PROFILE_BOOK_STORAGE_KEY)).toBeNull();
    expect(storage.getItem("token")).not.toBeNull();
  });
});

describe("loadStoredProfileBook", () => {
  const seed = (): StoredProfileBook => {
    const a = createProfileFromSession(sessionFor("alpha.test"), 1, "id-a");
    const b = createProfileFromSession(sessionFor("beta.test"), 2, "id-b");
    return setActiveProfile(
      upsertProfile(upsertProfile(emptyProfileBook(), a), b),
      "id-a",
      10,
    );
  };

  it("round-trips a book", () => {
    writeStoredProfileBook(seed(), storage);
    const loaded = loadStoredProfileBook(storage);
    expect(Object.keys(loaded.profiles).sort()).toEqual(["id-a", "id-b"]);
    expect(loaded.activeProfileId).toBe("id-a");
  });

  it("drops one corrupt profile without losing the others", () => {
    // One bad entry must not sign the user out of every other organization.
    const book = seed();
    const raw = JSON.parse(JSON.stringify(book));
    raw.profiles["id-b"].session.token = { nonsense: true };
    storage.setItem(PROFILE_BOOK_STORAGE_KEY, JSON.stringify(raw));

    const loaded = loadStoredProfileBook(storage);

    expect(Object.keys(loaded.profiles)).toEqual(["id-a"]);
    expect(loaded.activeProfileId).toBe("id-a");
  });

  it("clears activeProfileId when the active profile was the corrupt one", () => {
    const book = seed();
    const raw = JSON.parse(JSON.stringify(book));
    raw.profiles["id-a"].session.token = { nonsense: true };
    storage.setItem(PROFILE_BOOK_STORAGE_KEY, JSON.stringify(raw));

    const loaded = loadStoredProfileBook(storage);

    expect(Object.keys(loaded.profiles)).toEqual(["id-b"]);
    expect(loaded.activeProfileId).toBeNull();
  });

  it("keeps a profile's mesh, and drops an unreadable mesh without the profile", () => {
    const mesh = { id: "mesh-1", label: "Lab", controlUrl: "https://mesh.test", hosts: [], enabled: false };
    writeStoredProfileBook(updateProfileMesh(seed(), "id-a", () => mesh), storage);
    expect(loadStoredProfileBook(storage).profiles["id-a"].mesh).toEqual(mesh);

    const raw = JSON.parse(storage.getItem(PROFILE_BOOK_STORAGE_KEY)!);
    raw.profiles["id-a"].mesh = { id: "../../etc", label: 1 };
    storage.setItem(PROFILE_BOOK_STORAGE_KEY, JSON.stringify(raw));
    const loaded = loadStoredProfileBook(storage);
    expect(Object.keys(loaded.profiles).sort()).toEqual(["id-a", "id-b"]);
    expect(loaded.profiles["id-a"].mesh).toBeUndefined();
  });

  it("discards an unparseable book rather than throwing", () => {
    storage.setItem(PROFILE_BOOK_STORAGE_KEY, "{not json");
    expect(loadStoredProfileBook(storage)).toEqual(emptyProfileBook());
    expect(storage.getItem(PROFILE_BOOK_STORAGE_KEY)).toBeNull();
  });
});

describe("reidentifyProfile", () => {
  const identity = {
    baseUrl: "https://lok.test/lok/f/",
    userId: "u1",
    organizationId: "o1",
  };

  it("re-keys a provisional profile and follows activeProfileId", () => {
    const provisional = createProfileFromSession(sessionFor("lok.test"), 1, "pending-1");
    const book = setActiveProfile(
      upsertProfile(emptyProfileBook(), provisional),
      "pending-1",
      5,
    );

    const next = reidentifyProfile(book, "pending-1", identity, {
      organizationName: "Acme",
    });

    const expectedId = deriveProfileId(identity);
    expect(Object.keys(next.profiles)).toEqual([expectedId]);
    expect(next.activeProfileId).toBe(expectedId);
    expect(next.profiles[expectedId].label.organizationName).toBe("Acme");
    // The label written at grant time is merged, not replaced.
    expect(next.profiles[expectedId].label.deploymentName).toBe("lok.test");
  });

  it("collapses onto an existing profile for the same organization", () => {
    // Re-approving an organization you already have must replace that row, not
    // append a duplicate — and the newer session wins, because it carries the
    // newer refresh token.
    const existingId = deriveProfileId(identity);
    const existing = {
      ...createProfileFromSession(sessionFor("lok.test", "old"), 1, existingId),
      identity,
    };
    // A REAL provisional id: collapsing is allowed for a grant that has just
    // happened, and `isProvisionalProfileId` is how that is recognised.
    const pending = provisionalProfileId("https://lok.test/lok/f/");
    const fresh = createProfileFromSession(sessionFor("lok.test", "new"), 50, pending);
    const book = setActiveProfile(
      upsertProfile(upsertProfile(emptyProfileBook(), existing), fresh),
      pending,
      50,
    );

    const next = reidentifyProfile(book, pending, identity);

    expect(Object.keys(next.profiles)).toEqual([existingId]);
    expect(next.profiles[existingId].session.token.access_token).toBe("new");
    expect(next.activeProfileId).toBe(existingId);
    // "Added on" must not jump forward every time the user re-approves.
    expect(next.profiles[existingId].createdAt).toBe(1);
  });

  it("a re-approval keeps the row's mesh switch and pins, and takes the grant's node", () => {
    const existingId = deriveProfileId(identity);
    const existing = {
      ...createProfileFromSession(sessionFor("lok.test", "old"), 1, existingId),
      identity,
      mesh: { id: "old-node", label: "Old", controlUrl: "https://mesh.old", hosts: ["data.lab"], enabled: false },
    };
    const pending = provisionalProfileId("https://lok.test/lok/f/");
    const withMesh = {
      ...createProfileFromSession(sessionFor("lok.test", "new"), 50, pending),
      mesh: { id: "new-node", label: "New", controlUrl: "https://mesh.new", hosts: [], enabled: true },
    };
    const book = upsertProfile(upsertProfile(emptyProfileBook(), existing), withMesh);
    expect(reidentifyProfile(book, pending, identity).profiles[existingId].mesh).toEqual({
      id: "new-node",
      label: "New",
      controlUrl: "https://mesh.new",
      hosts: ["data.lab"],
      enabled: false,
    });

    // A grant that brought no key leaves the row's mesh alone.
    const bare = createProfileFromSession(sessionFor("lok.test", "new"), 50, pending);
    const kept = reidentifyProfile(upsertProfile(upsertProfile(emptyProfileBook(), existing), bare), pending, identity);
    expect(kept.profiles[existingId].mesh).toEqual(existing.mesh);
  });

  it("does NOT collapse two hubs of the same organization", () => {
    // The regression this guards: both approvals are live server-side, each
    // with its own refresh chain, so dropping one row here would leave a valid
    // credential held by nobody and that hub needing a fresh grant.
    const firstId = deriveProfileId({ ...identity, hubId: "h1" });
    const first = {
      ...createProfileFromSession(sessionFor("lok.test", "hub-1-token"), 1, firstId),
      identity: { ...identity, hubId: "h1" },
    };
    const fresh = createProfileFromSession(sessionFor("lok.test", "hub-2-token"), 50, "pending-3");
    const book = setActiveProfile(
      upsertProfile(upsertProfile(emptyProfileBook(), first), fresh),
      "pending-3",
      50,
    );

    const next = reidentifyProfile(book, "pending-3", { ...identity, hubId: "h2" });

    const secondId = deriveProfileId({ ...identity, hubId: "h2" });
    expect(Object.keys(next.profiles).sort()).toEqual([firstId, secondId].sort());
    // Each row still holds its OWN chain.
    expect(next.profiles[firstId].session.token.access_token).toBe("hub-1-token");
    expect(next.profiles[secondId].session.token.access_token).toBe("hub-2-token");
    expect(next.activeProfileId).toBe(secondId);
  });

  it("still collapses a re-approval of the SAME hub", () => {
    // Which is what lok does server-side too: re-approving the same user,
    // device, app and hub rotates that hub's client and ends its old chain.
    const existingId = deriveProfileId({ ...identity, hubId: "h1" });
    const existing = {
      ...createProfileFromSession(sessionFor("lok.test", "old"), 1, existingId),
      identity: { ...identity, hubId: "h1" },
    };
    const pending = provisionalProfileId("https://lok.test/lok/f/");
    const fresh = createProfileFromSession(sessionFor("lok.test", "new"), 50, pending);
    const book = setActiveProfile(
      upsertProfile(upsertProfile(emptyProfileBook(), existing), fresh),
      pending,
      50,
    );

    const next = reidentifyProfile(book, pending, { ...identity, hubId: "h1" });

    expect(Object.keys(next.profiles)).toEqual([existingId]);
    expect(next.profiles[existingId].session.token.access_token).toBe("new");
  });

  it("never lets a switch destroy the hub you switched away from", () => {
    // The reported bug: clicking a hub in the switcher "deletes a hub". lok
    // answering with no hub (a deployment that does not fill `Context.hub`, or
    // a client bound to none) re-keyed the clicked profile backwards onto the
    // hub-less id — straight on top of the other hub's row, taking its refresh
    // chain with it. An established profile is updated in place instead.
    const hubOneId = deriveProfileId({ ...identity, hubId: "h1" });
    const hubTwoId = deriveProfileId({ ...identity, hubId: "h2" });
    const hubOne = {
      ...createProfileFromSession(sessionFor("lok.test", "one"), 1, hubOneId),
      identity: { ...identity, hubId: "h1" },
    };
    const hubTwo = {
      ...createProfileFromSession(sessionFor("lok.test", "two"), 2, hubTwoId),
      identity: { ...identity, hubId: "h2" },
    };
    const book = setActiveProfile(
      upsertProfile(upsertProfile(emptyProfileBook(), hubOne), hubTwo),
      hubTwoId,
      10,
    );

    // mycontext answers for the profile we just switched to — with no hub.
    const next = reidentifyProfile(book, hubTwoId, identity, { username: "me" });

    expect(Object.keys(next.profiles).sort()).toEqual([hubOneId, hubTwoId].sort());
    expect(next.profiles[hubOneId].session.token.access_token).toBe("one");
    expect(next.profiles[hubTwoId].session.token.access_token).toBe("two");
    // The label still lands; only the id is left alone.
    expect(next.profiles[hubTwoId].label.username).toBe("me");
  });

  it("treats a missing hub as 'not answered', not as 'no hub any more'", () => {
    const hubOneId = deriveProfileId({ ...identity, hubId: "h1" });
    const hubOne = {
      ...createProfileFromSession(sessionFor("lok.test", "one"), 1, hubOneId),
      identity: { ...identity, hubId: "h1" },
    };
    const book = setActiveProfile(
      upsertProfile(emptyProfileBook(), hubOne),
      hubOneId,
      10,
    );

    const next = reidentifyProfile(book, hubOneId, identity);

    // Same id, hub intact — otherwise the next approval into another hub would
    // collide with this row.
    expect(Object.keys(next.profiles)).toEqual([hubOneId]);
    expect(next.profiles[hubOneId].identity.hubId).toBe("h1");
  });

  it("is a no-op for an unknown id", () => {
    const book = emptyProfileBook();
    expect(reidentifyProfile(book, "nope", identity)).toBe(book);
  });
});

describe("removeProfile", () => {
  const seed = () => {
    const a = createProfileFromSession(sessionFor("alpha.test"), 1, "id-a");
    const b = createProfileFromSession(sessionFor("beta.test"), 2, "id-b");
    return setActiveProfile(
      upsertProfile(upsertProfile(emptyProfileBook(), a), b),
      "id-a",
      10,
    );
  };

  it("drops to logged-out when the active profile is removed", () => {
    // Never silently sign the user into a different organization: a switch is
    // something they ask for, not a side effect of tidying up.
    const next = removeProfile(seed(), "id-a");
    expect(next.activeProfileId).toBeNull();
    expect(Object.keys(next.profiles)).toEqual(["id-b"]);
  });

  it("leaves the active profile alone when removing another", () => {
    const next = removeProfile(seed(), "id-b");
    expect(next.activeProfileId).toBe("id-a");
  });

  it("is a no-op for an unknown id", () => {
    const book = seed();
    expect(removeProfile(book, "nope")).toBe(book);
  });
});

describe("writes aimed at a removed profile", () => {
  it("are dropped rather than resurrecting it", () => {
    // An in-flight token refresh can land after the user removed the profile it
    // belongs to.
    const a = createProfileFromSession(sessionFor("alpha.test"), 1, "id-a");
    const book = removeProfile(upsertProfile(emptyProfileBook(), a), "id-a");

    expect(updateProfileSession(book, "id-a", sessionFor("alpha.test", "x")).profiles)
      .toEqual({});
    expect(markProfileStale(book, "id-a", "gone").profiles).toEqual({});
  });
});

describe("listProfiles / groupProfilesByDeployment", () => {
  it("lists most recently used first", () => {
    const a = createProfileFromSession(sessionFor("alpha.test"), 1, "id-a");
    const b = createProfileFromSession(sessionFor("beta.test"), 2, "id-b");
    const book = upsertProfile(upsertProfile(emptyProfileBook(), a), b);
    expect(listProfiles(book).map((p) => p.id)).toEqual(["id-b", "id-a"]);
  });

  it("groups two organizations on one deployment together", () => {
    const a = createProfileFromSession(sessionFor("alpha.test"), 1, "id-a");
    const b = createProfileFromSession(sessionFor("alpha.test"), 2, "id-b");
    const c = createProfileFromSession(sessionFor("beta.test"), 3, "id-c");

    const groups = groupProfilesByDeployment([c, b, a]);

    expect(groups).toHaveLength(2);
    expect(groups[0].profiles.map((p) => p.id)).toEqual(["id-c"]);
    expect(groups[1].profiles.map((p) => p.id)).toEqual(["id-b", "id-a"]);
  });
});

describe("setActiveProfile", () => {
  it("bumps lastUsedAt and records the endpoint for a later reconnect", () => {
    const a = createProfileFromSession(sessionFor("alpha.test"), 1, "id-a");
    const next = setActiveProfile(upsertProfile(emptyProfileBook(), a), "id-a", 999);
    expect(next.profiles["id-a"].lastUsedAt).toBe(999);
    expect(next.lastEndpoint?.base_url).toBe("https://alpha.test/lok/f/");
  });

  it("ignores an unknown id", () => {
    const book = emptyProfileBook();
    expect(setActiveProfile(book, "nope")).toBe(book);
  });
});

describe("writeStoredProfileBook", () => {
  it("writes only what changed — an identical book costs no write and no storage event", () => {
    const book = setActiveProfile(
      upsertProfile(emptyProfileBook(), createProfileFromSession(sessionFor("alpha.test"), 1, "id-alpha")),
      "id-alpha",
      10,
    );
    const setItem = vi.spyOn(storage, "setItem");

    expect(writeStoredProfileBook(book, storage)).toBe(true);
    expect(writeStoredProfileBook(book, storage)).toBe(false);
    expect(writeStoredProfileBook(setActiveProfile(book, null), storage)).toBe(true);
    expect(setItem).toHaveBeenCalledTimes(2);
  });
});

describe("admitGrantedProfile", () => {
  const identity = { userId: "2", orgId: "3", hubId: "49" };
  const finalId = deriveProfileId({ baseUrl: "https://alpha.test/lok/f/", userId: "2", organizationId: "3", hubId: "49" });

  it("writes a grant that names its identity under its final id, active", () => {
    const { book, profileId } = admitGrantedProfile(emptyProfileBook(), sessionFor("alpha.test", "new"), identity, undefined, 7);
    expect(profileId).toBe(finalId);
    expect(book.activeProfileId).toBe(finalId);
    expect(book.profiles[finalId]).toMatchObject({
      identity: { userId: "2", organizationId: "3", hubId: "49" },
      status: "ok",
      createdAt: 7,
    });
  });

  it("lands a re-approval on the row it had: new session, kept label and creation date, cleared stale", () => {
    const existing = {
      ...createProfileFromSession(sessionFor("alpha.test", "old"), 1, finalId),
      identity: { baseUrl: "https://alpha.test/lok/f/", userId: "2", organizationId: "3", hubId: "49" },
      label: { organizationName: "Lab", brandHue: 200 },
    };
    const stale = markProfileStale(upsertProfile(emptyProfileBook(), existing), finalId, "Signed out");

    const { book } = admitGrantedProfile(stale, sessionFor("alpha.test", "new"), identity, undefined, 9);
    const profile = book.profiles[finalId];
    expect(Object.keys(book.profiles)).toEqual([finalId]);
    expect(profile.session.token.access_token).toBe("new");
    expect(profile.label).toMatchObject({ organizationName: "Lab", brandHue: 200, deploymentName: "alpha.test" });
    expect(profile).toMatchObject({ status: "ok", createdAt: 1, lastUsedAt: 9 });
    expect(profile.statusMessage).toBeUndefined();
  });

  it("keeps the row's mesh switch and pins, with the node the grant just joined", () => {
    const kept = { id: "node-old", label: "alpha", controlUrl: "https://mesh.alpha.test", hosts: ["pin.lab"], enabled: true };
    const existing = {
      ...createProfileFromSession(sessionFor("alpha.test", "old"), 1, finalId),
      identity: { baseUrl: "https://alpha.test/lok/f/", userId: "2", organizationId: "3", hubId: "49" },
      mesh: kept,
    };
    const { book } = admitGrantedProfile(
      upsertProfile(emptyProfileBook(), existing),
      sessionFor("alpha.test", "new"),
      identity,
      { ...kept, id: "node-new", hosts: [] },
    );
    expect(book.profiles[finalId].mesh).toMatchObject({ id: "node-new", hosts: ["pin.lab"], enabled: true });
  });

  it("falls back to a provisional id when the grant names no identity", () => {
    const { profileId } = admitGrantedProfile(emptyProfileBook(), sessionFor("alpha.test"), undefined, undefined);
    expect(isProvisionalProfileId(profileId)).toBe(true);
  });
});

describe("findProfileIdByChain", () => {
  it("finds the profile holding a refresh chain, whatever its id became", () => {
    const book = upsertProfile(emptyProfileBook(), createProfileFromSession(sessionFor("alpha.test"), 1, "renamed"));
    expect(findProfileIdByChain(book, "cid")).toBe("renamed");
    expect(findProfileIdByChain(book, "other")).toBeUndefined();
    expect(findProfileIdByChain(book, undefined)).toBeUndefined();
  });
});
