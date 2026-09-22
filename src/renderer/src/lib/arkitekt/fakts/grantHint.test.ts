import { describe, expect, it } from "vitest";

import { grantHintForProfile, hasGrantHint, withGrantHint } from "./grantHint";
import type { StoredProfile } from "./profileStorageSchema";

const BASE = "https://lok.test/configure/ABCD-1234";

describe("withGrantHint", () => {
  it("names the account and the hub the session belonged to", () => {
    const url = new URL(withGrantHint(BASE, { hub: "h1", sub: "u1" }));
    expect(url.searchParams.get("hub")).toBe("h1");
    expect(url.searchParams.get("sub")).toBe("u1");
    expect(url.pathname).toBe("/configure/ABCD-1234");
  });

  it("carries the account alone while lok answers with no hub", () => {
    // `hubId` is nullish on every profile written before `Context.hub` ships.
    const url = new URL(withGrantHint(BASE, { hub: null, sub: "u1" }));
    expect(url.searchParams.has("hub")).toBe(false);
    expect(url.searchParams.get("sub")).toBe("u1");
  });

  it("leaves a URL alone when there is nothing to hint", () => {
    expect(withGrantHint(BASE)).toBe(BASE);
    expect(withGrantHint(BASE, { hub: null, sub: null })).toBe(BASE);
  });

  it("keeps the parameters the server put there", () => {
    const url = new URL(
      withGrantHint(`${BASE}?user_code=ABCD-1234`, { sub: "u1" }),
    );
    expect(url.searchParams.get("user_code")).toBe("ABCD-1234");
    expect(url.searchParams.get("sub")).toBe("u1");
  });

  it("never overrides a hint the server set itself", () => {
    // The deployment owns this URL; if it has started answering with its own
    // `sub`, it knows better than we do.
    const url = new URL(withGrantHint(`${BASE}?sub=theirs`, { sub: "ours" }));
    expect(url.searchParams.get("sub")).toBe("theirs");
  });

  it("hands back an unparseable URL rather than dropping it", () => {
    expect(withGrantHint("not a url", { sub: "u1" })).toBe("not a url");
  });
});

describe("grantHintForProfile", () => {
  const profile = (identity: Partial<StoredProfile["identity"]>) =>
    ({
      identity: { baseUrl: "https://lok.test/", userId: null, organizationId: null, ...identity },
    }) as StoredProfile;

  it("takes the account and hub from the profile's server-side identity", () => {
    expect(grantHintForProfile(profile({ userId: "u1", hubId: "h1" }))).toEqual({
      sub: "u1",
      hub: "h1",
    });
  });

  it("is empty for a provisional profile lok has not yet named", () => {
    expect(hasGrantHint(grantHintForProfile(profile({})))).toBe(false);
  });

  it("produces the configure URL lok documents for a re-approval", () => {
    // `Context.hub`'s own docstring: "Apps can pass its id back as `?hub=` on a
    // later configure link to preselect it."
    const url = new URL(
      withGrantHint(
        "https://lok.test/configure/ABCD-1234",
        grantHintForProfile(profile({ userId: "u1", hubId: "h1" })),
      ),
    );
    expect(url.search).toBe("?hub=h1&sub=u1");
  });
});
