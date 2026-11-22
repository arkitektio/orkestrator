import { gql, InMemoryCache } from "@apollo/client";
import { describe, expect, it } from "vitest";
import { markThreadsReadInCache } from "./mailOps";

const ROW = gql`
  query Row($inFolder: ID) {
    thread(id: "t1") {
      id
      unreadCount(folder: $inFolder)
    }
  }
`;

const row = (cache: InMemoryCache, inFolder: string) =>
  cache.readQuery<{ thread: { unreadCount: number } }>({ query: ROW, variables: { inFolder } })?.thread.unreadCount;

describe("markThreadsReadInCache", () => {
  const seeded = () => {
    const cache = new InMemoryCache();
    for (const [folder, count] of [["inbox", 2], ["archive", 1]] as const) {
      cache.writeQuery({ query: ROW, variables: { inFolder: folder }, data: { thread: { __typename: "Thread", id: "t1", unreadCount: count } } });
    }
    return cache;
  };

  it("drops the unread dot of a conversation read to the end, in every folder it is listed in", () => {
    const cache = seeded();
    markThreadsReadInCache(cache, [{ thread: { __typename: "Thread", id: "t1", unread: false } }]);
    expect(row(cache, "inbox")).toBe(0);
    expect(row(cache, "archive")).toBe(0);
  });

  it("leaves a conversation with unread mail left as it is", () => {
    const cache = seeded();
    markThreadsReadInCache(cache, [{ thread: { __typename: "Thread", id: "t1", unread: true } }]);
    expect(row(cache, "inbox")).toBe(2);
  });
});
