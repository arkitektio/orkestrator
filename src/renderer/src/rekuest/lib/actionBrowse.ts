import {
  ActionFilter,
  ActionKind,
  ActionOrder,
  DemandKind,
  Granularity,
  Ordering,
  PortDemandInput,
  PortKind,
} from "@/rekuest/api/graphql";

// Pure helpers behind the actions catalog (ActionsPage) and the action detail
// panels. Inputs are typed structurally so they accept any fragment that
// carries the needed fields.

// --- Availability ---

export type AvailabilityImplementation = {
  id: string;
  agent: { id: string; active?: boolean | null; connected?: boolean | null };
};

export type AvailabilityStatus = "online" | "recent" | "offline" | "none";

export type Availability = {
  /** Number of implementations. */
  total: number;
  /** Distinct agents providing the action. */
  agents: number;
  /** Distinct agents connected right now. */
  online: number;
  /** Distinct agents seen recently (`active`) but not connected. */
  recent: number;
  status: AvailabilityStatus;
};

/**
 * `connected` is the live socket (what Home calls "Online"); `active` is
 * derived from last-seen. Only a connected agent can take an assignment now.
 */
export const deriveAvailability = (
  implementations: readonly AvailabilityImplementation[] | null | undefined,
): Availability => {
  const impls = implementations ?? [];
  const agents = new Map<string, { connected: boolean; active: boolean }>();

  for (const impl of impls) {
    const previous = agents.get(impl.agent.id);
    agents.set(impl.agent.id, {
      connected: Boolean(impl.agent.connected) || Boolean(previous?.connected),
      active: Boolean(impl.agent.active) || Boolean(previous?.active),
    });
  }

  let online = 0;
  let recent = 0;
  for (const agent of agents.values()) {
    if (agent.connected) online += 1;
    else if (agent.active) recent += 1;
  }

  const status: AvailabilityStatus =
    impls.length === 0
      ? "none"
      : online > 0
        ? "online"
        : recent > 0
          ? "recent"
          : "offline";

  return { total: impls.length, agents: agents.size, online, recent, status };
};

export const isRunnable = (item: {
  implementations?: readonly AvailabilityImplementation[] | null;
}) => deriveAvailability(item.implementations).online > 0;

// --- URL state → query variables ---

export type DemandDirection = "consumes" | "produces";

export const ACTION_SORTS = ["used", "newest"] as const;
export type ActionSort = (typeof ACTION_SORTS)[number];

export type ActionBrowseState = {
  search?: string | null;
  kind?: ActionKind | null;
  stateful?: boolean | null;
  app?: string | null;
  protocol?: string | null;
  collection?: string | null;
  structure?: string | null;
  dir?: DemandDirection | null;
  after?: Date | null;
  before?: Date | null;
};

/** Matches a structure at any port position (no `at`). */
export const structureDemand = (
  identifier: string,
  direction: DemandDirection,
): PortDemandInput => ({
  kind: direction === "produces" ? DemandKind.Returns : DemandKind.Args,
  matches: [{ kind: PortKind.Structure, identifier }],
});

export const buildActionFilter = (state: ActionBrowseState): ActionFilter => {
  const filter: ActionFilter = {};

  const search = state.search?.trim();
  if (search) filter.search = search;
  if (state.kind) filter.kind = state.kind;
  if (state.stateful !== null && state.stateful !== undefined) {
    filter.stateful = state.stateful;
  }
  if (state.app) filter.appIdentifier = state.app;
  if (state.protocol) filter.protocols = [state.protocol];
  if (state.collection) filter.inCollection = state.collection;
  if (state.structure) {
    filter.demands = [structureDemand(state.structure, state.dir ?? "consumes")];
  }
  if (state.after) filter.usedAfter = state.after;
  if (state.before) filter.usedBefore = state.before;

  return filter;
};

export const ACTIONS_PATH = "/rekuest/actions";

/** A link into the catalog with some facets preset, e.g. from a chip. */
export const actionsBrowseLink = (
  params: Partial<
    Record<"protocol" | "collection" | "structure" | "dir" | "app", string>
  >,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return { pathname: ACTIONS_PATH, search: query ? `?${query}` : "" };
};

export const buildActionOrdering = (
  sort: ActionSort | null | undefined,
): ActionOrder[] | undefined => {
  if (sort === "used") return [{ usedAt: Ordering.Desc }];
  if (sort === "newest") return [{ definedAt: Ordering.Desc }];
  return undefined;
};

