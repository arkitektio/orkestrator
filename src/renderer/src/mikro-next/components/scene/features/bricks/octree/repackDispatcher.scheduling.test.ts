import { describe, expect, it } from "vitest";
import type { RepackWorkerRequest, RepackWorkerResponse } from "./repack-worker";
import { createWorkerRepackDispatcher, type RepackJob } from "./repackDispatcher";

/**
 * The worker dispatcher's SCHEDULING, with fake workers that never repack:
 * a job must land on an idle worker (never queue behind a busy sibling), the
 * per-worker in-flight cap must hold with overflow waiting FIFO in the
 * dispatcher, and a queued job whose signal aborts must be dropped rather
 * than posted. The repack math itself is covered by `repackDispatcher.test.ts`
 * through the sync implementation — both paths call the same `repackBrick`.
 */

class FakeWorker {
  onmessage: ((event: MessageEvent<RepackWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: { message: RepackWorkerRequest; transfer: Transferable[] }[] = [];
  terminated = false;

  postMessage(message: RepackWorkerRequest, transfer: Transferable[] = []) {
    this.posted.push({ message, transfer });
  }
  terminate() {
    this.terminated = true;
  }
  /** Ids of jobs posted here and not yet answered. */
  get open(): number[] {
    return this.posted.map(({ message }) => message.id).filter((id) => !this.answered.has(id));
  }
  private answered = new Set<number>();
  respond(id: number) {
    this.answered.add(id);
    this.onmessage?.({
      data: { id, buffer: new ArrayBuffer(8), min: 0, max: 1, uniformValue: null, slabMin: [0], slabMax: [1] },
    } as MessageEvent<RepackWorkerResponse>);
  }
  fail(id: number, error = "boom") {
    this.answered.add(id);
    this.onmessage?.({ data: { id, error } } as MessageEvent<RepackWorkerResponse>);
  }
  crash(message = "crashed") {
    this.onerror?.({ message } as ErrorEvent);
  }
}

/** Never runs: the fake worker answers without looking at the input. */
const job = (signal?: AbortSignal): RepackJob =>
  ({
    kind: "r8",
    elementCount: 8,
    input: { spec: { channelCount: 1 } },
    signal,
  }) as unknown as RepackJob;

const pool = (workerCount: number, maxInFlightPerWorker: number) => {
  const workers: FakeWorker[] = [];
  const dispatcher = createWorkerRepackDispatcher({
    workerCount,
    maxInFlightPerWorker,
    spawn: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    },
  });
  return { workers, dispatcher };
};

const settled = <T>(promise: Promise<T>) => {
  const state = { status: "pending" as "pending" | "resolved" | "rejected", error: undefined as unknown };
  promise.then(
    () => (state.status = "resolved"),
    (error) => {
      state.status = "rejected";
      state.error = error;
    },
  );
  return state;
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Fire-and-forget: these jobs are answered by a fake or rejected by dispose. */
const fire = (promise: Promise<unknown>) => {
  promise.catch(() => {});
};

describe("repack dispatcher scheduling", () => {
  it("prefers an idle worker over a busy one (no head-of-line blocking)", () => {
    const { workers, dispatcher } = pool(2, 2);
    fire(dispatcher.repack(job()));
    fire(dispatcher.repack(job()));
    // Worker 0 is busy with job 1; job 2 must spawn/land on worker 1 rather
    // than double up on worker 0 even though the cap would allow it.
    expect(workers).toHaveLength(2);
    expect(workers[0].open).toEqual([1]);
    expect(workers[1].open).toEqual([2]);

    // Worker 1 finishes first: the next job goes to it, not round-robin to 0.
    workers[1].respond(2);
    fire(dispatcher.repack(job()));
    expect(workers[0].open).toEqual([1]);
    expect(workers[1].open).toEqual([3]);
    dispatcher.dispose();
  });

  it("holds the per-worker cap and queues overflow FIFO", () => {
    const { workers, dispatcher } = pool(2, 2);
    for (let i = 0; i < 6; i++) fire(dispatcher.repack(job()));
    // 2 workers × cap 2 = 4 posted, 2 waiting in the dispatcher.
    expect(workers[0].open).toEqual([1, 3]);
    expect(workers[1].open).toEqual([2, 4]);

    // A completion frees exactly one slot, which takes the OLDEST queued job.
    workers[1].respond(2);
    expect(workers[1].open).toEqual([4, 5]);
    workers[0].respond(1);
    expect(workers[0].open).toEqual([3, 6]);
    dispatcher.dispose();
  });

  it("picks the least-loaded worker when none is idle", () => {
    const { workers, dispatcher } = pool(2, 3);
    for (let i = 0; i < 3; i++) fire(dispatcher.repack(job()));
    // Idle-first fills 1→w0, 2→w1, then least-loaded breaks the tie → w0.
    expect(workers[0].open).toEqual([1, 3]);
    expect(workers[1].open).toEqual([2]);
    fire(dispatcher.repack(job()));
    expect(workers[1].open).toEqual([2, 4]);
    dispatcher.dispose();
  });

  it("drops a queued job when its signal aborts, without posting it", async () => {
    const { workers, dispatcher } = pool(1, 1);
    fire(dispatcher.repack(job()));
    const controller = new AbortController();
    const queued = settled(dispatcher.repack(job(controller.signal)));
    const behind = settled(dispatcher.repack(job()));
    expect(workers[0].open).toEqual([1]);

    controller.abort();
    await tick();
    expect(queued.status).toBe("rejected");
    expect((queued.error as Error).name).toBe("AbortError");

    // The worker frees up: the aborted job is skipped, the one behind it posts.
    workers[0].respond(1);
    expect(workers[0].open).toEqual([3]);
    expect(workers[0].posted.map(({ message }) => message.id)).toEqual([1, 3]);
    expect(behind.status).toBe("pending");
    dispatcher.dispose();
  });

  it("rejects an already-aborted job immediately", async () => {
    const { workers, dispatcher } = pool(1, 1);
    const controller = new AbortController();
    controller.abort();
    await expect(dispatcher.repack(job(controller.signal))).rejects.toMatchObject({ name: "AbortError" });
    expect(workers).toHaveLength(0);
    dispatcher.dispose();
  });

  it("an abort after posting is ignored — the worker's result still lands", async () => {
    const { workers, dispatcher } = pool(1, 1);
    const controller = new AbortController();
    const first = settled(dispatcher.repack(job(controller.signal)));
    controller.abort();
    workers[0].respond(1);
    await tick();
    expect(first.status).toBe("resolved");
    dispatcher.dispose();
  });

  it("resolves and rejects per job, and frees the slot either way", async () => {
    const { workers, dispatcher } = pool(1, 1);
    const ok = settled(dispatcher.repack(job()));
    const bad = settled(dispatcher.repack(job()));
    workers[0].respond(1);
    expect(workers[0].open).toEqual([2]);
    workers[0].fail(2, "nope");
    await tick();
    expect(ok.status).toBe("resolved");
    expect(bad.status).toBe("rejected");
    expect((bad.error as Error).message).toBe("nope");
    dispatcher.dispose();
  });

  it("a worker crash fails what is in flight and lets the queue drain", async () => {
    const { workers, dispatcher } = pool(1, 1);
    const inFlight = settled(dispatcher.repack(job()));
    const queued = settled(dispatcher.repack(job()));
    workers[0].crash();
    await tick();
    expect(inFlight.status).toBe("rejected");
    expect(queued.status).toBe("pending");
    // The queued job went out once the crash cleared the slot.
    expect(workers[0].posted.map(({ message }) => message.id)).toEqual([1, 2]);
    dispatcher.dispose();
  });

  it("transfers only the recycled buffer, taken at post time", () => {
    const { workers, dispatcher } = pool(1, 1);
    fire(dispatcher.repack(job()));
    expect(workers[0].posted[0].transfer).toEqual([]);
    // Release an 8-byte buffer: the NEXT posted job carries it back.
    dispatcher.release(new Uint8Array(8));
    fire(dispatcher.repack(job())); // queued (cap 1)
    expect(workers[0].posted).toHaveLength(1);
    workers[0].respond(1);
    const second = workers[0].posted[1];
    expect(second.message.recycled?.byteLength).toBe(8);
    expect(second.transfer).toEqual([second.message.recycled]);
    dispatcher.dispose();
  });

  it("dispose rejects in-flight and queued jobs and terminates every worker", async () => {
    const { workers, dispatcher } = pool(2, 1);
    const inFlight = settled(dispatcher.repack(job()));
    fire(dispatcher.repack(job()));
    const queued = settled(dispatcher.repack(job()));
    dispatcher.dispose();
    await tick();
    expect(inFlight.status).toBe("rejected");
    expect(queued.status).toBe("rejected");
    expect(workers.every((worker) => worker.terminated)).toBe(true);
    await expect(dispatcher.repack(job())).rejects.toThrow(/disposed/);
  });

  it("prewarm fills the pool once and never over-spawns", () => {
    const { workers, dispatcher } = pool(3, 1);
    dispatcher.prewarm?.();
    dispatcher.prewarm?.();
    expect(workers).toHaveLength(3);
    for (let i = 0; i < 5; i++) fire(dispatcher.repack(job()));
    expect(workers).toHaveLength(3);
    expect(workers.map((worker) => worker.open)).toEqual([[1], [2], [3]]);
    dispatcher.dispose();
  });
});
