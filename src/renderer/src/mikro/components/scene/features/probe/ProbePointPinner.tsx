import { useEffect } from "react";
import { selectionsFor } from "../../platform/model/worldSelections";

import { collectionSpatialAxes } from "../../platform/model/collectionPlacement";
import { probeAxisCoords } from "../../platform/probe/probeCoords";
import { createProbePinGate } from "../../platform/probe/probePinGate";
import { readInfoLayers } from "../../platform/probe/infoReadings";
import type { ProbePointLookup, ProbePointReading } from "../../platform/probe/probePoints";
import { effectiveInfoLayerIds, probeSystemIdFor } from "../../platform/probe/probeTargeting";
import type { ProbeResult } from "../../platform/probe/probeTypes";
import { useModeStoreApi } from "../../platform/stores/modeStore";
import { useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import { useBrickStoreApi } from "../bricks/store/brickSlice";

/**
 * Turns a click in PROBE mode (toolbar, or holding P) into a probe point.
 *
 * Headless, and the ONE place a probe becomes a point. The layers publish
 * their click probe on pointer DOWN — any button, before anyone knows whether
 * a drag follows — so pinning in the emitters would drop a point at the start
 * of every right-drag orbit. The emitters stay as they are; this feeds the
 * probes they publish and the window's pointer events to the gate that
 * decides (`platform/probe/probePinGate.ts`), and resolves what the point
 * keeps: the info layers' readings at the click and where each one's
 * attribute plans are asked.
 */
export function ProbePointPinner() {
  const viewerStore = useViewerStoreApi();
  const sceneStore = useSceneStoreApi();
  const modeStore = useModeStoreApi();
  const brickStore = useBrickStoreApi();

  useEffect(() => {
    /** Where the point's attribute plans are asked — resolved NOW, so the
     * collapsed dims are the ones on screen at the click. */
    const lookupFor = (probe: ProbeResult): ProbePointLookup | null => {
      const scene = sceneStore.getState();
      if (probe.strategy === "mesh") {
        const mesh = scene.sceneLayers.find((candidate) => candidate.id === probe.layerId);
        const collection = mesh?.__typename === "MeshLayer" ? mesh.collection : null;
        const instanceValue = probe.values[0]?.value;
        // No objectId yet: the layer re-publishes when it lands, and the
        // refresh fills the lookup in then.
        if (!collection || instanceValue == null) return null;
        // A store naming no slots has no coordinates to give: never a guessed order.
        const spatial = collectionSpatialAxes(collection);
        if (!spatial) return null;
        const coords: ProbePointLookup["coords"] = {};
        spatial.forEach((axis, slot) => {
          coords[axis] = probe.voxelIndex[slot];
        });
        return { systemId: collection.coordinateSystem.id, coords, instanceValue };
      }
      const layer = scene.layers.find((candidate) => candidate.id === probe.layerId);
      const systemId = layer ? probeSystemIdFor(layer) : null;
      if (!layer || !systemId) return null;
      return {
        systemId,
        coords: probeAxisCoords(layer, probe.voxelIndex, selectionsFor(viewerStore.getState(), layer.id)),
      };
    };

    /** The point in its layer's own dataset — what anchored metadata is
     * matched against; only brick-backed layers have a lens to name axes. */
    const coordsFor = (probe: ProbeResult) => {
      if (probe.strategy === "mesh") return null;
      const layer = sceneStore.getState().layers.find((candidate) => candidate.id === probe.layerId);
      return layer
        ? probeAxisCoords(layer, probe.voxelIndex, selectionsFor(viewerStore.getState(), layer.id))
        : null;
    };

    /** What the readout shows at the click: the info layers' readings
     * (`infoReadings.ts`), or a mesh pick itself — a pick measures the mesh. */
    const readingsFor = (probe: ProbeResult): ProbePointReading[] => {
      if (probe.strategy === "mesh") return [{ probe, lookup: lookupFor(probe) }];
      const bricks = brickStore.getState();
      const layers = sceneStore.getState().layers;
      return readInfoLayers(probe, {
        layers,
        infoIds: effectiveInfoLayerIds(viewerStore.getState(), layers),
        sampler: bricks.brickSystem,
        nodePlans: bricks.nodePlans,
      }).map((reading) => ({ probe: reading, lookup: lookupFor(reading) }));
    };

    const pin = (probe: ProbeResult) => {
      const flat = modeStore.getState().displayMode === "2D";
      viewerStore
        .getState()
        .pinProbePoint(
          probe,
          lookupFor(probe),
          flat ? viewerStore.getState().currentZ : null,
          coordsFor(probe),
          readingsFor(probe),
        );
    };

    const gate = createProbePinGate({
      now: () => performance.now(),
      probing: () => modeStore.getState().interactionMode === "PROBE",
      pin,
      refresh: (probe) =>
        viewerStore.getState().refreshProbePoint(probe, lookupFor(probe), readingsFor(probe)),
    });

    const onPointerDown = (event: PointerEvent) => {
      // Space + left button pans: a press of the hand never pins a probe.
      if (modeStore.getState().handHeld) {
        gate.cancel();
        return;
      }
      gate.pointerDown({
        x: event.clientX,
        y: event.clientY,
        button: event.button,
        shift: event.shiftKey,
        onCanvas: event.target instanceof Element && event.target.closest("canvas") !== null,
      });
    };
    const onClick = (event: MouseEvent) => gate.click({ x: event.clientX, y: event.clientY });

    let last = viewerStore.getState().probedCoordinate;
    const unsubscribe = viewerStore.subscribe((state) => {
      if (state.probedCoordinate === last) return;
      last = state.probedCoordinate;
      gate.probe(last);
    });

    // Both on the window's CAPTURE phase, so neither depends on what a handler
    // further in does with the event: the press is known before the layer
    // publishes its probe, and `click` — which only ever fires for the primary
    // button — is seen even if something stops it.
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointercancel", gate.cancel);
    window.addEventListener("click", onClick, true);
    return () => {
      unsubscribe();
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointercancel", gate.cancel);
      window.removeEventListener("click", onClick, true);
    };
  }, [viewerStore, sceneStore, modeStore, brickStore]);

  return null;
}
