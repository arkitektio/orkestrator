// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from "@apollo/client";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { REKUEST_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import rekuestResult from "../api/fragments";
import {
  ListSignalsDocument,
  type ListSignalsQuery,
  type ListSignalsQueryVariables,
  SignalKind,
} from "../api/graphql";

vi.mock("@/rekuest/api/hooks", () => ({ useRekuest: () => undefined }));

import { combinePages, useAllOffsetPages, useOffsetPages } from "./useOffsetPages";

type Row = ListSignalsQuery["signals"][number];

const signal = (index: number): Row => ({
  __typename: "Signal",
  id: String(index),
  identifier: "@mikro/image",
  kind: SignalKind.Created,
  object: String(index),
  serviceName: "mikro",
  service: null,
  descriptors: null,
  occurredAt: null,
  receivedAt: "2026-11-22T10:00:00Z",
  processedAt: null,
  causingTask: null,
  runs: [],
});

/** A server holding `total` signals that, like strawberry_django, answers at most 100 at once. */
const server = (total: number) => {
  const asked: { offset: number; limit: number }[] = [];
  const link = new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        const { offset = 0, limit = 100 } = operation.variables.pagination ?? {};
        asked.push({ offset, limit });
        const rows = Array.from({ length: total }, (_, index) => signal(index)).slice(offset, offset + Math.min(limit, 100));
        observer.next({ data: { signals: rows } });
        observer.complete();
      }),
  );
  const client = new ApolloClient({
    link,
    cache: new InMemoryCache({ possibleTypes: rekuestResult.possibleTypes, typePolicies: REKUEST_TYPE_POLICIES }),
  });
  return { client, asked };
};

describe("combinePages", () => {
  it("shows the pages that came, in order, each row once", () => {
    const { items, hasMore } = combinePages([[{ id: "1" }, { id: "2" }], [{ id: "2" }, { id: "3" }]], 2);
    expect(items?.map((row) => row.id)).toEqual(["1", "2", "3"]);
    expect(hasMore).toBe(true);
  });

  it("offers more only after a full last page, and nothing before the first page", () => {
    expect(combinePages([[{ id: "1" }]], 2).hasMore).toBe(false);
    expect(combinePages([[{ id: "1" }, { id: "2" }], undefined], 2)).toEqual({ items: [{ id: "1" }, { id: "2" }], hasMore: false });
    expect(combinePages([undefined], 2)).toEqual({ items: undefined, hasMore: false });
  });
});

describe("useOffsetPages", () => {
  const variables = { filters: {} };
  const select = (data: ListSignalsQuery) => data.signals;

  it("reaches every row past the server's cap of 100, one page of 50 at a time", async () => {
    const { client, asked } = server(160);
    const { result } = renderHook(() =>
      useOffsetPages<ListSignalsQuery, Row, ListSignalsQueryVariables>({ query: ListSignalsDocument, variables, select, pageSize: 50, client }),
    );

    await waitFor(() => expect(result.current.items).toHaveLength(50));
    for (const expected of [100, 150, 160]) {
      expect(result.current.hasMore).toBe(true);
      act(() => result.current.loadMore());
      await waitFor(() => expect(result.current.items).toHaveLength(expected));
    }

    expect(result.current.hasMore).toBe(false);
    expect(result.current.items?.map((row) => row.id)).toEqual(Array.from({ length: 160 }, (_, index) => String(index)));
    expect(asked.every(({ limit }) => limit === 50)).toBe(true);
  });

  it("starts again at the first page for other filters", async () => {
    const { client } = server(120);
    const { result, rerender } = renderHook(
      ({ filters }: { filters: ListSignalsQueryVariables["filters"] }) =>
        useOffsetPages<ListSignalsQuery, Row, ListSignalsQueryVariables>({ query: ListSignalsDocument, variables: { filters }, select, pageSize: 50, client }),
      { initialProps: { filters: {} } },
    );
    await waitFor(() => expect(result.current.items).toHaveLength(50));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(100));

    rerender({ filters: { search: "image" } });
    await waitFor(() => expect(result.current.items).toHaveLength(50));
  });
});

describe("useAllOffsetPages", () => {
  it("loads a whole list in pages of 100", async () => {
    const { client, asked } = server(250);
    const { result } = renderHook(() =>
      useAllOffsetPages<ListSignalsQuery, Row, ListSignalsQueryVariables>({ query: ListSignalsDocument, variables: { filters: {} }, select: (data) => data.signals, client }),
    );

    await waitFor(() => expect(result.current.items).toHaveLength(250));
    expect(asked.map(({ offset }) => offset)).toEqual([0, 100, 200]);
  });
});
