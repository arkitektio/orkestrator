import type {
  WorkerPoolTaskDescriptor,
  WorkerPoolTaskHandle,
  WorkerPoolTaskInput,
  WorkerPoolTaskOptions,
} from './types'

type QueuedTask<T> = WorkerPoolTaskDescriptor<T> & {
  id: number
  sequence: number
  started: boolean
  settled: boolean
  canceled: boolean
  resolve: (result: T) => void
  reject: (error: unknown) => void
}

/**
 * One pool slot. `worker` is `null` until something spawns into it (the
 * pool's `factory`, `prewarm`, or a task that returns the worker it made).
 * `inFlight` counts the tasks currently running on it.
 */
export interface WorkerSlot {
  worker: Worker | null
  inFlight: number
}

export interface WorkerPoolOptions {
  /**
   * Tasks that may run concurrently on ONE worker. A codec task is
   * `fetch → decode`, and the fetch is pure network wait (the worker thread
   * idles on a socket) — so exclusive checkout capped HTTP concurrency at
   * the pool size while decodes queued behind workers that were merely
   * waiting. Overlapping a few fetches per worker lifts that ceiling to
   * `poolSize × maxInFlightPerWorker` without more threads. Decodes still
   * serialize per worker (one event loop), which is what the thread count
   * is sized for.
   */
  maxInFlightPerWorker?: number
  /**
   * Spawns a worker for an empty slot the first time it is needed. With a
   * factory the pool owns every worker it hands out; without one the task
   * receives `null` and must spawn (and return) its own.
   */
  factory?: () => Worker
}

export const DEFAULT_MAX_IN_FLIGHT_PER_WORKER = 4

function createCanceledError(): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Aborted', 'AbortError')
  }

  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

/** Queue order: higher priority first, then FIFO (`sequence` is unique). */
function compareTasks(a: QueuedTask<unknown>, b: QueuedTask<unknown>): number {
  const priorityA = a.priority ?? 0
  const priorityB = b.priority ?? 0
  if (priorityA !== priorityB) {
    return priorityB - priorityA
  }

  return a.sequence - b.sequence
}

export class WorkerPool {
  readonly slots: WorkerSlot[]

  readonly maxInFlightPerWorker: number

  private readonly factory: (() => Worker) | undefined

  private taskQueue: Array<QueuedTask<unknown>>

  private tasks: Map<number, QueuedTask<unknown>>

  private nextTaskId: number

  private nextSequence: number

  constructor(poolSize: number, options: WorkerPoolOptions = {}) {
    this.slots = Array.from({ length: poolSize }, () => ({ worker: null, inFlight: 0 }))
    this.maxInFlightPerWorker = Math.max(
      1,
      options.maxInFlightPerWorker ?? DEFAULT_MAX_IN_FLIGHT_PER_WORKER,
    )
    this.factory = options.factory
    this.taskQueue = []
    this.tasks = new Map()
    this.nextTaskId = 0
    this.nextSequence = 0
  }

  /** Tasks handed to a worker and not yet settled. */
  get inFlight(): number {
    let total = 0
    for (const slot of this.slots) total += slot.inFlight
    return total
  }

  /** Tasks waiting for a slot. */
  get queued(): number {
    return this.taskQueue.length
  }

  /**
   * Eagerly spawn up to `count` workers into never-used (`null`) slots so
   * module-worker cold start (spawn + codec-bundle eval) overlaps scene
   * setup instead of serializing in front of the first chunk fetches.
   * Idempotent: live workers are untouched; repeat calls only fill remaining
   * `null` slots.
   */
  prewarm(factory: (() => Worker) | undefined = this.factory, count = this.slots.length): void {
    if (!factory) return
    let spawned = 0
    for (const slot of this.slots) {
      if (spawned >= count) break
      if (slot.worker === null && slot.inFlight === 0) {
        slot.worker = factory()
        spawned++
      }
    }
  }

