import { useEffect } from 'react'
import { useModeStoreApi } from '../platform/stores/modeStore'
import { useSceneStoreApi } from '../platform/stores/sceneStore'
import { useViewStoreApi } from '../platform/stores/viewStore'
import { startVisibilityTracking } from '../platform/visibility/visibilityTracker'
import { startNodePlanTracking } from '../features/bricks/residency/nodePlanTracker'
import { useBrickStoreApi } from "../features/bricks/store/brickSlice";

/**
 * Mount point for the store-level scene managers: the visibility tracker
 * (camera → per-layer visible voxel ranges) and the octree node-plan tracker
 * (ranges + camera + mode → per-layer brick plans).
 * Holds no reactive state — the store APIs are stable — so this component
 * renders once and never again; all reactivity lives in the trackers'
 * subscriptions and the pure math in `platform/visibility/visibility.ts` /
 * `features/bricks/octree/nodePlanning.ts`.
 */
export function VisibilityManager() {
  const viewStore = useViewStoreApi()
  const viewerStore = useBrickStoreApi()
  const sceneStore = useSceneStoreApi()
  const modeStore = useModeStoreApi()

  useEffect(() => {
    // Start order is NOT load-bearing: the planner reads its camera from the
    // `viewSnapshot` the visibility tracker publishes atomically with the
    // ranges (viewerStore), so camera/box coherence is structural rather than
    // an artifact of which subscription was installed first.
    const stopVisibility = startVisibilityTracking({ viewStore, viewerStore, sceneStore })
    const stopNodePlans = startNodePlanTracking({ viewerStore, sceneStore, viewStore, modeStore })
    return () => {
      stopVisibility()
      stopNodePlans()
    }
  }, [viewStore, viewerStore, sceneStore, modeStore])

  return null
}
