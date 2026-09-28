import type { FieldPolicy, Reference, StoreObject, TypePolicies } from "@apollo/client";

/**
 * Apollo cache policies shared by every GraphQL service: offset pagination for
 * root `Query` list fields (`buildOffsetPaginationPolicies`) and a by-`key`
 * merge for embedded port lists (`mergePortsByKey`).
 *
 * # Offset pagination
 *
 * ## The problem
 *
 * Without a policy, Apollo keys a root list field on its *whole* argument
 * object, so `actions({filters:{search:"a"},pagination:{offset:0,limit:20}})`
 * and `actions({filters:{search:"a"},pagination:{offset:20,limit:20}})` are
 * two unrelated `ROOT_QUERY` entries — and so is every search prefix and every
 * page the user ever visited. Nothing evicts them (they are reachable from
 * ROOT_QUERY, so `cache.gc()` cannot touch them either), so the cache only
 * ever grows.
 *
 * ## The design
 *
 * `keyArgs` = every argument EXCEPT `pagination`, so all pages of one
 * `(filters, ordering, …)` combination live in ONE entry. That entry is a
 * single **offset-indexed array** — a window onto the server's list — and the
 * `read` function slices out only the page the query asked for.
 *
 * Why a `read` at all? Because this app does NOT accumulate pages with
 * `fetchMore`: `components/layout/createList.tsx` and `ListRender.tsx` render
 * `data.<field>` directly and page by *changing the `pagination` variable*
 * (page N replaces page N-1). With a plain "merge everything" policy the list
 * would show every page at once. And with no `read`, the cache would answer a
 * request for page 2 with page 1's rows (the key no longer distinguishes
 * them) — which `cache-first` lists would never correct. So `read` returns
 * exactly `[offset, offset+limit)` and returns `undefined` (a cache miss that
 * triggers the network) when any row in that window is unknown.
 *
 * Why an offset-indexed *array* rather than a `{offset → page}` map? Because
 * subscription updaters (`rekuest/components/functional/AgentUpdater.tsx`,
 * `rekuest/lib/taskCache.ts`) reach into these root fields with
 * `cache.modify({ fields: { agents(existing) { … } } })` and treat `existing`
 * as a `Reference[]`. An array keeps those modifiers working unchanged: an
 * append lands after the last known row, a `filter` removal shifts later rows
 * up — exactly what the server's list would do. Unknown rows (a gap between
 * page 0 and page 3) are stored as `null`, never as array holes, so
 * `filter`/`map` in those modifiers cannot compact them.
 *
 * Any query without a `pagination` argument on such a field is treated as
 * `offset: 0` with no limit — i.e. the whole list — which replaces the entry.
 */

/** Field name → the argument names that identify the list (all but `pagination`). */
export type PaginatedFieldMap = Record<string, readonly string[]>;

type PaginationArgs = {
  pagination?: { offset?: number | null; limit?: number | null } | null;
} | null;

const offsetOf = (args: PaginationArgs | undefined) => args?.pagination?.offset ?? 0;
const limitOf = (args: PaginationArgs | undefined) => {
  const limit = args?.pagination?.limit;
  return typeof limit === "number" && limit >= 0 ? limit : undefined;
};

/**
 * Write `incoming` (one page) into the offset-indexed window at
 * `args.pagination.offset`. A page shorter than its `limit` is the tail of the
 * server's list, so everything after it is dropped; a query without a limit
 * is the whole list and replaces the window outright.
 */
export function mergeOffsetPage<T>(
  existing: readonly (T | null)[] | undefined,
  incoming: readonly T[],
  args: PaginationArgs | undefined,
): (T | null)[] {
  const offset = offsetOf(args);
  const limit = limitOf(args);
  const merged: (T | null)[] = Array.isArray(existing) ? existing.slice(0) : [];

  // Never leave holes: a `filter` in a `cache.modify` modifier would compact
  // them and shift later pages into the gap.
  for (let i = merged.length; i < offset; i++) merged[i] = null;
  for (let i = 0; i < incoming.length; i++) merged[offset + i] = incoming[i];

  const isTail = limit === undefined || incoming.length < limit;
  if (isTail) merged.length = offset + incoming.length;

  return merged;
}

