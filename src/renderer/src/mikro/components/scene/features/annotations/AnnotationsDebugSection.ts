import { useBrickStoreApi } from "../bricks/store/brickSlice";
import { runGpuSkeletonSelfTest } from "./enhancers/shared/gpu/computeSkeletonSelfTest";

/**
 * The annotation enhancers' debug-panel entry (`shell/debugRegistry.ts`): the
 * GPU skeleton self-test. It runs against the brick system's renderer (the
 * allowed `annotations -> bricks` edge), so its button sits in the brick
 * section's self-test row. Shape matches `features/debug/debugSection.ts`
 * structurally; the registry's `Record` checks it.
 */
const useAnnotationsDebugContribution = () => {
  const api = useBrickStoreApi();
  return {
    selfTests: [
      {
        id: "annotations.skeleton",
        label: "skeleton self-test",
        title: "Extract a synthetic skeleton on GPU and CPU; compare distance fields.",
        run: (report: (line: string) => void) => {
          const manager = api.getState().brickSystem;
          if (!manager) return;
          report("skeleton: running…");
          const renderer = manager.getRenderer();
          if (!renderer) return;
          void runGpuSkeletonSelfTest(renderer).then((result) => {
            report(
              `skeleton: ${result.supported ? (result.pass ? "PASS" : "FAIL") : "n/a"} — ${result.detail}`,
            );
          });
        },
      },
    ],
  };
};

export const ANNOTATIONS_DEBUG_SECTION = {
  useContribution: useAnnotationsDebugContribution,
};
