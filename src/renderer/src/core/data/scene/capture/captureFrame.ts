import * as THREE from "three";
import { hideExcludedFromCapture } from "./captureVisibility";
import { gpuPixelsToImageBytes } from "./pixelBuffer";

/**
 * Minimal subset of three's WebGPURenderer we call for a screenshot. Typed
 * locally because R3F types `gl` as WebGLRenderer, whereas the scene's `gl`
 * factory returns a WebGPURenderer (see `createWebGPURenderer.ts`).
 */
export interface CaptureRenderer {
  getPixelRatio: () => number;
  outputColorSpace?: THREE.ColorSpace;
  getRenderTarget: () => THREE.RenderTarget | null;
  setRenderTarget: (target: THREE.RenderTarget | null) => void;
  render: (scene: THREE.Object3D, camera: THREE.Camera) => void;
  readRenderTargetPixelsAsync: (
    target: THREE.RenderTarget,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => Promise<Uint8Array>;
}

/**
 * Render the scene offscreen at an explicit size and encode it as a PNG.
 *
 * Offscreen rather than reading the live canvas: the scene renders on demand
 * with no `preserveDrawingBuffer`, so the canvas can be blank at click time.
 * The size being a parameter is the point — capture resolution stays decoupled
 * from the viewport, which is what an offline animation export (fixed output
 * size, whatever the window happens to be) needs from this.
 *
 * Viewport furniture is left out: objects tagged `EXCLUDE_FROM_CAPTURE` (the
 * origin crosshair) are hidden for the pass. HTML overlays and the gizmo were
 * never in `scene` to begin with.
 *
 * Volume compositor interplay (mikro): the compositor's composite quad is
 * EXCLUDE_FROM_CAPTURE-tagged and its visibility toggling happens only inside
 * its frame callback, so at capture time the volume meshes are visible and
 * the quad is not — the capture re-raymarches the volumes live at the capture
 * resolution, exactly like the pre-compositor path.
 *
 * Callers must repaint afterwards: the offscreen pass leaves the renderer's
 * target restored but the live frame clobbered.
 */
export const captureFrameBlob = async (
  gl: CaptureRenderer,
  scene: THREE.Object3D,
  camera: THREE.Camera,
  width: number,
  height: number,
): Promise<Blob | null> => {
  // Rendering to a target skips the renderer's output color-space conversion
  // (only the canvas gets it), so tag the target texture with the renderer's
  // output space — otherwise the PNG comes out darker than the on-screen view.
  const target = new THREE.RenderTarget(width, height);
  target.texture.colorSpace = gl.outputColorSpace ?? THREE.SRGBColorSpace;
  const prev = gl.getRenderTarget();
  const restoreVisibility = hideExcludedFromCapture(scene);
  let buf: Uint8Array;
  try {
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    // Returns the pixel buffer (no out-param); bottom-up, RGBA8, and with rows
    // padded to WebGPU's 256-byte alignment — see ./pixelBuffer.
    buf = await gl.readRenderTargetPixelsAsync(target, 0, 0, width, height);
  } finally {
    restoreVisibility();
    gl.setRenderTarget(prev);
    target.dispose();
  }

  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.putImageData(
    new ImageData(gpuPixelsToImageBytes(buf, width, height), width, height),
    0,
    0,
  );

  return await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/png"));
};
