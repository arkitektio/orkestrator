import { useEffect, useState } from "react";
import { assertWebGPUSupported } from "@/lib/scene/gpu/webgpuSupport";

export type WebGPUGate = {
  phase: "checking" | "ready" | "unsupported";
  message: string | null;
};

/**
 * Whether the morphology canvas may mount. Checked before the Canvas exists:
 * R3F swallows errors from the async `gl` factory, so this is the one place an
 * unsupported GPU can still be shown (the scene's and the timeline's gate).
 */
export const useWebGPUGate = (): WebGPUGate => {
  const [gate, setGate] = useState<WebGPUGate>({ phase: "checking", message: null });
  useEffect(() => {
    let cancelled = false;
    assertWebGPUSupported().then(
      () => {
        if (!cancelled) setGate({ phase: "ready", message: null });
      },
      (error: Error) => {
        if (cancelled) return;
        setGate({
          phase: "unsupported",
          message: error?.message ?? "This viewer needs WebGPU, which is unavailable here.",
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return gate;
};
