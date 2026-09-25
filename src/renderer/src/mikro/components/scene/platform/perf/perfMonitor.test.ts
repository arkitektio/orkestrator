import { afterEach, describe, expect, it } from "vitest";
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

  it("reports gpuMs as null when no timer-query samples were available", () => {
    perfMonitor.startRecording();
    perfMonitor.recordFrame(frame({ gpuMs: null }));
    perfMonitor.recordFrame(frame({ gpuMs: null }));
    expect(perfMonitor.buildSessionReport()!.gpuMs).toBeNull();
  });
});
