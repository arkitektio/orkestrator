// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { forgetMediaGrants, GRANT_REFRESH_SKEW_MS, mediaGrantKey, sharedGrant } from "./sharedGrant";
import { withCrossWindowLock } from "./sharedRefresh";

/**
 * The media grant is shared by every window and kept across launches, because
 * a presigned URL carries its credential: one grant is what gives a snapshot
 * one URL, and so one HTTP cache entry. "Another window" here is
 * localStorage written behind this window's back — the in-memory copy is per
 * window, the stored one is not. Each test uses its own key, since the
 * in-memory copy outlives a test.
 */

const DATALAYER = "https://linz.example:8443/s3";
const HOUR = 3_600_000;

type Grant = { accessKey: string; expiresAt: number; signedAt: number };

const grant = (accessKey: string, expiresAt = Date.now() + HOUR): Grant => ({
  accessKey,
  expiresAt,
  signedAt: Date.now(),
});

const store = (key: string, value: Grant) => localStorage.setItem(key, JSON.stringify(value));

beforeEach(() => {
  localStorage.clear();
});

describe("sharedGrant", () => {
  it("mints once and serves later calls from memory", async () => {
    const key = mediaGrantKey("mikro", "p-memory", DATALAYER);
    const mint = vi.fn(async () => grant("A"));
    const first = await sharedGrant(key, mint);
    const second = await sharedGrant(key, mint);
    expect(second).toBe(first);
    expect(mint).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(first);
  });

  it("adopts a grant another window stored, without minting", async () => {
    const key = mediaGrantKey("mikro", "p-adopt", DATALAYER);
    const theirs = grant("THEIRS");
    store(key, theirs);
    const mint = vi.fn(async () => grant("MINE"));
    expect(await sharedGrant(key, mint)).toEqual(theirs);
    expect(mint).not.toHaveBeenCalled();
  });

  it("coalesces concurrent misses in one window into one mint", async () => {
    const key = mediaGrantKey("mikro", "p-concurrent", DATALAYER);
    const mint = vi.fn(async () => grant("A"));
    const [a, b] = await Promise.all([sharedGrant(key, mint), sharedGrant(key, mint)]);
    expect(a).toBe(b);
    expect(mint).toHaveBeenCalledTimes(1);
  });

  it("re-reads inside the lock: a grant minted while waiting is adopted", async () => {
    const key = mediaGrantKey("mikro", "p-lock", DATALAYER);
    const theirs = grant("THEIRS");
    let release!: () => void;
    let entered!: () => void;
    const inside = new Promise<void>((resolve) => (entered = resolve));
    const held = withCrossWindowLock(key, async () => {
      const gate = new Promise<void>((resolve) => (release = resolve));
      entered();
      await gate;
      store(key, theirs);
    });
    await inside;
    const mint = vi.fn(async () => grant("MINE"));
    const pending = sharedGrant(key, mint);
    release();
    await held;
    expect(await pending).toEqual(theirs);
    expect(mint).not.toHaveBeenCalled();
  });

  it("re-mints a stored grant that is expired or inside the refresh skew", async () => {
    const key = mediaGrantKey("mikro", "p-stale", DATALAYER);
    store(key, grant("OLD", Date.now() + GRANT_REFRESH_SKEW_MS - 1));
    const mint = vi.fn(async () => grant("NEW"));
    expect((await sharedGrant(key, mint)).accessKey).toBe("NEW");
    expect(JSON.parse(localStorage.getItem(key)!).accessKey).toBe("NEW");
  });

  it("ignores a stored value that is not a grant", async () => {
    const key = mediaGrantKey("mikro", "p-garbage", DATALAYER);
    localStorage.setItem(key, "{not json");
    const mint = vi.fn(async () => grant("A"));
    expect((await sharedGrant(key, mint)).accessKey).toBe("A");
  });

  it("keeps a window-only grant out of storage", async () => {
    const key = mediaGrantKey("mikro", "", DATALAYER);
    const mint = vi.fn(async () => grant("A"));
    await sharedGrant(key, mint, { share: false });
    await sharedGrant(key, mint, { share: false });
    expect(mint).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("does not keep a failed mint", async () => {
    const key = mediaGrantKey("mikro", "p-fail", DATALAYER);
    await expect(sharedGrant(key, async () => Promise.reject(new Error("down")))).rejects.toThrow("down");
    expect((await sharedGrant(key, async () => grant("A"))).accessKey).toBe("A");
  });

  it("keys per-object grants apart by scope", async () => {
    const a = await sharedGrant(mediaGrantKey("rekuest", "p-scope", DATALAYER, "store:1"), async () => grant("ONE"));
    const b = await sharedGrant(mediaGrantKey("rekuest", "p-scope", DATALAYER, "store:2"), async () => grant("TWO"));
    expect(a.accessKey).toBe("ONE");
    expect(b.accessKey).toBe("TWO");
  });

  it("prunes expired stored grants when it writes, and leaves live ones", async () => {
    const dead = mediaGrantKey("rekuest", "p-prune", DATALAYER, "store:dead");
    const live = mediaGrantKey("rekuest", "p-prune", DATALAYER, "store:live");
    store(dead, grant("DEAD", Date.now() - 1));
    store(live, grant("LIVE"));
    localStorage.setItem("unrelated", "x");
    await sharedGrant(mediaGrantKey("rekuest", "p-prune", DATALAYER, "store:new"), async () => grant("NEW"));
    expect(localStorage.getItem(dead)).toBeNull();
    expect(localStorage.getItem(live)).not.toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("x");
  });

  it("keys profiles apart", async () => {
    const a = await sharedGrant(mediaGrantKey("mikro", "p-one", DATALAYER), async () => grant("ONE"));
    const b = await sharedGrant(mediaGrantKey("mikro", "p-two", DATALAYER), async () => grant("TWO"));
    expect(a.accessKey).toBe("ONE");
    expect(b.accessKey).toBe("TWO");
  });
});

describe("forgetMediaGrants", () => {
  it("drops one profile's grants, in memory and in storage, and leaves the rest", async () => {
    const mine = mediaGrantKey("mikro", "p-forget", DATALAYER);
    const mineElsewhere = mediaGrantKey("rekuest", "p-forget", "https://other.example/s3");
    const theirs = mediaGrantKey("mikro", "p-keep", DATALAYER);
    await sharedGrant(mine, async () => grant("A"));
    store(mineElsewhere, grant("B"));
    store(theirs, grant("C"));
    localStorage.setItem("unrelated", "x");

    forgetMediaGrants("p-forget");

    expect(localStorage.getItem(mine)).toBeNull();
    expect(localStorage.getItem(mineElsewhere)).toBeNull();
    expect(localStorage.getItem(theirs)).not.toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("x");
    // The in-memory copy went too: the next call mints.
    const mint = vi.fn(async () => grant("FRESH"));
    expect((await sharedGrant(mine, mint)).accessKey).toBe("FRESH");
  });

  it("does not match a profile id that only appears inside the datalayer URL", () => {
    const key = mediaGrantKey("mikro", "p-real", "https://host:p-ghost:9000/s3");
    store(key, grant("A"));
    forgetMediaGrants("p-ghost");
    expect(localStorage.getItem(key)).not.toBeNull();
  });

  it("drops every grant when no profile is named", () => {
    store(mediaGrantKey("mikro", "p-x", DATALAYER), grant("A"));
    store(mediaGrantKey("kraph", "p-y", DATALAYER), grant("B"));
    localStorage.setItem("unrelated", "x");
    forgetMediaGrants();
    expect(localStorage.length).toBe(1);
  });
});
