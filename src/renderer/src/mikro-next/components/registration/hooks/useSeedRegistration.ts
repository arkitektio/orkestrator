import { useCallback } from "react";
import { toast } from "sonner";
import { useDialog } from "@/app/dialog";
import { useSceneHostLayers, useSceneWorld } from "../../scene/sceneHost";
import { useRegistrationApi } from "../store/context";

/**
 * An UNREGISTERED layer has no placement, so there is nothing to preview an
 * adjustment against — and the scene does not draw it (null `asAffine` is not
 * drawn; that rule is not bent for this). So it is first given a real edge the
 * ordinary way: the Register form, with both ends locked — this layer's data
 * into this scene's world. The form refetches `GetScene` on success; the layer
 * comes back placeable, and the pending flag turns that into a session
 * (`SessionWatcher`). A freshly seeded identity edge is usually wildly off
 * (pixels into µm) — "Fit to reference" in the session panel is for that.
 */
export const useSeedRegistration = () => {
  const api = useRegistrationApi();
  const layers = useSceneHostLayers();
  const world = useSceneWorld();
  const { openDialog } = useDialog();

  return useCallback(
    (layerId: string) => {
      const layer = layers.find((candidate) => candidate.id === layerId);
      if (!layer?.data || !world.id) {
        toast.error("This layer does not say what data it shows, so it cannot be registered from here.");
        return;
      }
      const source =
        layer.data.kind === "arrayDataset"
          ? ({ kind: "arrayDataset", id: layer.data.id } as const)
          : layer.data.kind === "tableDataset"
            ? ({ kind: "tabledataset", id: layer.data.id } as const)
            : ({ kind: "coordinatesystem", id: layer.data.id } as const);
      api.getState().setPending(layerId);
      openDialog("register", { target: world.id, source }, { className: "max-w-3xl" });
    },
    [api, layers, world.id, openDialog],
  );
};
