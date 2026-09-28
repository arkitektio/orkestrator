import { WebGPURenderer } from "three/webgpu";

/**
 * The one way to stand up a three.js WebGPU renderer for an r3f `<Canvas>`.
 *
 * Promoted out of mikro's `SceneViewport` because every line here is a workaround
 * that is easy to lose and silent when lost, and elektro's experiment timeline
 * needs the same renderer. Pass it as the Canvas' `gl` prop:
 *
 *     <Canvas gl={createWebGPURendererFactory({ label: "scene" })} />
 *
 * Callers gate on `assertWebGPUSupported()` BEFORE the Canvas mounts; the
 * tripwire at the end of this factory is a guard against a three upgrade, not a
 * user-facing path.
 */
export type WebGPURendererFactoryOptions = {
  /** Prefix for the console line and the tripwire message. */
  label: string;
  /** Runs once the device is live — e.g. a cold-open timeline stamp. */
  onInitialized?: (renderer: WebGPURenderer) => void;
  /**
   * The device was lost (driver reset, GPU switch, sleep/wake) — NOT fired for
   * our own `dispose()`, whose loss reason is `destroyed`. three's default only
   * logs and makes every later `render()` a silent no-op, so a caller that
   * does nothing here shows a frozen frame. The fix is a new device: remount
   * the Canvas.
   */
  onDeviceLost?: (info: DeviceLostInfo) => void;
};

export type DeviceLostInfo = { message: string; reason: string | null };

/** Uncaptured GPU errors logged per renderer before going quiet: a broken
 *  pipeline reports once per draw, and 60 identical lines a second bury the
 *  first — which is the one that names the cause. */
const MAX_LOGGED_GPU_ERRORS = 10;

export const createWebGPURendererFactory =
  ({ label, onInitialized, onDeviceLost }: WebGPURendererFactoryOptions) =>
  async (props: unknown): Promise<WebGPURenderer> => {
    const renderer = new WebGPURenderer({
      ...(props as Record<string, unknown>),
      // No MSAA. In mikro the dominant pixel cost is a full-screen raymarch with
      // no geometric edges, where MSAA is pure bandwidth; in elektro the geometry
      // is Line2 fat lines, which are screen-space quads with their own edge AA.
      // Either way it would buy nothing and cost 4× on every DPR switch.
      antialias: false,
      // GPU frame timing. Constructing with the flag on is required so init()
      // can validate feature support; it is switched OFF again right after.
      trackTimestamp: true,
    });

    // three has no forceWebGPU, and WebGPURenderer's constructor unconditionally
    // overwrites `parameters.getFallback` with its own WebGL2 closure, so a
    // caller-supplied one is discarded. Nulling the private field the base
    // Renderer read it into is the only lever: init() then rejects instead of
    // silently swapping in a WebGL2 backend. Re-verify on any three upgrade.
    (renderer as unknown as { _getFallback: unknown })._getFallback = null;

    await renderer.init();

    // Timestamp writes land in a 2048-slot query pool that ONLY a
    // resolveTimestampsAsync call drains. Nobody resolves outside a perf
    // recording, so leaving the flag on floods the pool ("Maximum number of
    // queries exceeded"). Park it off and remember whether the device supports
    // it; a perf probe may flip it back on for a recording's lifetime.
    const tsBackend = (
      renderer as unknown as {
        backend?: { trackTimestamp?: boolean; __timestampQuerySupported?: boolean };
      }
    ).backend;
    if (tsBackend) {
      tsBackend.__timestampQuerySupported = tsBackend.trackTimestamp === true;
      tsBackend.trackTimestamp = false;
    }

    // Keep three's handler (it logs and latches `_isDeviceLost`), then tell
    // the caller.
    const lossRenderer = renderer as unknown as {
      onDeviceLost: (info: DeviceLostInfo) => void;
      _onDeviceLost: (info: DeviceLostInfo) => void;
    };
    lossRenderer.onDeviceLost = (info) => {
      lossRenderer._onDeviceLost(info);
      onDeviceLost?.({ message: info.message, reason: info.reason ?? null });
    };

    // WebGPU validation errors are ASYNC: they never throw out of `render()`,
    // so a try/catch around a pass cannot see them and, unhandled, they reach
    // the console only as a browser warning without our label.
    // (No @webgpu/types in this project: the device is typed structurally.)
    const device = (renderer as unknown as { backend?: { device?: EventTarget } }).backend?.device;
    if (device) {
      let logged = 0;
      device.addEventListener("uncapturederror", (event) => {
        if (logged >= MAX_LOGGED_GPU_ERRORS) return;
        logged += 1;
        const message =
          (event as Event & { error?: { message?: string } }).error?.message ?? String(event);
        console.error(
          `[${label}] uncaptured GPU error${logged === MAX_LOGGED_GPU_ERRORS ? " (further errors suppressed)" : ""}: ${message}`,
        );
      });
    }

    const anyRenderer = renderer as unknown as {
      backend?: { isWebGPUBackend?: boolean };
      capabilities?: { getMaxAnisotropy?: () => number };
      getMaxAnisotropy?: () => number;
    };

    // drei compat shim: several drei components read
    // `gl.capabilities.getMaxAnisotropy()`, which only exists on WebGLRenderer.
    if (!anyRenderer.capabilities) {
      anyRenderer.capabilities = {
        getMaxAnisotropy: () => anyRenderer.getMaxAnisotropy?.() ?? 1,
      };
    } else if (typeof anyRenderer.capabilities.getMaxAnisotropy !== "function") {
      anyRenderer.capabilities.getMaxAnisotropy = () =>
        anyRenderer.getMaxAnisotropy?.() ?? 1;
    }

    // Tripwire: if a three upgrade reintroduces a fallback route, fail loudly
    // rather than render something that lies about its backend. r3f
    // fire-and-forgets this promise, so this surfaces as an unhandled rejection.
    if (anyRenderer.backend?.isWebGPUBackend !== true) {
      throw new Error(
        `[${label}] WebGPURenderer initialized on a non-WebGPU backend — ` +
          "three's WebGL2 fallback should be unreachable.",
      );
    }

    console.info(`[${label}] renderer initialized — backend: WebGPU`);
    onInitialized?.(renderer);
    return renderer;
  };