  enqueue<T>(
    taskInput: WorkerPoolTaskInput<T>,
    options?: WorkerPoolTaskOptions,
  ): WorkerPoolTaskHandle<T> {
    const descriptor = this.normalizeTaskInput(taskInput, options)
    const id = this.nextTaskId++

    let resolve!: (result: T) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise
      reject = rejectPromise
    })

    const queuedTask: QueuedTask<T> = {
      ...descriptor,
      id,
      sequence: this.nextSequence++,
      started: false,
      settled: false,
      canceled: false,
      resolve,
      reject,
    }

    this.tasks.set(id, queuedTask as QueuedTask<unknown>)
    this.insertTask(queuedTask as QueuedTask<unknown>)
    this.pumpQueue()

    return {
      id,
      promise,
      cancel: () => this.cancel(id),
      updatePriority: (priority) => this.updatePriority(id, priority),
    }
  }

  cancel(taskId: number): boolean {
    const task = this.tasks.get(taskId)
    if (!task || task.settled) {
      return false
    }

    task.canceled = true

    if (!task.started) {
      this.removeQueuedTask(taskId)
      this.rejectTask(task, createCanceledError())
      this.pumpQueue()
    }

    return true
  }

  updatePriority(taskId: number, priority: number): boolean {
    const task = this.tasks.get(taskId)
    if (!task || task.settled || task.started) {
      return false
    }

    const removed = this.removeQueuedTask(taskId)
    if (!removed) {
      return false
    }

    task.priority = priority
    this.insertTask(task)
    this.pumpQueue()
    return true
  }

  /**
   * Drop a worker that died (uncaught error, terminated) from its slot so
   * the slot respawns on next use. The caller terminates/disposes the worker
   * itself; tasks still counted on the slot settle through their own
   * rejections. This — not a task rejection — is how a worker leaves the
   * pool: several tasks share one worker, so one task failing says nothing
   * about the worker's health.
   */
  retire(worker: Worker): void {
    for (const slot of this.slots) {
      if (slot.worker === worker) {
        slot.worker = null
        return
      }
    }
  }

  terminateWorkers(): void {
    for (const slot of this.slots) {
      slot.worker?.terminate()
      slot.worker = null
    }
  }

  /**
   * Least-loaded live worker under the cap; an empty slot (spawn) only when
   * every live worker already has work — a pre-warmed worker is free, a cold
   * spawn is not.
   */
  private pickSlot(): WorkerSlot | null {
    let best: WorkerSlot | null = null
    let empty: WorkerSlot | null = null
    for (const slot of this.slots) {
      if (slot.worker === null) {
        // Without a factory, a `null` slot with work on it belongs to a task
        // that spawned its own worker — nothing to share until it returns.
        // With one, the slot is spawnable regardless (a retired worker's
        // tasks are still counted here while their rejections drain).
        if ((slot.inFlight === 0 || this.factory) && empty === null) empty = slot
        continue
      }
      if (slot.inFlight >= this.maxInFlightPerWorker) continue
      if (best === null || slot.inFlight < best.inFlight) best = slot
    }

    if (best !== null && best.inFlight === 0) return best
    return empty ?? best
  }

  private pumpQueue(): void {
    while (this.taskQueue.length > 0) {
      const slot = this.pickSlot()
      if (slot === null) break

      const queuedTask = this.taskQueue.shift()!

      if (queuedTask.settled) {
        continue
      }

      if (queuedTask.canceled) {
        this.rejectTask(queuedTask, createCanceledError())
        continue
      }

      if (slot.worker === null && this.factory) {
        slot.worker = this.factory()
      }

      slot.inFlight++
      queuedTask.started = true

      queuedTask.task(slot.worker)
        .then(({ worker: returnedWorker, result }) => {
          this.release(slot, returnedWorker)

          if (queuedTask.canceled) {
            this.rejectTask(queuedTask, createCanceledError())
          } else {
            this.resolveTask(queuedTask, result)
          }

          this.pumpQueue()
        })
        .catch((error: unknown) => {
          this.release(slot, null)
          this.rejectTask(
            queuedTask,
            queuedTask.canceled ? createCanceledError() : error,
          )
          this.pumpQueue()
        })
    }
  }

  private release(slot: WorkerSlot, returnedWorker: Worker | null): void {
    slot.inFlight--
    // A task that spawned its own worker (no factory) donates it to the slot.
    if (slot.worker === null && returnedWorker !== null) {
      slot.worker = returnedWorker
    }
  }

  private normalizeTaskInput<T>(
    taskInput: WorkerPoolTaskInput<T>,
    options?: WorkerPoolTaskOptions,
  ): WorkerPoolTaskDescriptor<T> {
    if (typeof taskInput === 'function') {
      return { task: taskInput, priority: options?.priority }
    }

    return taskInput
  }

  /** First index whose task sorts at or after `task` (binary search). */
  private lowerBound(task: QueuedTask<unknown>): number {
    let low = 0
    let high = this.taskQueue.length
    while (low < high) {
      const mid = (low + high) >>> 1
      if (compareTasks(this.taskQueue[mid], task) < 0) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    return low
  }

  private insertTask(task: QueuedTask<unknown>): void {
    const index = this.lowerBound(task)
    if (index === this.taskQueue.length) {
      this.taskQueue.push(task)
      return
    }

    this.taskQueue.splice(index, 0, task)
  }

  private removeQueuedTask(taskId: number): boolean {
    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    // `(priority, sequence)` is unique, so the lower bound IS the task's
    // index if it is queued at all.
    const index = this.lowerBound(task)
    if (this.taskQueue[index] !== task) {
      return false
    }

    this.taskQueue.splice(index, 1)
    return true
  }

  private resolveTask<T>(task: QueuedTask<T>, result: T): void {
    if (task.settled) {
      return
    }

    task.settled = true
    this.tasks.delete(task.id)
    task.resolve(result)
  }

  private rejectTask(task: QueuedTask<unknown>, error: unknown): void {
    if (task.settled) {
      return
    }

    task.settled = true
    this.tasks.delete(task.id)
    task.reject(error)
  }
}

export default WorkerPool
