import { afterEach, describe, expect, it, vi } from "vitest";
import type { NetworkProbeResult, ProbeTarget } from "../../../../../main/doctor/protocol";
import { DOCTOR_MAX_TARGETS } from "../../../../../main/doctor/protocol";
import { HUB_FETCH_TIMEOUT_MS, fetchHubSafely, probeInBatches } from "./useConnectionDoctor";

const target = (index: number): ProbeTarget => ({ host: `h${index}.example`, ssl: true, label: `t${index}` });

describe("probeInBatches", () => {
  it("splits at main's per-call limit and keeps the order", async () => {
    const targets = Array.from({ length: DOCTOR_MAX_TARGETS * 2 + 3 }, (_, index) => target(index));
    const probeNetwork = vi.fn(async ({ targets: batch }: { targets: ProbeTarget[] }) =>
      batch.map((t) => ({ target: t }) as NetworkProbeResult),
    );

    const results = await probeInBatches(probeNetwork, targets);
    expect(probeNetwork).toHaveBeenCalledTimes(3);
    expect(probeNetwork.mock.calls.every(([request]) => request.targets.length <= DOCTOR_MAX_TARGETS)).toBe(true);
    expect(results.map((result) => result.target.host)).toEqual(targets.map((t) => t.host));
  });

  it("asks nothing for no targets", async () => {
    const probeNetwork = vi.fn();
    expect(await probeInBatches(probeNetwork, [])).toEqual([]);
    expect(probeNetwork).not.toHaveBeenCalled();
  });
});

describe("fetchHubSafely", () => {
  afterEach(() => vi.useRealTimers());

  const facts = { name: "lab-hub", online: true, version: "1", services: {} };

  it("tells every outcome apart", async () => {
    expect(await fetchHubSafely(undefined)).toEqual({ status: "not-available" });
    expect(await fetchHubSafely(async () => facts)).toEqual({ status: "ok", hub: facts });
    expect(await fetchHubSafely(async () => undefined)).toEqual({ status: "no-hub" });
    expect(await fetchHubSafely(async () => Promise.reject(new Error("502")))).toEqual({ status: "failed", message: "502" });
  });

  it("gives up after its timeout instead of holding the run", async () => {
    vi.useFakeTimers();
    const pending = fetchHubSafely(() => new Promise(() => {}));
    vi.advanceTimersByTime(HUB_FETCH_TIMEOUT_MS);
    expect(await pending).toEqual({ status: "timeout" });
  });
});
