// @vitest-environment jsdom
import { ApolloClient, InMemoryCache } from "@apollo/client";
import { MockLink, type MockedResponse } from "@apollo/client/testing";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The generated lok hooks take their client from `Arkitekt.useSelfService()`
 * rather than an ApolloProvider, so the Arkitekt module is mocked and handed a
 * real client over a MockLink — the same shape `MembershipBrandWriter.test` uses.
 */
let client: ApolloClient<unknown>;
const setProfileIdentity = vi.fn();
let activeProfileId = "pending-1";
let connection: Record<string, unknown> = { endpoint: { base_url: "https://lok.test/lok/f/" } };

vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  useSelfClient: () => client,
  Arkitekt: {
    useSelfService: () => ({ client }),
    useActiveProfileId: () => activeProfileId,
    useSetProfileIdentity: () => setProfileIdentity,
    useConnection: () => connection,
  },
}));

import { MyContextDocument } from "../api/graphql";
import { ProfileIdentitySync } from "./ProfileIdentitySync";

const ORG = {
  __typename: "Organization",
  id: "org-1",
  name: "Alpha Lab",
  slug: "alpha",
  brandHue: 200,
  brandChroma: 0.1,
};

const contextMock = (
  hub: { id: string; name: string; identifier: string } | null,
): MockedResponse => ({
  request: { query: MyContextDocument },
  result: {
    data: {
      mycontext: {
        __typename: "Context",
        roles: [],
        scope: [],
        organization: ORG,
        user: {
          __typename: "User",
          id: "user-1",
          username: "jhnnsrs",
          memberships: [],
        },
        hub: hub ? { __typename: "Hub", ...hub } : null,
      },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const mount = (hub: { id: string; name: string; identifier: string } | null) => {
  const link = new MockLink([contextMock(hub)]);
  link.setOnError(() => {});
  client = new ApolloClient({ link, cache: new InMemoryCache() });
  return render(<ProfileIdentitySync />);
};

beforeEach(() => {
  setProfileIdentity.mockClear();
  activeProfileId = "pending-1";
  connection = { endpoint: { base_url: "https://lok.test/lok/f/" } };
});

describe("ProfileIdentitySync", () => {
  it("puts the hub in the identity, which is what keys the profile", async () => {
    // Two hubs of one organization are two approvals with two refresh chains;
    // without this they derive the same id and one chain is lost.
    mount({ id: "hub-1", name: "Imaging", identifier: "com.example.imaging" });

    await waitFor(() => expect(setProfileIdentity).toHaveBeenCalled());
    const [profileId, patch] = setProfileIdentity.mock.calls[0];

    expect(profileId).toBe("pending-1");
    expect(patch.identity).toEqual({
      baseUrl: "https://lok.test/lok/f/",
      userId: "user-1",
      organizationId: "org-1",
      hubId: "hub-1",
    });
    expect(patch.label.hubName).toBe("Imaging");
    expect(patch.label.hubSlug).toBe("com.example.imaging");
  });

  it("writes a null hub for a client bound to no hub", async () => {
    // Which keeps the id in its three-part form, exactly as before hubs existed.
    mount(null);

    await waitFor(() => expect(setProfileIdentity).toHaveBeenCalled());
    const [, patch] = setProfileIdentity.mock.calls[0];

    expect(patch.identity.hubId).toBeNull();
    expect(patch.label.hubName).toBeUndefined();
  });

  it("writes once per actual change, not once per refetch", async () => {
    // The query is cache-and-network and refetches on reactivate; re-persisting
    // an identical identity would re-key the book on every poll.
    mount({ id: "hub-1", name: "Imaging", identifier: "com.example.imaging" });

    await waitFor(() => expect(setProfileIdentity).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));

    expect(setProfileIdentity).toHaveBeenCalledTimes(1);
  });

  describe("against the connection's grant", () => {
    const withGrant = (organization: string) => ({
      endpoint: { base_url: "https://lok.test/lok/f/" },
      fakts: { self: { sub: "user-1", organization, hub: "hub-1" } },
    });
    const HUB = { id: "hub-1", name: "Imaging", identifier: "com.example.imaging" };

    it("writes when the answer is the active profile's own login", async () => {
      activeProfileId = "https://lok.test/lok/f::user-1::org-1::hub-1";
      connection = withGrant("org-1");
      mount(HUB);
      await waitFor(() => expect(setProfileIdentity).toHaveBeenCalled());
    });

    it("writes nothing while the old organization's connection is still live", async () => {
      // The switch made another profile active; this connection is not its.
      activeProfileId = "https://lok.test/lok/f::user-1::org-2::hub-9";
      connection = withGrant("org-1");
      mount(HUB);
      await new Promise((r) => setTimeout(r, 30));
      expect(setProfileIdentity).not.toHaveBeenCalled();
    });

    it("writes nothing for a cached answer from another organization", async () => {
      activeProfileId = "https://lok.test/lok/f::user-1::org-2::hub-1";
      connection = withGrant("org-2");
      mount(HUB); // answers org-1
      await new Promise((r) => setTimeout(r, 30));
      expect(setProfileIdentity).not.toHaveBeenCalled();
    });
  });
});
