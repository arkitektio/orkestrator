import { describe, expect, it } from "vitest";

import { createSyncLiveWireDispatcher, createWorkerLiveWireDispatcher } from "./liveWireDispatcher";
import type { LiveWireJob } from "./liveWireJob";
import type { LiveWireWorkerRequest } from "./liveWire-worker";
import { DEFAULT_TRACE_WEIGHTS } from "./traceCost";

const job = (seed: [number, number, number] = [0, 0, 0]): LiveWireJob => ({
  values: new Float32Array(9).fill(1),
  size: [3, 3, 1],
  spacing: [1, 1, 1],
  weights: DEFAULT_TRACE_WEIGHTS,
  seed,
});

/** A worker that answers only when told to, so the tests own the timing. */
const fakeWorker = () => {
  const posted: LiveWireWorkerRequest[] = [];
  const worker = {
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null,
    postMessage: (message: LiveWireWorkerRequest) => posted.push(message),
    terminate: () => {},
  };
  const answer = (index: number) =>
    worker.onmessage?.({ data: { id: posted[index].id, cameFrom: new Int32Array(9) } } as MessageEvent);
  return { worker: worker as unknown as Worker, posted, answer };
};

describe("live-wire dispatcher", () => {
  it("grows the tree on the same thread when there is no worker", async () => {
    const tree = await createSyncLiveWireDispatcher().grow(job());
    expect(tree).not.toBeNull();
    expect(tree![0]).toBe(0); // the seed points at itself
    expect(tree![8]).not.toBe(-1);
  });

  it("lets the newest job displace one still waiting", async () => {
    const fake = fakeWorker();
    const dispatcher = createWorkerLiveWireDispatcher(() => fake.worker);
    const first = dispatcher.grow(job());
    const second = dispatcher.grow(job([1, 1, 0]));
    const third = dispatcher.grow(job([2, 2, 0]));

    // The first is running; the second was displaced before it was posted.
    expect(fake.posted).toHaveLength(1);
    await expect(second).resolves.toBeNull();

    fake.answer(0);
    await expect(first).resolves.toBeInstanceOf(Int32Array);
    expect(fake.posted).toHaveLength(2);
    expect(fake.posted[1].job.seed).toEqual([2, 2, 0]);
    fake.answer(1);
    await expect(third).resolves.toBeInstanceOf(Int32Array);
  });
});
