/**
 * WebGPU is a hard requirement for the scene.
 *
 * three 0.184's `WebGPURenderer` silently swaps in a WebGL2 backend when the
 * adapter cannot be acquired (`three.webgpu.js:58528`), and offers no
 * `forceWebGPU` option — its constructor clobbers any caller-supplied
 * `getFallback` (`three.webgpu.js:82651`). Worse, R3F v9 fire-and-forgets the
 * async `gl` factory (`react-three-fiber.esm.js:111`), so a throw from inside
 * it cannot drive any UI.
 *
 * Support is therefore gated HERE, before `<Canvas>` ever mounts — the one
 * place where a failure can still be rendered to the user.
 */

export class WebGPUUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebGPUUnavailableError";
  }
}

type NavigatorGPU = { gpu?: { requestAdapter: () => Promise<unknown | null> } };

let probe: Promise<void> | null = null;

async function probeWebGPU(): Promise<void> {
  const gpu = (navigator as unknown as NavigatorGPU).gpu;
  if (!gpu) {
    throw new WebGPUUnavailableError(
      "WebGPU is required but unavailable: navigator.gpu is missing. The " +
        "Chromium WebGPU switches are set in the main process — picking them " +
        "up needs a full app restart, not a window reload.",
    );
  }

  let adapter: unknown | null;
  try {
    adapter = await gpu.requestAdapter();
  } catch (error) {
    throw new WebGPUUnavailableError(
      "WebGPU is required but the adapter request failed: " +
        (error instanceof Error ? error.message : String(error)),
    );
  }

  if (!adapter) {
    throw new WebGPUUnavailableError(
      "WebGPU is required but no GPU adapter is available: navigator.gpu " +
        "exists, but requestAdapter() returned null — the GPU or driver " +
        "rejected WebGPU (a blocklisted driver, or a headless/software session).",
    );
  }
}

/**
 * Resolves iff WebGPU can be used; rejects with `WebGPUUnavailableError`.
 *
 * Memoized on the module: scene remounts and 2D/3D switches must not re-probe.
 * Rejections memoize too — an adapter that was absent at startup does not
 * appear mid-session.
 */
export function assertWebGPUSupported(): Promise<void> {
  probe ??= probeWebGPU();
  return probe;
}

/** Test seam: drops the memoized probe so a suite can vary `navigator.gpu`. */
export function resetWebGPUSupportProbeForTests(): void {
  probe = null;
}
