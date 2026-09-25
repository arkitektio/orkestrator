import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { captureFrameBlob, type CaptureRenderer } from "@/core/lib/scene/capture/captureFrame";
import { useViewerStore } from "../../platform/stores/viewerStore";

/**
 * Registers a `captureScreenshot()` callback in the viewer store so the HTML
 * SceneOverlay button (which lives outside <Canvas> and has no renderer handle)
 * can grab the current view as a PNG. Binds `captureFrameBlob` to the current
 * viewport size.
 *
 * Renders null; mounted inside <Canvas> next to <CanvasSync />.
 */
export const SceneScreenshot = () => {
  const registerCapture = useViewerStore((s) => s.registerCapture);
  const gl = useThree((s) => s.gl) as unknown as CaptureRenderer;
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const capture = async (): Promise<Blob | null> => {
      try {
        const dpr = gl.getPixelRatio?.() ?? 1;
        return await captureFrameBlob(
          gl,
          scene,
          camera,
          Math.max(1, Math.floor(size.width * dpr)),
          Math.max(1, Math.floor(size.height * dpr)),
        );
      } catch (error) {
        console.error("[scene] screenshot capture failed", error);
        return null;
      } finally {
        // The offscreen pass clobbered the live frame — repaint it.
        invalidate();
      }
    };

    registerCapture(capture);
    return () => registerCapture(null);
  }, [gl, scene, camera, size, invalidate, registerCapture]);

  return null;
};