// --- Test matrix ---

export type MatrixImplementation = {
  id: string;
  interface: string;
  agent: { id: string; name: string };
};

export type MatrixResult = {
  id: string;
  passed: boolean;
  createdAt: string;
  implementation: MatrixImplementation;
};

export type MatrixTestCase = {
  id: string;
  name: string;
  results: readonly MatrixResult[];
};

export type TestMatrix<TCase extends MatrixTestCase> = {
  rows: TCase[];
  cols: MatrixImplementation[];
  /** Latest result of `caseId` on `implementationId`, if it ever ran there. */
  cell: (caseId: string, implementationId: string) => MatrixResult | undefined;
};

export const pivotTestMatrix = <TCase extends MatrixTestCase>(
  testCases: readonly TCase[] | null | undefined,
  implementations: readonly MatrixImplementation[] | null | undefined,
): TestMatrix<TCase> => {
  const rows = [...(testCases ?? [])];
  const cols = new Map<string, MatrixImplementation>();
  for (const impl of implementations ?? []) cols.set(impl.id, impl);

  const latest = new Map<string, MatrixResult>();
  for (const testCase of rows) {
    for (const result of testCase.results) {
      // A result may name an implementation that is gone from the action by
      // now; keep its column so the history stays visible.
      if (!cols.has(result.implementation.id)) {
        cols.set(result.implementation.id, result.implementation);
      }
      const key = `${testCase.id}:${result.implementation.id}`;
      const previous = latest.get(key);
      if (
        !previous ||
        new Date(result.createdAt).getTime() >
          new Date(previous.createdAt).getTime()
      ) {
        latest.set(key, result);
      }
    }
  }

  return {
    rows,
    cols: [...cols.values()],
    cell: (caseId, implementationId) =>
      latest.get(`${caseId}:${implementationId}`),
  };
};

// --- Time series ---

export type Bucket = { ts: string; count: number };

const FIXED_STEP_MS: Partial<Record<Granularity, number>> = {
  [Granularity.Hour]: 3_600_000,
  [Granularity.Day]: 86_400_000,
  [Granularity.Week]: 7 * 86_400_000,
};

const CALENDAR_STEP_MONTHS: Partial<Record<Granularity, number>> = {
  [Granularity.Month]: 1,
  [Granularity.Quarter]: 3,
  [Granularity.Year]: 12,
};

const stepBucket = (ts: number, by: Granularity): number => {
  const fixed = FIXED_STEP_MS[by];
  if (fixed) return ts + fixed;
  const date = new Date(ts);
  date.setUTCMonth(date.getUTCMonth() + (CALENDAR_STEP_MONTHS[by] ?? 1));
  return date.getTime();
};

/**
 * The backend omits empty buckets; a chart needs them as zeros or it draws a
 * straight line across a quiet month. Gaps are filled by stepping from the
 * buckets that are there, so nothing is assumed about how the server aligns
 * them (timezone, week start). `to` extends the tail with zeros up to now.
 */
export const fillBuckets = (
  series: readonly Bucket[] | null | undefined,
  by: Granularity,
  to?: Date,
): Bucket[] => {
  const sorted = [...(series ?? [])].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime(),
  );
  if (sorted.length === 0) return [];

  const filled: Bucket[] = [];
  const pushZeros = (from: number, keepGoing: (cursor: number) => boolean) => {
    let cursor = stepBucket(from, by);
    while (keepGoing(cursor)) {
      filled.push({ ts: new Date(cursor).toISOString(), count: 0 });
      cursor = stepBucket(cursor, by);
    }
  };

  sorted.forEach((bucket, index) => {
    filled.push({ ts: bucket.ts, count: bucket.count });
    const next = sorted[index + 1];
    if (next) {
      const until = new Date(next.ts).getTime();
      // Stop half a step short of the next real bucket: that slack absorbs a
      // DST shift between neighbours instead of duplicating the bucket.
      pushZeros(
        new Date(bucket.ts).getTime(),
        (cursor) => cursor < until - (stepBucket(cursor, by) - cursor) / 2,
      );
    }
  });

  if (to) {
    // Up to and including the bucket that contains `to`.
    const until = to.getTime();
    pushZeros(
      new Date(sorted[sorted.length - 1].ts).getTime(),
      (cursor) => cursor <= until,
    );
  }

  return filled;
};
