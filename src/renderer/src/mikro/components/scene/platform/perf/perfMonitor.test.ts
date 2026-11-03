import { afterEach, describe, expect, it, vi } from "vitest";
import { perfMonitor } from "./perfMonitor";

afterEach(() => {
  perfMonitor.stopRecording();
});

/** A frame sample with sane defaults, so each test states only what it exercises. */
const frame = (over: Partial<Parameters<typeof perfMonitor.recordFrame>[0]> = {}) => ({
  framePeriodMs: 16,
  frameMainThreadMs: 4,
  renderCalls: 2,
  gpuMs: 1 as number | null,
  cameraMoving: false,
  ...over,
});

describe("perfMonitor gate (opt-in)", () => {
  it("is off by default and ignores all hooks until startRecording", () => {
    expect(perfMonitor.isRecording()).toBe(false);
    // None of these should capture anything.
    perfMonitor.countRender("LayerControlPanel");
    perfMonitor.markReplan();
    perfMonitor.markVisibilityRecompute();
    perfMonitor.markUpload(3, 1000);
    perfMonitor.recordFrame(frame());
    expect(perfMonitor.buildSessionReport()).toBeNull();
  });

  it("captures hooks only while recording, and stopping keeps the buffers", () => {
    perfMonitor.startRecording();
    perfMonitor.countRender("LayerControlPanel");
    perfMonitor.countRender("LayerControlPanel");
    perfMonitor.markReplan();
    perfMonitor.recordFrame(frame());
    perfMonitor.stopRecording();

    // Hooks after stop are ignored...
    perfMonitor.countRender("LayerControlPanel");
    perfMonitor.recordFrame(frame({ frameMainThreadMs: 99 }));

    const report = perfMonitor.buildSessionReport();
    expect(report).not.toBeNull();
    expect(report!.frameCount).toBe(1);
    expect(report!.renderCounts.LayerControlPanel).toBe(2);
    expect(report!.replans).toBe(1);
  });

  it("startRecording clears the previous session", () => {
    perfMonitor.startRecording();
    perfMonitor.recordFrame(frame({ gpuMs: null }));
    perfMonitor.startRecording(); // fresh
    expect(perfMonitor.buildSessionReport()).toBeNull();
  });
});

describe("perfMonitor aggregation", () => {
  it("separates main-thread from GPU and counts jank + moving frames", () => {
    perfMonitor.startRecording();
    perfMonitor.recordFrame(frame({ frameMainThreadMs: 10, gpuMs: 2, cameraMoving: true }));
    // Jank on the main thread but a cheap GPU frame — the signal the split exists for.
    perfMonitor.recordFrame(frame({ frameMainThreadMs: 80, gpuMs: 3, cameraMoving: true }));
    perfMonitor.recordFrame(frame({ frameMainThreadMs: 12, gpuMs: null }));
    const report = perfMonitor.buildSessionReport()!;

    expect(report.frameCount).toBe(3);
    expect(report.jankFrames).toBe(1); // the 80ms frame
    expect(report.movingFrames).toBe(2);
    expect(report.cpuMs.max).toBe(80);
    expect(report.cpuMs.min).toBe(10);
    // GPU stats only over the 2 non-null samples — proves the stall was CPU.
    expect(report.gpuMs).not.toBeNull();
    expect(report.gpuMs!.samples).toBe(2);
    expect(report.gpuMs!.max).toBe(3);
  });

  it("keeps the frame PERIOD separate from main-thread cost", () => {
    // The regression this guards: reporting the rAF period as `frameCpuMs` made
    // cpuMs.avg exactly 1000/fps, so it could never disagree with the framerate
    // and never located a bottleneck.
    perfMonitor.startRecording();
    perfMonitor.recordFrame(frame({ framePeriodMs: 100, frameMainThreadMs: 5 }));
    perfMonitor.recordFrame(frame({ framePeriodMs: 100, frameMainThreadMs: 5 }));
    const report = perfMonitor.buildSessionReport()!;

    expect(report.periodMs.avg).toBe(100);
    expect(report.cpuMs.avg).toBe(5);
    // A 100ms period is an idle gap on a demand frameloop, not jank.
    expect(report.jankFrames).toBe(0);
  });

  it("reports renderCalls so a double render cannot hide as low fps", () => {
    perfMonitor.startRecording();
    perfMonitor.recordFrame(frame({ renderCalls: 2 }));
    perfMonitor.recordFrame(frame({ renderCalls: 3 })); // probe rendered too
    const report = perfMonitor.buildSessionReport()!;

    expect(report.renderCalls.min).toBe(2);
    expect(report.renderCalls.max).toBe(3);
    expect(report.renderCalls.avg).toBe(2.5);
  });

  it("attributes accumulated uploads to the next frame", () => {
    perfMonitor.startRecording();
    perfMonitor.markUpload(2, 500);
    perfMonitor.markUpload(1, 250);
    perfMonitor.recordFrame(frame());
    const report = perfMonitor.buildSessionReport()!;
    expect(report.bricksUploaded).toBe(3);
    expect(report.bytesUploaded).toBe(750);
  });

  it("attributes drain time, pump slices and page-flush bytes to the next frame", () => {
    // The frame bracket cannot see the pump: it runs between frames. The
    // drain reports itself, in-frame and off-frame alike.
    perfMonitor.startRecording();
    perfMonitor.markDrain(3, { offFrame: false, pageFlushBytes: 4096 });
    perfMonitor.markDrain(1.5, { offFrame: true, pageFlushBytes: 0 });
    perfMonitor.markDrain(2.5, { offFrame: true, pageFlushBytes: 0 });
    perfMonitor.recordFrame(frame());
    perfMonitor.markDrain(1, { offFrame: true, pageFlushBytes: 0 });
    perfMonitor.recordFrame(frame());
    const report = perfMonitor.buildSessionReport()!;
    expect(report.drainMs.total).toBe(8);
    expect(report.drainMs.offFrame).toBe(5);
    expect(report.drainMs.offFrameSlices).toBe(3);
    expect(report.drainMs.offFrameMaxMs).toBe(2.5);
    expect(report.pageFlushBytes).toBe(4096);
  });

  it("ignores drain marks while not recording", () => {
    perfMonitor.markDrain(50, { offFrame: true, pageFlushBytes: 1 });
    perfMonitor.startRecording();
    perfMonitor.recordFrame(frame());
    const report = perfMonitor.buildSessionReport()!;
    expect(report.drainMs.total).toBe(0);
    expect(report.drainMs.offFrameMaxMs).toBe(0);
    expect(report.pageFlushBytes).toBe(0);
  });

  it("reports gpuMs as null when no timer-query samples were available", () => {
    perfMonitor.startRecording();
    perfMonitor.recordFrame(frame({ gpuMs: null }));
    perfMonitor.recordFrame(frame({ gpuMs: null }));
    expect(perfMonitor.buildSessionReport()!.gpuMs).toBeNull();
  });
});

