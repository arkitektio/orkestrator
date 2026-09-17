import { effectiveProbeLayerId } from "../../platform/probe/probeTargeting";

/**
 * Which layer the metadata overlay describes; null when no layer can.
 *
 * The layer selected in the Layers sidebar wins while it exists — hidden or
 * not, because selecting a layer IS saying "this one". With no selection the
 * overlay follows the probe's own target rule (the pin, else the first visible
 * image layer), so the probe readout, the LOD badge and the overlay can never
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
