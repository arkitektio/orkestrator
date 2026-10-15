import { ApolloClient, ApolloLink, InMemoryCache, Observable } from "@apollo/client";
import { describe, expect, it, vi } from "vitest";

import { LOK_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import { UserChipFragmentDoc, UserDocument } from "../api/graphql";
import { requestUserChip } from "./userChips";

vi.mock("../api/hooks", () => ({ useLok: () => undefined }));

const chip = (id: string) => ({
  __typename: "User",
  id,
  username: `user${id}`,
  profile: { __typename: "Profile", id: `p${id}`, avatar: null },
});

const setup = () => {
  const requests: string[][] = [];
  const link = new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        const ids = operation.variables.ids as string[];
        requests.push(ids);
        observer.next({ data: { users: ids.map(chip) } });
        observer.complete();
      }),
  );
  const client = new ApolloClient({ link, cache: new InMemoryCache({ typePolicies: LOK_TYPE_POLICIES }) });
  return { client, requests };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("requestUserChip", () => {
  it("sends every id asked for in one tick as one request, written onto each user", async () => {
    const { client, requests } = setup();
    requestUserChip(client, "1");
    requestUserChip(client, "2");
    requestUserChip(client, "1");
    await settle();
    expect(requests).toEqual([["1", "2"]]);
    const user = client.cache.readFragment({
      id: "User:2",
      fragment: UserChipFragmentDoc,
      fragmentName: "UserChip",
    });
    expect(user).toMatchObject({ id: "2", username: "user2" });
  });

  it("keeps a chip through cache.gc(): it hangs off user(id)", async () => {
    const { client } = setup();
    requestUserChip(client, "3");
    await settle();
    client.cache.gc();
    const user = client.cache.readFragment({
      id: "User:3",
      fragment: UserChipFragmentDoc,
      fragmentName: "UserChip",
    });
    expect(user).toMatchObject({ id: "3", username: "user3" });
  });

  it("asks for the whole batch in one page", async () => {
    const { client } = setup();
    const limits: unknown[] = [];
    const link = client.link;
    const request = link.request.bind(link);
    link.request = (operation, forward) => {
      limits.push(operation.variables.limit);
      return request(operation, forward);
    };
    requestUserChip(client, "1");
    requestUserChip(client, "2");
    await settle();
    expect(limits).toEqual([2]);
  });

  it("does not ask again for an id it just asked for", async () => {
    const { client, requests } = setup();
    requestUserChip(client, "1");
    await settle();
    requestUserChip(client, "1");
    await settle();
    expect(requests).toHaveLength(1);
  });

  it("lets user(id) miss when the cached user lacks what the query asks for", () => {
    const { client } = setup();
    client.cache.writeFragment({
      id: "User:7",
      fragment: UserChipFragmentDoc,
      fragmentName: "UserChip",
      data: chip("7"),
    });
    // DetailUser asks for more than a chip: still a miss, so the page fetches.
    expect(client.cache.readQuery({ query: UserDocument, variables: { id: "7" } })).toBeNull();
  });
});
