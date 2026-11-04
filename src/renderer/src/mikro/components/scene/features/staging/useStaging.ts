import { useCallback, useMemo } from "react";

import type { PreviewLayerInput } from "@/mikro/api/graphql";
import { useMikro } from "@/mikro/api/funcs";
import {
  fetchPreviewLayer,
  keepPreviewLayer,
  meshPreviewInput,
  previewInputOf,
} from "@/mikro/forms/addLayer/previewLayer";
import { planLensLayer } from "@/mikro/forms/addLayer/stageLens";
import { useLensRegistry } from "@/mikro/lib/lenses/useLensRegistry";

import {
  stagedKeyOf,
  useStagedLayersStoreApi,
  type StagedLayer,
} from "../../platform/float/stagedLayerStore";
import { useSceneStoreApi } from "../../platform/stores/sceneStore";

/** What staging a lens came to. */
export type StageResult =
  | { status: "staged"; key: string }
  /** The scene already draws it, saved or staged. */
  | { status: "present"; label: string }
  /** The world does not reach it, or nothing here would draw it. */
  | { status: "unplaceable" };

/** What a staged layer is made from: an array lens (through the Add Layer engine) or a mesh lens. */
export type StageSource = { kind: "array" | "mesh"; lens: string; label?: string };

/**
 * Stage, keep and discard the scene's temporary layers
 * (`platform/float/stagedLayerStore`).
 *
 * Staging asks the Add Layer engine what it would add for the lens — its own
 * pick and defaults, with the staged layers counted beside the saved ones (the
 * next channel colour, "already drawn") — and then asks the server for that
 * layer built and not saved (`previewLayer`). Keeping sends the same input to
 * the create. Every call REJECTS on failure; the caller reports it.
 */
export const useStaging = () => {
  const client = useMikro();
  const registry = useLensRegistry();
  const stagedApi = useStagedLayersStoreApi();
  const sceneApi = useSceneStoreApi();

  const stageInput = useCallback(
    async (owner: string, input: PreviewLayerInput, meta: { label: string; source: string; origin?: string }) => {
      const preview = await fetchPreviewLayer(client, input);
      const key = stagedKeyOf(input);
      const entry: StagedLayer = {
        key,
        owner,
        label: meta.label,
        input,
        layer: { ...preview.layer, id: key },
        engine: { ...preview.engine, id: key },
        source: meta.source,
        origin: meta.origin,
      };
      stagedApi.getState().stage(entry);
      return key;
    },
    [client, stagedApi],
  );

  const stage = useCallback(
    async (owner: string, source: StageSource, origin?: string): Promise<StageResult> => {
      const scene = sceneApi.getState().id;
      if (source.kind === "mesh") {
        const drawn = sceneApi
          .getState()
          .sceneLayers.some((layer) => "lens" in layer && (layer.lens as { id?: string } | null)?.id === source.lens);
        if (drawn) return { status: "present", label: source.label ?? "This surface" };
        const key = await stageInput(owner, meshPreviewInput({ scene, lens: source.lens }), {
          label: source.label ?? "Surface",
          source: source.lens,
          origin,
        });
        return { status: "staged", key };
      }
      const extraLayers = stagedApi.getState().entries.map((entry) => entry.engine);
      const plan = await planLensLayer(client, registry, { scene, lens: source.lens, extraLayers });
      if (plan.status !== "ready") return plan;
      const key = await stageInput(owner, previewInputOf(plan.request), {
        label: source.label ?? plan.label,
        source: source.lens,
        origin,
      });
      return { status: "staged", key };
    },
    [client, registry, sceneApi, stagedApi, stageInput],
  );

  /** Whether the scene draws a staged layer now: its own session visibility. */
  const visibleNow = useCallback(
    (key: string): boolean => {
      const { layers, sceneLayers } = sceneApi.getState();
      const state = layers.find((layer) => layer.id === key) ?? sceneLayers.find((layer) => layer.id === key);
      return state?.visible !== false;
    },
    [sceneApi],
  );

  const keep = useCallback(
    async (keys: readonly string[]) => {
      for (const key of keys) {
        const entry = stagedApi.getState().entries.find((candidate) => candidate.key === key);
        if (!entry || entry.keeping) continue;
        stagedApi.getState().setKeeping(key, true);
        try {
          // What the viewer changed while it was staged, in the create's own terms.
          // …and every write its card held while it was staged.
          await keepPreviewLayer(client, entry.input, { visible: visibleNow(key) }, entry.edits);
        } catch (error) {
          stagedApi.getState().setKeeping(key, false);
          throw error;
        }
        // The refetch has the saved layer by now (`awaitRefetchQueries`): drop
        // the staged one without the layer blinking out.
        stagedApi.getState().discard([key]);
      }
    },
    [client, stagedApi, visibleNow],
  );

  const discard = useCallback((keys: readonly string[]) => stagedApi.getState().discard(keys), [stagedApi]);

  return useMemo(() => ({ stage, keep, discard }), [stage, keep, discard]);
};
