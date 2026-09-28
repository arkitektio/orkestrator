import { useCallback, useEffect, useRef, useState } from "react";

import { useBrickStore } from "../../features/bricks/store/brickSlice";
import { useModeStoreApi, type InteractionMode } from "../../platform/stores/modeStore";
import { useViewerStoreApi, type ProbedCoordinate } from "../../platform/stores/viewerStore";

/**
 * A one-shot viewport eyedropper for an RGB layer: arm it, click a pixel that
 * should be neutral, get that voxel's RAW values for the three mapped slabs.
 *
 * It adds no pointer code of its own. Arming switches the viewer into PROBE
 * mode with the probe PINNED to this layer, so the existing plane and volume
 * probes answer the click exactly as they do for the probe panel; this hook
 * only waits, imperatively, for the first `origin === "click"` probe on this
 * layer (`probedCoordinate` is a hot field — vanilla subscribe only), then
 * restores the mode and pin it found.
 *
 * The probe's own values are resident-LOD reads, possibly from a coarse level,
 * so the pick upgrades to the exact level-0 voxel (`fetchExactVoxel`) and only
 * falls back to the resident values when that read is unavailable.
 */
export type NeutralPickState = "idle" | "armed" | "reading";

export const useNeutralPick = (
  layerId: string,
  slabs: readonly [number, number, number],
  onValues: (raw: [number, number, number]) => void,
) => {
  const modeApi = useModeStoreApi();
  const viewerApi = useViewerStoreApi();
  const brickSystem = useBrickStore((s) => s.brickSystem);
  const [state, setState] = useState<NeutralPickState>("idle");

  // Latest inputs, read when the click lands rather than when it was armed:
  // the planes may be remapped while the pick waits.
  const latest = useRef({ slabs, onValues, brickSystem });
  latest.current = { slabs, onValues, brickSystem };

  const disarmRef = useRef<(() => void) | null>(null);

  const cancel = useCallback(() => {
    disarmRef.current?.();
    disarmRef.current = null;
    setState("idle");
  }, []);

  const arm = useCallback(() => {
    disarmRef.current?.();
    const previousMode: InteractionMode = modeApi.getState().interactionMode;
    const previousPin = viewerApi.getState().probeLayerId;
    viewerApi.getState().setProbeLayerId(layerId);
    modeApi.getState().setInteractionMode("PROBE");

    let unsubscribe: (() => void) | null = null;
    const disarm = () => {
      unsubscribe?.();
      unsubscribe = null;
      // Hand the viewer back only if nobody moved it meanwhile.
      if (modeApi.getState().interactionMode === "PROBE") {
        modeApi.getState().setInteractionMode(previousMode);
      }
      if (viewerApi.getState().probeLayerId === layerId) {
        viewerApi.getState().setProbeLayerId(previousPin);
      }
    };

    unsubscribe = viewerApi.subscribe((viewer) => {
      const probe: ProbedCoordinate | null = viewer.probedCoordinate;
      if (!probe || probe.origin !== "click" || probe.layerId !== layerId) return;
      disarm();
      disarmRef.current = null;
      setState("reading");
      void readPick(probe).then((raw) => {
        setState("idle");
        if (raw) latest.current.onValues(raw);
      });
    });
    disarmRef.current = disarm;
    setState("armed");
  }, [layerId, modeApi, viewerApi]);

  const readPick = async (probe: ProbedCoordinate): Promise<[number, number, number] | null> => {
    const { slabs: current, brickSystem: system } = latest.current;
    const exact = await system?.fetchExactVoxel(layerId, probe.voxelIndex).catch(() => null);
    const valueAt = (slab: number): number | null => {
      if (exact) return exact.values[slab] ?? null;
      const entry = probe.values.find((value) => value.channel === slab);
      return entry?.value ?? null;
    };
    const raw = current.map(valueAt);
    return raw.every((value): value is number => value !== null && Number.isFinite(value))
      ? [raw[0], raw[1], raw[2]]
      : null;
  };

  // An armed pick must not outlive the card.
  useEffect(() => () => disarmRef.current?.(), []);

  return { state, arm, cancel };
};
