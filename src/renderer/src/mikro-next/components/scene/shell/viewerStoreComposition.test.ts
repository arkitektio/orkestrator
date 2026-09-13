import { describe, expect, it } from "vitest";
import { createBrickSlice } from "../features/bricks/store/brickSlice";
import { createMeshSlice } from "../features/meshes/store/meshSlice";
import { createViewerStore } from "../platform/stores/viewerStore";

/** Exactly what SceneProvider composes — that is what makes this a real check. */
const build = () =>
  createViewerStore(new Map(), [createBrickSlice, createMeshSlice]);

/**
 * The composed viewer store's shape, pinned.
 *
 * Lives in `shell/` because the shell is what composes the store: platform
 * contributes six slices, and the bricks and meshes features contribute their
 * own. Asserting the shape anywhere else would assert an incomplete store.
 *
 * This exists for the slice carve: a single 79-member object literal is being
 * replaced by a composition of eight slice functions, several of which live in
 * the features that own them. The failure mode that neither `pnpm typecheck`
 * nor any behavioural test would catch is a member quietly going missing —
 * `createStore<ViewerState>` is satisfied by a value cast somewhere, or a slice
 * simply is not registered in `SceneProvider`, and the field reads `undefined`
 * at runtime while every type still lines up.
 *
 * So: assert the exact key set. A rename, a drop, or an unregistered slice
 * fails here and names the member.
 */
const EXPECTED_KEYS = [
  "attributeSelection", "setHopColumns", "setHopEnabled", "setSparseLimit",
  "beginProbedAttributes", "brickSystem", "bumpMeshVersion", "bumpPoolsVersion",
  "bumpResidencyVersion", "canvas", "captureScreenshot", "clearProbedAttributes",
  "commitProbedAttributes", "currentZ", "debug", "dimSelections",
  "fitToLayer", "followAttributeReference", "frustumFar", "frustumNear",
  "getArrayForStoreId", "hasArrayForStoreId", "layerViewRanges", "lodBias",
  "markProbedInstances", "mergeAttributeRows", "mergeExactProbeValues", "meshSelection",
  "meshSystems", "meshVersion", "nodePlans", "poolsVersion",
  "probeLayerId", "probeMode", "probeReadout", "probeThreshold",
  "probedAttributes", "probedCoordinate", "register", "registerArrays",
  "registerBrickSystem", "registerCanvas", "registerCapture", "registerFollowAttributeReference",
  "registerMeshSystem", "registerVolumeCompositor", "renderBudget", "residencyVersion",
  "sampledBrandTarget", "setCurrentZ", "setDebug", "setDimSelection",
  "setLayerViewRanges", "setLodBias", "setMarkProbedInstances", "setMeshSelection",
  "setNodePlans", "setProbeLayerId", "setProbeMode", "setProbeReadout",
  "setProbeThreshold", "setProbedCoordinate", "setRenderBudget", "setSampledBrandTarget",
  "setShowLodReadout", "setShowScaleBar", "setShowScaleGrid", "setShowSceneAxis",
  "setUnplannableLayers", "setVisible", "setWorldUnitsPerPixel", "showLodReadout",
  "showScaleBar", "showScaleGrid", "showSceneAxis", "trackables",
  "unplannableLayers", "unregister", "viewSnapshot", "visibleLayers",
  "volumeCompositorReport", "volumeInputs", "worldUnitsPerPixel",] as const;

describe("viewerStore shape", () => {
  it("exposes exactly the expected members", () => {
    const keys = Object.keys(build().getState()).sort();
    expect(keys).toEqual([...EXPECTED_KEYS].sort());
  });

  it("keeps every action callable and every value field defined", () => {
    const state = build().getState() as Record<string, unknown>;
    // Split by convention rather than listing both sets twice: an action is a
    // function, and nothing here is legitimately `undefined` at rest — a slice
    // that failed to register would show up as exactly that.
    const undefinedMembers = EXPECTED_KEYS.filter((k) => state[k] === undefined);
    expect(undefinedMembers).toEqual([]);
  });
});
