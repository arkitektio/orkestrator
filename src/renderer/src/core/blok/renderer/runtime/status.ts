import {diagnosticMessage} from '../../spec/vocabulary';

/**
 * Every value a blok reads from outside itself can be not-there-yet (blok
 * language v2, vocabulary `async`): agent state, args, the task, assets,
 * queries and subscriptions. The status travels with the value.
 *
 * - `pending`: not known yet (loading, connecting, first sync);
 * - `ready`: known; it may be null, which then means known absence;
 * - `stale`: known, but the source stopped updating (agent offline);
 * - `failed`: cannot be known (no access, agent gone, query error).
 *
 * Locals, `event`, loop variables and literals are always ready.
 */
export type BlokAsyncStatus = 'pending' | 'ready' | 'stale' | 'failed';

export const BLOK_ASYNC_STATUSES: readonly BlokAsyncStatus[] = ['pending', 'ready', 'stale', 'failed'];

/**
 * A source's status as a host reports it: the status, why it failed, and the
 * failure's code when it has one (`deps.unbound`), what `<error>` binds as `error.code`.
 */
export type BlokSourceStatus = {status: BlokAsyncStatus; error?: string | null; code?: string | null};

export const READY: BlokSourceStatus = Object.freeze({status: 'ready'});

/** The error code of a dependency bound to no agent (vocabulary `async.propagation`, a runtime diagnostic). */
export const DEPS_UNBOUND = 'deps.unbound';

/** Where a dependency's status is kept: `deps.<key>`, so its state, `.tasks.*` and `.assets.*` read it too. */
export const dependencyStatusPath = (key: string): string => `deps.${key}`;

/** The status of a dependency bound to no agent: failed, never ready with null. */
export const unboundDependencyStatus = (key: string): BlokSourceStatus => ({
  status: 'failed',
  error: diagnosticMessage(DEPS_UNBOUND, {key}),
  code: DEPS_UNBOUND,
});

/** The statuses of `keys`, dependencies bound to no agent, by the path each is kept at. */
export const unboundDependencyStatuses = (keys: readonly string[]): Record<string, BlokSourceStatus> =>
  Object.fromEntries(keys.map(key => [dependencyStatusPath(key), unboundDependencyStatus(key)]));

/**
 * How statuses combine across an expression's inputs: pending wins over
 * failed, failed over stale, stale over ready.
 */
const RANK: Readonly<Record<BlokAsyncStatus, number>> = {ready: 0, stale: 1, failed: 2, pending: 3};

export const combineStatus = (a: BlokSourceStatus, b: BlokSourceStatus): BlokSourceStatus =>
  RANK[b.status] > RANK[a.status] ? b : a;

export const isBlokAsyncStatus = (value: unknown): value is BlokAsyncStatus =>
  value === 'pending' || value === 'ready' || value === 'stale' || value === 'failed';
