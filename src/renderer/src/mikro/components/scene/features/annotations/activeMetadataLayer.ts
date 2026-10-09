import { effectiveProbeLayerId } from "../../platform/probe/probeTargeting";

/**
 * Which layer the metadata section describes while nothing is probed; null
 * when no layer can.
 *
 * The layer selected in the Layers sidebar wins while it exists — hidden or
 * not, because selecting a layer IS saying "this one". With no selection the
 * section follows the probe's own target rule (the pin, else the first visible
 * image layer), so the probe readout, the LOD badge and the metadata can never
 * describe three different layers.
 */
export const activeMetadataLayerId = (
  selectedLayerId: string | null,
  probeLayerId: string | null,
  layers: readonly { id: string; visible?: boolean }[],
): string | null => {
  if (selectedLayerId !== null && layers.some((layer) => layer.id === selectedLayerId)) {
    return selectedLayerId;
  }
  return effectiveProbeLayerId(probeLayerId, layers);
};
