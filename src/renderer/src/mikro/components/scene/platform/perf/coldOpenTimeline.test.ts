import { describe, expect, it } from "vitest";
import { ColdOpenTimeline } from "./coldOpenTimeline";

/** Fake clock so the assertions are exact rather than timing-dependent. */
const fakeClock = () => {
  const state = { t: 0 };
  return {
    advance: (ms: number) => {
      state.t += ms;
    },
    now: () => state.t,
  };
};

describe("ColdOpenTimeline", () => {
  it("records phases as offsets from begin(), not absolute time", () => {
    const clock = fakeClock();
    const timeline = new ColdOpenTimeline(clock.now);

    // Warmup work happens before the session opens — the origin must be
    // begin(), not process start.
    clock.advance(5000);
    timeline.begin("scene-1");
    clock.advance(120);
    timeline.stamp("sceneQuery");
    clock.advance(80);
    timeline.stamp("credentials");

    const report = timeline.buildReport();
    expect(report.sceneId).toBe("scene-1");
    expect(report.stamps.sceneQuery).toBe(120);
    expect(report.stamps.credentials).toBe(200);
  });

  it("deltas attribute time to the phase that consumed it", () => {
    const clock = fakeClock();
    const timeline = new ColdOpenTimeline(clock.now);
    timeline.begin();

    clock.advance(100);
    timeline.stamp("sceneQuery");
    clock.advance(300);
    timeline.stamp("credentials");
    clock.advance(50);
    timeline.stamp("arraysOpen");

    const { deltas } = timeline.buildReport();
    expect(deltas.sceneQuery).toBe(100);
    // The point of the whole module: 300 ms went to credentials specifically.
    expect(deltas.credentials).toBe(300);
    expect(deltas.arraysOpen).toBe(50);
  });

  it("keeps the FIRST stamp — call sites that fire per pool/brick need no guard", () => {
    const clock = fakeClock();
    const timeline = new ColdOpenTimeline(clock.now);
    timeline.begin();

    clock.advance(10);
    timeline.stamp("firstBrickUploaded");
    clock.advance(500);
    timeline.stamp("firstBrickUploaded");

    expect(timeline.buildReport().stamps.firstBrickUploaded).toBe(10);
  });

  it("drops stamps that arrive before begin() rather than starting a session", () => {
    const clock = fakeClock();
    const timeline = new ColdOpenTimeline(clock.now);

    timeline.stamp("credentials");
    expect(timeline.isActive()).toBe(false);
    expect(timeline.buildReport().stamps).toEqual({});
    expect(timeline.buildReport().timeToFirstVoxelMs).toBeNull();
  });

  it("collapses absent phases instead of reporting them as zero", () => {
    const clock = fakeClock();
    const timeline = new ColdOpenTimeline(clock.now);
    timeline.begin();

    clock.advance(100);
    timeline.stamp("sceneQuery");
    // credentials/storeMetadata/arraysOpen never fire (e.g. a cached scope).
    clock.advance(400);
    timeline.stamp("canvasMount");

    const report = timeline.buildReport();
    expect(report.stamps.credentials).toBeUndefined();
    expect(report.deltas.canvasMount).toBe(400);
  });

  it("orders the report by phase order, not arrival order", () => {
    const clock = fakeClock();
    const timeline = new ColdOpenTimeline(clock.now);
    timeline.begin();

    // A pool created before the canvas mounts is exactly what Phase 2 causes —
    // the report must show it in canonical order so the inversion is visible.
    clock.advance(10);
    timeline.stamp("poolCreated");
    clock.advance(10);
    timeline.stamp("canvasMount");

    expect(Object.keys(timeline.buildReport().stamps)).toEqual([
      "canvasMount",
      "poolCreated",
    ]);
  });

  it("surfaces time-to-first-voxel only once a brick actually landed", () => {
    const clock = fakeClock();
    const timeline = new ColdOpenTimeline(clock.now);
    timeline.begin();

    clock.advance(250);
    timeline.stamp("firstBrickRequested");
    expect(timeline.buildReport().timeToFirstVoxelMs).toBeNull();

    clock.advance(400);
    timeline.stamp("firstBrickUploaded");
    expect(timeline.buildReport().timeToFirstVoxelMs).toBe(650);
  });

  it("begin() discards the previous session", () => {
    const clock = fakeClock();
    const timeline = new ColdOpenTimeline(clock.now);

    timeline.begin("scene-1");
    clock.advance(100);
    timeline.stamp("sceneQuery");

    clock.advance(50);
    timeline.begin("scene-2");
    clock.advance(20);
    timeline.stamp("sceneQuery");

    const report = timeline.buildReport();
    expect(report.sceneId).toBe("scene-2");
    expect(report.stamps.sceneQuery).toBe(20);
  });
});
