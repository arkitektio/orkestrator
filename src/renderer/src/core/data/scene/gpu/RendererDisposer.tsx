import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/** Renderers whose unmount scheduled a dispose that has not run yet. */
const pendingDispose = new WeakSet<object>();

/**
 * Frees the Canvas's WebGPU renderer — and with it the GPUDevice — on unmount.
 *
 * R3F v9's teardown calls `gl.renderLists?.dispose()` and
 * `gl.forceContextLoss?.()`, both WebGLRenderer-only, so nothing ever calls
 * `WebGPURenderer.dispose()`: the only path to `device.destroy()`. Without
 * this every Canvas open/close leaked a device until GC, along with the
 * DPR-sized framebuffer target, the pipeline cache and the timestamp pool.
 *
 * Mount it as a child of every `<Canvas gl={createWebGPURendererFactory(…)}>`.
 *
 * The dispose is deferred a microtask so it runs after every other in-canvas
 * cleanup of the same unmount (resources released against a live device), and
 * a synchronous re-mount against the same renderer cancels it — StrictMode's
 * dev double-invoke would otherwise destroy the renderer still in use.
 */
export const RendererDisposer = () => {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    pendingDispose.delete(gl);
    return () => {
      pendingDispose.add(gl);
      queueMicrotask(() => {
        if (pendingDispose.delete(gl)) (gl as unknown as { dispose(): void }).dispose();
      });
    };
  }, [gl]);
  return null;
};
