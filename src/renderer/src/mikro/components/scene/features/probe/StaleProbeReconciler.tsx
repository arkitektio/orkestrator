import { useEffect } from "react";
import { effectiveProbeLayerId } from "../../platform/probe/probeTargeting";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";

/**
 * Reconciles a stale reading with a moved target. All NEW probes come from
 * the effective target (the brick layers gate on it), so a mismatch can only
 * mean the target shifted underneath an old reading — unpin, first layer
 * hidden, probed layer hidden — and one layer's values must not sit under
 * another layer's name. `probeAfterPinChange` cannot catch these: it has no
 * layer list, so it cannot compute the default target.
 *
 * Headless and mounted by the viewport: this used to live in the probe panel,
 * which is a sidebar tab now and unmounts while another tab is open — the
 * marker in the scene must not depend on which tab that is.
 */
export function StaleProbeReconciler() {
  // The SETTLED snapshot (P17), and SCALAR selectors — the id strings are all
  // the reconciliation needs.
  const probedLayerId = useViewerStore((s) =>
    // Mesh probes are owned by their mesh layer (never the image target).
    s.probeReadout && s.probeReadout.strategy !== "mesh" ? s.probeReadout.layerId : null,
  );
  const probeLayerId = useViewerStore((s) => s.probeLayerId);
  const setProbedCoordinate = useViewerStore((s) => s.setProbedCoordinate);
  const effectiveTargetId = useSceneStore((s) => effectiveProbeLayerId(probeLayerId, s.layers));
  const staleProbe =
    probedLayerId !== null && effectiveTargetId !== null && probedLayerId !== effectiveTargetId;

  useEffect(() => {
    if (staleProbe) setProbedCoordinate(null);
  }, [staleProbe, setProbedCoordinate]);

  return null;
}
