import { useEffect } from "react";
import { toast } from "sonner";
import { useLayerWorldBoxGetter, useSceneHostLayers, useSceneWorld } from "../../scene/sceneHost";
import { toSessionLayer, useStartRegistration } from "../hooks/useRegistrationSession";
import { useRegistration, useRegistrationApi } from "../store/context";
import { reconcileSession } from "../store/sessionReconcile";

/**
 * Keeps the session in step with the scene: folds the draft when the saved
 * edge arrives, follows membership changes, ends when the layer goes away, and
 * starts a pending session once a freshly seeded layer becomes placeable.
 *
 * Mounted in the canvas slot rather than the sidebar because it must be alive
 * for the whole session, and a sidebar tab is unmounted while another tab is
 * showing. The decision itself is `reconcileSession` (pure, tested).
 */
export const SessionWatcher = () => {
  const api = useRegistrationApi();
  const layers = useSceneHostLayers();
  const world = useSceneWorld();
  const session = useRegistration((state) => state.session);
  const pendingLayerId = useRegistration((state) => state.pendingLayerId);
  const start = useStartRegistration();
  const getBox = useLayerWorldBoxGetter();

  useEffect(() => {
    const action = reconcileSession({
      session,
      pendingLayerId,
      layers: layers.map(toSessionLayer),
      worldId: world.id,
    });
    switch (action.type) {
      case "none":
        return;
      case "end":
        toast.info(action.reason);
        api.getState().end();
        return;
      case "members":
        api.getState().setMembers(action.memberLayerIds);
        return;
      case "rebase": {
        // Our own save landing is silent; anybody else's re-registration of the
        // edge under an unsaved draft deserves a word, since the draft is gone.
        const ours = session?.phase === "saving";
        const hadDraft = api.getState().undoStack.length > 0;
        api.getState().rebase(action);
        // By the time the host layers show the new edge state the scene store
        // already holds the new server placement, so this reads the new box.
        api.getState().setBaseBox(getBox([api.getState().session?.movingLayerId ?? ""]) ?? getBox(action.memberLayerIds));
        if (!ours && hadDraft) toast.info("This registration was changed elsewhere; your unsaved adjustment was dropped.");
        return;
      }
      case "begin":
        start(action.layerId);
        return;
    }
  }, [api, layers, world.id, session, pendingLayerId, start, getBox]);

  return null;
};
