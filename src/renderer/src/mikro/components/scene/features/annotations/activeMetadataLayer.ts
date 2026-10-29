import { effectiveDataLayerId } from "../../platform/probe/probeTargeting";

/**
 * Which layer the metadata section describes while nothing is probed; null
 * when no layer can.
 *
 * The layer selected in the Layers sidebar wins while it exists — hidden or
 * not, because selecting a layer IS saying "this one". With no selection the
 * section follows the data layer (`effectiveDataLayerId`: the pin, else the
 * first visible layer), as the LOD badge does, so the two can never describe
 * different layers.
 */
export const activeMetadataLayerId = (
  selectedLayerId: string | null,
  dataLayerId: string | null,
  layers: readonly { id: string; visible?: boolean }[],
): string | null => {
  if (selectedLayerId !== null && layers.some((layer) => layer.id === selectedLayerId)) {
    return selectedLayerId;
  }
  return effectiveDataLayerId(dataLayerId, layers);
};
