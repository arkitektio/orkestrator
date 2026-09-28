import { describe, expect, it } from "vitest";

import WorkerPool from "./workerpool";

/** A stand-in for `Worker` — the pool only stores, hands out and terminates it. */
function fakeWorker(): Worker {
  return { terminate: () => {} } as unknown as Worker;
}

/** A task whose completion the test controls. Counts concurrent starts. */
function controlledTasks() {
  const started: Array<{ worker: Worker | null; finish: (result?: unknown) => void; fail: (error: unknown) => void }> = [];
  let peak = 0;
  let running = 0;
  const make = (label: string) => (worker: Worker | null) =>
    new Promise<{ worker: Worker | null; result: string }>((resolve, reject) => {
      running++;
      peak = Math.max(peak, running);
      started.push({
        worker,
        finish: () => {
          running--;
          resolve({ worker, result: label });
        },
        fail: (error) => {
          running--;
          reject(error);
        },
      });
    });
  return { started, make, peak: () => peak };
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("WorkerPool", () => {
  it("runs poolSize × maxInFlightPerWorker tasks concurrently, sharing workers", async () => {
    const pool = new WorkerPool(2, { maxInFlightPerWorker: 3, factory: fakeWorker });
    const { started, make, peak } = controlledTasks();
    const handles = Array.from({ length: 10 }, (_, i) => pool.enqueue(make(`t${i}`)));

    expect(started).toHaveLength(6);
    expect(peak()).toBe(6);
    expect(pool.inFlight).toBe(6);
    expect(pool.queued).toBe(4);
    // Both workers carry three tasks each — least-loaded pick, not first-fit.
    const byWorker = new Map<Worker | null, number>();
    for (const { worker } of started) byWorker.set(worker, (byWorker.get(worker) ?? 0) + 1);
    expect([...byWorker.values()]).toEqual([3, 3]);

    started[0].finish();
    await tick();
    expect(started).toHaveLength(7);
    // Finishing frees slots asynchronously, so drain until everything ran.
    let finished = 1;
    while (finished < 10) {
      for (; finished < started.length; finished++) started[finished].finish();
      await tick();
    }
    await expect(Promise.all(handles.map((h) => h.promise))).resolves.toHaveLength(10);
    expect(pool.inFlight).toBe(0);
  });

  it("prefers a pre-warmed idle worker over spawning, and spawns before doubling up", () => {
    let spawned = 0;
    const pool = new WorkerPool(2, {
      maxInFlightPerWorker: 2,
      factory: () => {
        spawned++;
        return fakeWorker();
      },
    });
    pool.prewarm(undefined, 1);
    expect(spawned).toBe(1);
    const { started, make } = controlledTasks();
    pool.enqueue(make("a"));
    expect(spawned).toBe(1); // the warm worker took it
    pool.enqueue(make("b"));
    expect(spawned).toBe(2); // a free worker beats sharing a busy one
    pool.enqueue(make("c"));
    expect(spawned).toBe(2); // now share
    expect(started[0].worker).not.toBe(started[1].worker);
  });

  it("dispatches by priority, then FIFO", async () => {
    const pool = new WorkerPool(1, { maxInFlightPerWorker: 1, factory: fakeWorker });
    const { started, make } = controlledTasks();
    const order: string[] = [];
    const track = (label: string, priority: number) =>
      pool.enqueue(make(label), { priority }).promise.then((r) => order.push(r));
    track("first", 0); // running
    track("low-a", 0);
    track("high", 10);
    track("low-b", 0);
    const bumped = pool.enqueue(make("bumped"), { priority: 0 });
    void bumped.promise.then((r) => order.push(r));
    expect(bumped.updatePriority(5)).toBe(true);

    while (started.length < 5) {
      started[started.length - 1].finish();
      await tick();
    }
    started[started.length - 1].finish();
    await tick();
    expect(order).toEqual(["first", "high", "bumped", "low-a", "low-b"]);
  });

  it("cancel rejects a queued task at once and a started task when it settles", async () => {
    const pool = new WorkerPool(1, { maxInFlightPerWorker: 1, factory: fakeWorker });
    const { started, make } = controlledTasks();
    const running = pool.enqueue(make("running"));
    const queued = pool.enqueue(make("queued"));

    expect(queued.cancel()).toBe(true);
    await expect(queued.promise).rejects.toMatchObject({ name: "AbortError" });
    expect(pool.queued).toBe(0);

    expect(running.cancel()).toBe(true);
    expect(started).toHaveLength(1);
    started[0].finish();
    await expect(running.promise).rejects.toMatchObject({ name: "AbortError" });
    expect(pool.inFlight).toBe(0);
  });

  it("a failing task frees its slot but keeps the shared worker", async () => {
    const pool = new WorkerPool(1, { maxInFlightPerWorker: 2, factory: fakeWorker });
    const { started, make } = controlledTasks();
    const failing = pool.enqueue(make("fails"));
    const sibling = pool.enqueue(make("sibling"));
    const worker = started[0].worker;
    expect(started[1].worker).toBe(worker);

    started[0].fail(new Error("403"));
    await expect(failing.promise).rejects.toThrow("403");
    expect(pool.slots[0].worker).toBe(worker);
    expect(pool.slots[0].inFlight).toBe(1);

    started[1].finish();
    await expect(sibling.promise).resolves.toBe("sibling");
    // The next task lands on the same, still-live worker.
    pool.enqueue(make("next"));
    expect(started[2].worker).toBe(worker);
  });

  it("retire empties the slot so it respawns on next use", () => {
    let spawned = 0;
    const pool = new WorkerPool(1, {
      maxInFlightPerWorker: 2,
      factory: () => {
        spawned++;
        return fakeWorker();
      },
    });
    const { started, make } = controlledTasks();
    pool.enqueue(make("a"));
    pool.retire(started[0].worker!);
    expect(pool.slots[0].worker).toBeNull();
    expect(pool.slots[0].inFlight).toBe(1);
    pool.enqueue(make("b"));
    expect(spawned).toBe(2);
    expect(started[1].worker).not.toBe(started[0].worker);
  });

  it("without a factory, a task's own worker is adopted into the slot on success", async () => {
    const pool = new WorkerPool(1, { maxInFlightPerWorker: 2 });
    const mine = fakeWorker();
    const first = pool.enqueue(async (worker) => {
      expect(worker).toBeNull();
      return { worker: mine, result: 1 };
    });
    // The slot is `null` but busy — a second task must not be started on it.
    const { started, make } = controlledTasks();
    pool.enqueue(make("second"));
    expect(started).toHaveLength(0);
    await first.promise;
    await tick();
    expect(started[0].worker).toBe(mine);
  });

  it("keeps a big equal-priority queue in FIFO order (binary-search insert)", async () => {
    const pool = new WorkerPool(1, { maxInFlightPerWorker: 1, factory: fakeWorker });
    const { started, make } = controlledTasks();
    const n = 2000;
    const results: number[] = [];
    for (let i = 0; i < n; i++) {
      void pool.enqueue(make(String(i))).promise.then((r) => results.push(Number(r)));
    }
    expect(pool.queued).toBe(n - 1);
    // Removal by id from the middle of the queue stays exact.
    const handles = Array.from({ length: 3 }, () => pool.enqueue(make("x")));
    expect(handles[1].cancel()).toBe(true);
    await expect(handles[1].promise).rejects.toMatchObject({ name: "AbortError" });
    expect(pool.queued).toBe(n - 1 + 2);
    for (let i = 0; i < n + 2; i++) {
      started[i].finish();
      await tick();
    }
    expect(results).toEqual(Array.from({ length: n }, (_, i) => i));
  });
});
