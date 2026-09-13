import { describe, expect, it } from "vitest";
import type { FabriksDecodeWorkerRequest, FabriksDecodeWorkerResponse } from "./fabriksDecode-worker";
import type { FabriksDecodeRequest } from "./fabriksDecodeCore";
import { createWorkerFabriksDecodeDispatcher } from "./fabriksDecodeDispatcher";

/**
 * The worker dispatcher's SCHEDULING, with fake workers that never decode:
 * a row group must land on an idle worker (never queue behind a busy one),
 * overflow waits FIFO in the dispatcher, and a queued job whose signal aborts
 * is dropped rather than posted. The decode itself is covered through the
 * sync implementation in `fabriksCore.test.ts` — both paths call the same
 * `decodeRowGroupSpan`.
 */

class FakeWorker {
  onmessage: ((event: MessageEvent<FabriksDecodeWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: { message: FabriksDecodeWorkerRequest; transfer: Transferable[] | undefined }[] = [];
  terminated = false;

  postMessage(message: FabriksDecodeWorkerRequest, transfer?: Transferable[]) {
    this.posted.push({ message, transfer });
  }
  terminate() {
    this.terminated = true;
  }
  get open(): number[] {
    return this.posted.map(({ message }) => message.id).filter((id) => !this.answered.has(id));
  }
  private answered = new Set<number>();
  respond(id: number) {
    this.answered.add(id);
    this.onmessage?.({ data: { id, cells: [] } } as MessageEvent<FabriksDecodeWorkerResponse>);
  }
  fail(id: number, error = "boom") {
    this.answered.add(id);
    this.onmessage?.({ data: { id, error } } as MessageEvent<FabriksDecodeWorkerResponse>);
  }
  crash(message = "crashed") {
    this.onerror?.({ message } as ErrorEvent);
  }
}

const spanBytes = new Uint8Array([1, 2, 3]);
/** Never decoded: the fake worker answers without looking at it. */
const request = (): FabriksDecodeRequest => ({ path: "p", spanBytes }) as unknown as FabriksDecodeRequest;
const noDecoder = async () => null;

const pool = (workerCount: number, maxInFlightPerWorker: number) => {
  const workers: FakeWorker[] = [];
  const dispatcher = createWorkerFabriksDecodeDispatcher({
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

describe("fabriks decode dispatcher scheduling", () => {
  it("prefers an idle worker and queues once every worker is busy (cap 1)", () => {
    const { workers, dispatcher } = pool(2, 1);
    for (let i = 0; i < 4; i++) fire(dispatcher.decode(request(), noDecoder));
    expect(workers).toHaveLength(2);
    expect(workers[0].open).toEqual([1]);
    expect(workers[1].open).toEqual([2]);

    // Whichever worker finishes first takes the oldest queued job — the
    // round-robin bug was posting job 3 to worker 0 while it was still busy.
    workers[1].respond(2);
    expect(workers[1].open).toEqual([3]);
    expect(workers[0].open).toEqual([1]);
    workers[1].respond(3);
    expect(workers[1].open).toEqual([4]);
    dispatcher.dispose();
  });

  it("posts the request unchanged and without a transfer list (spanBytes stays owned by the cache)", () => {
    const { workers, dispatcher } = pool(1, 1);
    const req = request();
    fire(dispatcher.decode(req, noDecoder));
    const [{ message, transfer }] = workers[0].posted;
    expect(message).toEqual({ id: 1, request: req });
    expect(message.request.spanBytes).toBe(spanBytes);
    expect(transfer).toBeUndefined();
    expect(spanBytes.byteLength).toBe(3); // not detached
    dispatcher.dispose();
  });

  it("drops a queued job when its signal aborts, without posting it", async () => {
    const { workers, dispatcher } = pool(1, 1);
    fire(dispatcher.decode(request(), noDecoder));
    const controller = new AbortController();
    const queued = settled(dispatcher.decode(request(), noDecoder, { signal: controller.signal }));
    const behind = settled(dispatcher.decode(request(), noDecoder));

    controller.abort();
    await tick();
    expect(queued.status).toBe("rejected");
    expect((queued.error as Error).name).toBe("AbortError");

    workers[0].respond(1);
    expect(workers[0].posted.map(({ message }) => message.id)).toEqual([1, 3]);
    expect(behind.status).toBe("pending");
    dispatcher.dispose();
  });

  it("rejects an already-aborted job immediately", async () => {
    const { workers, dispatcher } = pool(1, 1);
    const controller = new AbortController();
    controller.abort();
    await expect(
      dispatcher.decode(request(), noDecoder, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(workers).toHaveLength(0);
    dispatcher.dispose();
  });

  it("resolves and rejects per job, freeing the slot either way", async () => {
    const { workers, dispatcher } = pool(1, 1);
    const ok = settled(dispatcher.decode(request(), noDecoder));
    const bad = settled(dispatcher.decode(request(), noDecoder));
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
    const inFlight = settled(dispatcher.decode(request(), noDecoder));
    const queued = settled(dispatcher.decode(request(), noDecoder));
    workers[0].crash();
    await tick();
    expect(inFlight.status).toBe("rejected");
    expect(queued.status).toBe("pending");
    // The queued job went out once the crash cleared the slot.
    expect(workers[0].posted.map(({ message }) => message.id)).toEqual([1, 2]);
    dispatcher.dispose();
  });

  it("dispose rejects in-flight and queued jobs and terminates every worker", async () => {
    const { workers, dispatcher } = pool(2, 1);
    const inFlight = settled(dispatcher.decode(request(), noDecoder));
    fire(dispatcher.decode(request(), noDecoder));
    const queued = settled(dispatcher.decode(request(), noDecoder));
    dispatcher.dispose();
    await tick();
    expect(inFlight.status).toBe("rejected");
    expect(queued.status).toBe("rejected");
    expect(workers.every((worker) => worker.terminated)).toBe(true);
    await expect(dispatcher.decode(request(), noDecoder)).rejects.toThrow(/disposed/);
  });

  it("falls back to inline decode when no worker can be spawned", async () => {
    const dispatcher = createWorkerFabriksDecodeDispatcher({
      spawn: () => {
        throw new Error("no Worker here");
      },
    });
    // The inline path runs the real decoder, which rejects a bogus request —
    // the point is that it was attempted inline rather than posted or hung.
    await expect(dispatcher.decode(request(), noDecoder)).rejects.toThrow();
    dispatcher.dispose();
  });
});