/**
 * Read back exactly the page `args.pagination` asks for, or `undefined` (cache
 * miss → network) when the window does not fully cover it. Rows whose
 * reference can no longer be read (evicted entities) are dropped, mirroring
 * what Apollo does for plain array fields.
 */
export function readOffsetPage<T>(
  existing: readonly (T | null)[] | undefined,
  args: PaginationArgs | undefined,
  canRead: (value: T) => boolean = () => true,
): T[] | undefined {
  if (!Array.isArray(existing)) return undefined;
  const offset = offsetOf(args);
  const limit = limitOf(args);

  // The only page we can vouch for beyond the window's end is the empty list
  // at offset 0 (the server told us the list is empty).
  if (offset >= existing.length) {
    return offset === 0 && existing.length === 0 ? [] : undefined;
  }

  const end = limit === undefined ? existing.length : Math.min(offset + limit, existing.length);
  const page: T[] = [];
  for (let i = offset; i < end; i++) {
    const row = existing[i];
    if (row === null || row === undefined) return undefined;
    if (canRead(row)) page.push(row);
  }
  return page;
}

/** Build the `FieldPolicy` for one paginated root field. */
export const offsetPaginationPolicy = (keyArgs: readonly string[]): FieldPolicy<any> => ({
  keyArgs: keyArgs as string[],
  read: (existing, { args, canRead }) =>
    readOffsetPage(existing, args as PaginationArgs, canRead),
  merge: (existing, incoming, { args }) =>
    mergeOffsetPage(existing, incoming ?? [], args as PaginationArgs),
});

/**
 * `Query` type policies for every field in `fields` — the map is meant to be
 * enumerated from `graphql/schemas/<service>.graphql` (root `type Query`,
 * every field with a `pagination` argument; see `app/cachePolicies.ts`).
 */
export const buildOffsetPaginationPolicies = (fields: PaginatedFieldMap): TypePolicies => ({
  Query: {
    fields: Object.fromEntries(
      Object.entries(fields).map(([name, keyArgs]) => [name, offsetPaginationPolicy(keyArgs)]),
    ),
  },
});

/**
 * Merge two embedded port lists (`Action.args`, `Action.returns`, …) by
 * `port.key`.
 *
 * Ports have no id, so Apollo cannot normalize them: whichever query wrote the
 * field last replaces the whole array. The `MyTasks` list selects a slim
 * `Action.args { key kind identifier }` (fragment `LiveTask`) while detail /
 * assign views select the full `...Ports` on the SAME `Action:<id>` entity —
 * so a slim write used to wipe `children`, `validators`, `effects`, … and
 * force every mounted detail view to refetch. This merge keeps `incoming`'s
 * order and membership but unions each port with the existing one of the same
 * key (incoming fields win), so a slim write only refreshes the slim fields.
 *
 * `readKey` is injectable because Apollo hands the policy `StoreObject`s
 * whose fields should be read with `readField`; the default reads `.key`.
 */
export function mergePortsByKey<T extends object>(
  existing: readonly T[] | undefined,
  incoming: readonly T[],
  readKey: (port: T) => unknown = (port) => (port as { key?: unknown }).key,
): T[] {
  if (!Array.isArray(existing) || existing.length === 0) return incoming.slice(0);
  const byKey = new Map<unknown, T>();
  for (const port of existing) {
    const key = readKey(port);
    if (key !== undefined && key !== null) byKey.set(key, port);
  }
  return incoming.map((port) => {
    const key = readKey(port);
    const previous = key !== undefined && key !== null ? byKey.get(key) : undefined;
    return previous ? { ...previous, ...port } : port;
  });
}

/** `FieldPolicy` for an embedded port list — see `mergePortsByKey`. */
export const portsByKeyPolicy: FieldPolicy<any> = {
  merge: (existing, incoming, { readField }) =>
    mergePortsByKey(existing, incoming ?? [], (port) =>
      readField("key", port as StoreObject | Reference),
    ),
};
