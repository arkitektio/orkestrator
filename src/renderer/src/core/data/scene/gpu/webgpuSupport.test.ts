import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertWebGPUSupported,
  resetWebGPUSupportProbeForTests,
  WebGPUUnavailableError,
} from "./webgpuSupport";

/**
 * This gate is the only thing standing between a WebGPU-less machine and a
 * silently-degraded scene (three would swap in a WebGL2 backend the renderer no
 * longer carries upload paths for), so each rejection branch is pinned here.
 */

const originalGpu = Object.getOwnPropertyDescriptor(navigator, "gpu");

function stubGpu(value: unknown): void {
  Object.defineProperty(navigator, "gpu", {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  resetWebGPUSupportProbeForTests();
  if (originalGpu) Object.defineProperty(navigator, "gpu", originalGpu);
  else delete (navigator as unknown as { gpu?: unknown }).gpu;
});

describe("assertWebGPUSupported", () => {
  it("resolves when an adapter is available", async () => {
    stubGpu({ requestAdapter: async () => ({ name: "fake-adapter" }) });
    await expect(assertWebGPUSupported()).resolves.toBeUndefined();
  });

  it("rejects when navigator.gpu is missing, and says a restart is needed", async () => {
    stubGpu(undefined);
    await expect(assertWebGPUSupported()).rejects.toThrow(WebGPUUnavailableError);
    await expect(assertWebGPUSupported()).rejects.toThrow(/navigator\.gpu is missing/);
    await expect(assertWebGPUSupported()).rejects.toThrow(/full app restart/);
  });

  it("rejects when requestAdapter returns null, blaming the GPU/driver", async () => {
    stubGpu({ requestAdapter: async () => null });
    await expect(assertWebGPUSupported()).rejects.toThrow(
      /returned null — the GPU or driver rejected WebGPU/,
    );
  });

  it("rejects with the underlying message when requestAdapter throws", async () => {
    stubGpu({
      requestAdapter: async () => {
        throw new Error("adapter exploded");
      },
    });
    await expect(assertWebGPUSupported()).rejects.toThrow(
      /adapter request failed: adapter exploded/,
    );
  });

  it("probes once and memoizes — remounts must not re-request an adapter", async () => {
    const requestAdapter = vi.fn(async () => ({ name: "fake-adapter" }));
    stubGpu({ requestAdapter });
    await assertWebGPUSupported();
    await assertWebGPUSupported();
    await assertWebGPUSupported();
    expect(requestAdapter).toHaveBeenCalledTimes(1);
  });

  it("memoizes rejections too — an absent adapter does not appear mid-session", async () => {
    const requestAdapter = vi.fn(async () => null);
    stubGpu({ requestAdapter });
    await expect(assertWebGPUSupported()).rejects.toThrow(WebGPUUnavailableError);
    await expect(assertWebGPUSupported()).rejects.toThrow(WebGPUUnavailableError);
    expect(requestAdapter).toHaveBeenCalledTimes(1);
  });
});
