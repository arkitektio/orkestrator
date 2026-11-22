import { gql, InMemoryCache } from "@apollo/client";
import { describe, expect, it } from "vitest";
import { LOK_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";

const REPORTS = gql`
  query Reports($pagination: OffsetPaginationInput) {
    bugReports(pagination: $pagination) {
      id
    }
  }
`;

const rows = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, i) => ({ __typename: "BugReport", id: String(from + i) }));

const write = (cache: InMemoryCache, offset: number, limit: number, data: ReturnType<typeof rows>) =>
  cache.writeQuery({ query: REPORTS, variables: { pagination: { offset, limit } }, data: { bugReports: data } });

const read = (cache: InMemoryCache, offset: number, limit: number) =>
  cache.readQuery<{ bugReports: { id: string }[] }>({ query: REPORTS, variables: { pagination: { offset, limit } } })
    ?.bugReports.map((r) => r.id);

describe("lok list paging", () => {
  it("reads a window grown page by page from the cache", () => {
    const cache = new InMemoryCache({ typePolicies: LOK_TYPE_POLICIES });
    write(cache, 0, 50, rows(0, 50));
    write(cache, 50, 50, rows(50, 100));
    write(cache, 100, 50, rows(100, 150));
    expect(read(cache, 0, 150)).toHaveLength(150);
  });

  it("keeps the later pages when the grown window is refetched whole and comes back cut at 100", () => {
    const cache = new InMemoryCache({ typePolicies: LOK_TYPE_POLICIES });
    write(cache, 0, 50, rows(0, 50));
    write(cache, 50, 50, rows(50, 100));
    write(cache, 100, 50, rows(100, 150));
    // A refetchQueries of the shown window: limit 150, the server answers 100.
    write(cache, 0, 150, rows(0, 100));
    expect(read(cache, 0, 150)).toHaveLength(150);
  });

  it("still ends the list on a short page", () => {
    const cache = new InMemoryCache({ typePolicies: LOK_TYPE_POLICIES });
    write(cache, 0, 50, rows(0, 50));
    write(cache, 50, 50, rows(50, 70));
    expect(read(cache, 0, 100)).toHaveLength(70);
  });
});