describe("perfMonitor long-frame attribution", () => {
  /** A controllable clock: `at(ms)` moves performance.now() to session ms. */
  const clock = () => {
    let t = 1000;
    const spy = vi.spyOn(performance, "now").mockImplementation(() => t);
    return {
      at: (sessionMs: number) => {
        t = 1000 + sessionMs;
      },
      restore: () => spy.mockRestore(),
    };
  };

  it("reports a missed frame with the events and LoAF entries inside its window", () => {
    const c = clock();
    try {
      c.at(0);
      perfMonitor.startRecording();
      c.at(16);
      perfMonitor.recordFrame(frame({ framePeriodMs: 16, frameMainThreadMs: 1 }));
      // Inside the long frame's window (it ends at 216, started at 216-1-180=35).
      c.at(40);
      perfMonitor.markEvent("camera:settled");
      c.at(41);
      perfMonitor.markEvent("replan", { ms: 3 });
      // A long animation frame that started before the window and runs into it.
      perfMonitor.setLongAnimationFrameSupported(true);
      perfMonitor.addLongAnimationFrame({
        startTime: 1000 + 20,
        durationMs: 120,
        blockingMs: 70,
        scripts: [{ invoker: "TimerHandler:setTimeout", sourceFunctionName: "emit", sourceURL: "/x.ts", durationMs: 110 }],
      });
      // One outside it (after the frame ended).
      c.at(300);
      perfMonitor.markEvent("gesture:begin");
      c.at(216);
      perfMonitor.recordFrame(frame({ framePeriodMs: 180, frameMainThreadMs: 1 }));

      const report = perfMonitor.buildSessionReport()!;
      expect(report.longFrames).toHaveLength(1);
      const [long] = report.longFrames;
      expect(long.periodMs).toBe(180);
      expect(long.events.map((e) => e.name)).toEqual(["camera:settled", "replan"]);
      expect(long.loaf).toHaveLength(1);
      expect(long.loaf[0].scripts[0].sourceFunctionName).toBe("emit");
      expect(report.longAnimationFrames).toEqual({ count: 1, totalMs: 120, maxMs: 120 });
      expect(report.events.replan).toEqual({ count: 1, totalMs: 3, maxMs: 3 });
    } finally {
      c.restore();
    }
  });

  it("a missed frame with no long animation frame reads as GPU-side (empty loaf)", () => {
    perfMonitor.startRecording();
    perfMonitor.setLongAnimationFrameSupported(true);
    perfMonitor.recordFrame(frame({ framePeriodMs: 120 }));
    const report = perfMonitor.buildSessionReport()!;
    expect(report.longFrames).toHaveLength(1);
    expect(report.longFrames[0].loaf).toEqual([]);
  });

  it("totals React commits per profiler id and timelines only the >= 1 ms ones", () => {
    perfMonitor.startRecording();
    perfMonitor.markCommit("scene-canvas", "update", 0.4);
    perfMonitor.markCommit("scene-canvas", "update", 6);
    perfMonitor.recordFrame(frame());
    const report = perfMonitor.buildSessionReport()!;
    expect(report.reactCommits["scene-canvas"]).toEqual({ count: 2, totalMs: 6.4, maxMs: 6 });
    expect(report.events["react:scene-canvas"]).toEqual({ count: 1, totalMs: 6, maxMs: 6 });
  });

  it("spans are free and silent while not recording", () => {
    const started = perfMonitor.spanStart();
    expect(Number.isNaN(started)).toBe(true);
    perfMonitor.markSpan("replan", started);
    perfMonitor.startRecording();
    perfMonitor.recordFrame(frame());
    expect(perfMonitor.buildSessionReport()!.events).toEqual({});
  });

  it("startRecording resets the probe, pointer and volume-frame accumulators", () => {
    perfMonitor.startRecording();
    perfMonitor.markProbe();
    perfMonitor.addProbeMs(5);
    perfMonitor.addPointerMoveMs(2);
    perfMonitor.markVolumeFrame("cached");
    perfMonitor.startRecording();
    perfMonitor.recordFrame(frame());
    const report = perfMonitor.buildSessionReport()!;
    expect(report.probeMs).toBeNull();
    expect(report.pointerMoveMs).toBeNull();
    expect(report.volumeFrames).toEqual({});
    expect(report.longAnimationFrames).toBeNull();
  });
});
