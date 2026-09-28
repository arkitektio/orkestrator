import { useCallback, useMemo } from "react";
import {
  useLayerWorldBoxGetter,
  useSceneHostLayers,
  useSceneWorld,
  type SceneHostLayer,
} from "../../scene/sceneHost";
import {
  classifyPlacement,
  layersThroughEdge,
  type PlacementClassification,
  type RegistrationStepLike,
} from "../math/eligibility";
import { boxCenter } from "../math/fit";
import type { Vec3 } from "../math/mat4";
import { useRegistrationApi } from "../store/context";
import type { SessionLayer } from "../store/sessionReconcile";

/**
 * A host layer in the shape the pure session logic reads. The generated
 * fragment is structurally a `RegistrationStepLike[]`; the cast is here, once,
 * so neither the math nor the panels ever name a generated type.
 */
export const toSessionLayer = (layer: SceneHostLayer): SessionLayer => ({
  id: layer.id,
  placeable: layer.placeable,
  pathToWorld: layer.pathToWorld as unknown as readonly RegistrationStepLike[] | null | undefined,
  finalStep: layer.finalStep,
});

export type LayerVerdict = { layer: SceneHostLayer; verdict: PlacementClassification };

/** Every scene layer with whether — and why not — it can be registered interactively. */
export const useLayerVerdicts = (): LayerVerdict[] => {
  const layers = useSceneHostLayers();
  const world = useSceneWorld();
  return useMemo(
    () =>
      layers.map((layer) => ({
        layer,
        verdict: world.id
          ? classifyPlacement({
              pathToWorld: toSessionLayer(layer).pathToWorld,
              asAffine: layer.placeable ? {} : null,
              worldId: world.id,
            })
          : ({ status: "refused", reason: "This scene has no world coordinate system." } as const),
      })),
    [layers, world.id],
  );
};

/**
 * Begin a session on a layer's final edge. Returns the verdict so the caller
 * can route an `unregistered` layer to the seed flow and show a refusal.
 */
export const useStartRegistration = () => {
  const api = useRegistrationApi();
  const verdicts = useLayerVerdicts();
  const getBox = useLayerWorldBoxGetter();

  return useCallback(
    (layerId: string): PlacementClassification | null => {
      const entry = verdicts.find((candidate) => candidate.layer.id === layerId);
      if (!entry) return null;
      if (entry.verdict.status !== "editable") return entry.verdict;

      const sessionLayers = verdicts.map((candidate) => toSessionLayer(candidate.layer));
      const memberLayerIds = layersThroughEdge(sessionLayers, entry.verdict.edgeId).map((layer) => layer.id);
      const members = new Set(memberLayerIds);

      // Rotate and scale about the data's own middle by default — about the
      // world origin, a 2° turn of an image 50 mm away is a 1.7 mm swing.
      const box = getBox([layerId]) ?? getBox(memberLayerIds);
      const pivot: Vec3 = box ? boxCenter(box) : [0, 0, 0];

      const fixed = verdicts.find(
        (candidate) => !members.has(candidate.layer.id) && candidate.layer.placeable && candidate.layer.visible,
      );

      api.getState().begin(
        {
          edgeId: entry.verdict.edgeId,
          edgeVersion: entry.verdict.version,
          inverted: entry.verdict.inverted,
          movingLayerId: layerId,
          memberLayerIds,
        },
        { pivot, baseBox: box, fixedLayerId: fixed?.layer.id ?? null },
      );
      return entry.verdict;
    },
    [api, verdicts, getBox],
  );
};
