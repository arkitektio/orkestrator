/**
 * A function that receives an available worker (or null if a new worker should
 * be created) and returns the worker to recycle back into the pool along with
 * the task result.
 *
 * The worker is SHARED: up to `maxInFlightPerWorker` tasks run on it at once,
 * so a task must never terminate it over its own failure — cancel or fail the
 * one request instead. A worker that actually died is removed with
 * `pool.retire(worker)`.
 */
export type WorkerPoolTask<T> = (
  worker: Worker | null
) => Promise<{ worker: Worker | null; result: T }>

export interface WorkerPoolTaskOptions {
  priority?: number
}

/**
 * Priority tier for user-interactive fetches (probe reads, exact-voxel
 * lookups): higher numbers are served first, and streaming producers scale
 * their priorities with a monotonically increasing plan generation — an
 * interactive fetch must sort above ALL of that, forever, so it uses a tier
 * no generation-scaled priority can reach.
 */
export const INTERACTIVE_FETCH_PRIORITY = Number.MAX_SAFE_INTEGER

export interface WorkerPoolTaskDescriptor<T> extends WorkerPoolTaskOptions {
  task: WorkerPoolTask<T>
}

export type WorkerPoolTaskInput<T> =
  | WorkerPoolTask<T>
  | WorkerPoolTaskDescriptor<T>

export interface WorkerPoolTaskHandle<T> {
  id: number
  promise: Promise<T>
  cancel: () => boolean
  updatePriority: (priority: number) => boolean
}

/**
 * The LIVE priority of one logical request, shared by every pool task that
 * serves it — a request is often several tasks, some enqueued long after the
 * call (a shard run's decodes follow its ranged GET).
 *
 * A request that is already in flight keeps the priority it was enqueued
 * with, and a caller that joins it later inherits that: an on-screen brick
 * joining a chunk a background prefetch queued would wait behind everything.
 * `raise` moves the still-QUEUED tasks up and is what later-enqueued tasks
 * read. It only ever raises — a shared request is as urgent as its most
 * urgent waiter.
 */
export class TaskPriority {
  private readonly listeners = new Set<(priority: number) => void>()

  constructor(public value: number) {}

  raise(priority: number): void {
    if (!(priority > this.value)) return
    this.value = priority
    for (const listener of this.listeners) listener(priority)
  }

  /** Follow this priority with a queued task until it settles. */
  attach(handle: Pick<WorkerPoolTaskHandle<unknown>, "promise" | "updatePriority">): void {
    this.follow((priority) => handle.updatePriority(priority), handle.promise)
  }

  /** `attach` for a task whose priority is derived (a run shared by several
   * requests re-reads the max over its members). */
  follow(listener: (priority: number) => void, until: Promise<unknown>): void {
    this.listeners.add(listener)
    const stop = () => {
      this.listeners.delete(listener)
    }
    until.then(stop, stop)
  }
}
