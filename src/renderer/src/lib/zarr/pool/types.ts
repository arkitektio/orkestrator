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
