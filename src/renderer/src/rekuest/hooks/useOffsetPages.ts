import type {
  ApolloClient,
  ApolloError,
  ApolloQueryResult,
  DocumentNode,
  ObservableQuery,
  OperationVariables,
} from "@apollo/client";
import * as React from "react";
import { useRekuest } from "@/rekuest/api/hooks";

/**
 * Pages of one list, asked for by offset at a fixed size: what "Show more"
 * loads. Growing one request's limit instead stops at the server's page cap
 * (100) without saying so; a page of its own never asks past it.
 */

type Paged = { pagination?: { offset?: number | null; limit?: number | null } | null };

/**
 * The rows of the pages loaded so far, in order: only up to the first page
 * that has not come yet. A row a later page repeats (the list moved while
 * paging) is shown once. More may follow only after a full last page.
 */
export const combinePages = <T>(
  pages: ReadonlyArray<ReadonlyArray<T> | undefined>,
  pageSize: number,
  idOf: (item: T) => unknown = (item) => (item as { id?: unknown }).id,
): { items: T[] | undefined; hasMore: boolean } => {
  if (pages.length === 0 || pages[0] === undefined) return { items: undefined, hasMore: false };
  const items: T[] = [];
  const seen = new Set<unknown>();
  let complete = true;
  for (const page of pages) {
    if (page === undefined) {
      complete = false;
      break;
    }
    for (const item of page) {
      const id = idOf(item);
      if (id !== undefined && id !== null) {
        if (seen.has(id)) continue;
        seen.add(id);
      }
      items.push(item);
    }
  }
  const last = pages[pages.length - 1];
  return { items, hasMore: complete && last !== undefined && last.length >= pageSize };
};

type Entry<TData> = {
  query: ObservableQuery<TData>;
  unsubscribe: () => void;
};

type PageResult<TData> = { data?: TData; error?: ApolloError };

export type OffsetPages<TItem> = {
  items: TItem[] | undefined;
  error: ApolloError | undefined;
  hasMore: boolean;
  loadMore: () => void;
  /** Asks every loaded page again (each at its own offset and size). */
  refetch: () => void;
};

export const useOffsetPages = <TData, TItem, TVariables extends OperationVariables & Paged>(args: {
  query: DocumentNode;
  variables: Omit<TVariables, "pagination">;
  select: (data: TData) => ReadonlyArray<TItem>;
  pageSize: number;
  skip?: boolean;
  /** For tests and callers outside the rekuest guard; the rekuest client otherwise. */
  client?: ApolloClient<unknown>;
}): OffsetPages<TItem> => {
  const rekuest = useRekuest() as ApolloClient<unknown> | undefined;
  const client = args.client ?? rekuest;
  const { query, variables, select, pageSize, skip } = args;
  const variablesKey = JSON.stringify(variables);

  const [pageCount, setPageCount] = React.useState(1);
  const [pagedFor, setPagedFor] = React.useState(variablesKey);
  if (pagedFor !== variablesKey) {
    // Other filters are another list: it starts at its first page.
    setPagedFor(variablesKey);
    setPageCount(1);
  }

  const [results, setResults] = React.useState<ReadonlyMap<string, PageResult<TData>>>(() => new Map());
  const entries = React.useRef(new Map<string, Entry<TData>>());
  const keys = React.useMemo(
    () => (skip || !client ? [] : Array.from({ length: pagedFor === variablesKey ? pageCount : 1 }, (_, i) => `${variablesKey}#${i}`)),
    [skip, client, variablesKey, pageCount, pagedFor],
  );
  React.useEffect(() => {
    if (!client) return;
    const wanted = new Set(keys);
    keys.forEach((key, index) => {
      if (entries.current.has(key)) return;
      // The key holds the variables (as JSON) it was made for.
      const pageVariables = JSON.parse(key.slice(0, key.lastIndexOf("#"))) as Omit<TVariables, "pagination">;
      const observable = client.watchQuery<TData, TVariables>({
        query,
        variables: {
          ...pageVariables,
          pagination: { offset: index * pageSize, limit: pageSize },
        } as TVariables,
        // The first page is asked again as the list is opened; the pages after it come once.
        fetchPolicy: index === 0 ? "cache-and-network" : "cache-first",
        nextFetchPolicy: "cache-first",
      });
      const entry: Entry<TData> = { query: observable as ObservableQuery<TData>, unsubscribe: () => {} };
      const record = (result: PageResult<TData>) =>
        setResults((previous) => new Map(previous).set(key, { ...previous.get(key), ...result }));
      const subscription = observable.subscribe({
        next: (result: ApolloQueryResult<TData>) => record({ data: result.data ?? undefined, error: result.error }),
        error: (error: ApolloError) => record({ error }),
      });
      entry.unsubscribe = () => subscription.unsubscribe();
      entries.current.set(key, entry);
    });
    // A dropped page's last answer stays in `results`, unread: only `keys` are shown.
    for (const [key, entry] of entries.current) {
      if (!wanted.has(key)) {
        entry.unsubscribe();
        entries.current.delete(key);
      }
    }
  }, [client, query, keys, pageSize]);

  React.useEffect(
    () => () => {
      for (const entry of entries.current.values()) entry.unsubscribe();
      entries.current.clear();
    },
    [],
  );

  const pages = keys.map((key) => {
    const data = results.get(key)?.data;
    return data ? select(data) : undefined;
  });
  const { items, hasMore } = combinePages(pages, pageSize);
  const error = keys.map((key) => results.get(key)?.error).find(Boolean);

  const loadMore = React.useCallback(() => setPageCount((count) => count + 1), []);
  const refetch = React.useCallback(() => {
    for (const key of keys) void entries.current.get(key)?.query.refetch().catch(() => undefined);
  }, [keys]);

  return { items, error, hasMore: !skip && hasMore, loadMore, refetch };
};

/** The server's largest page: asking for more returns this many. */
export const SERVER_PAGE_LIMIT = 100;

/**
 * Every row of a list, page after page at the server's largest page size:
 * for the few lists that must be whole (an export, the views a room draws).
 */
export const useAllOffsetPages = <TData, TItem, TVariables extends OperationVariables & Paged>(
  args: Omit<Parameters<typeof useOffsetPages<TData, TItem, TVariables>>[0], "pageSize">,
): OffsetPages<TItem> => {
  const pages = useOffsetPages<TData, TItem, TVariables>({ ...args, pageSize: SERVER_PAGE_LIMIT });
  const { hasMore, loadMore } = pages;
  React.useEffect(() => {
    if (hasMore) loadMore();
  }, [hasMore, loadMore]);
  return pages;
};
