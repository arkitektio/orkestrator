import { MetadataOverlayFrame } from "@/lib/scene/metadata/MetadataChrome";
import { memo, useState } from "react";
import { layerDisplayLabel } from "../../platform/layerui/layerIdentity";
import { LayerState, useSceneStore } from "../../platform/stores/sceneStore";
import { useSelectionStore } from "../../platform/stores/selectionStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { activeMetadataLayerId } from "./activeMetadataLayer";
import { AnchorMetadata, useLayerAnchors } from "./AnchorMetadata";

/**
 * The acquisition metadata of the ACTIVE layer, docked bottom-right over the
 * viewport, directly above the mode controls (`SceneModeControls`, bottom-2
 * right-2) — the corner where the picture's own chrome already lives.
 *
 * ACTIVE means the layer the user is working on: the one selected in the
 * Layers sidebar when there is one, otherwise the layer the probe reads
 * (`effectiveProbeLayerId` — the pin, or the first visible image layer). That
 * second rule is deliberately the probe's own, so the readout, the LOD badge
 * and this overlay can never describe three different layers.
 *
 * Two states (`MetadataOverlayFrame`, shared with elektro's timeline).
 * COLLAPSED is nothing but a small unfold button — no title, no layer name, no
 * count — cheap enough to leave up on every scene and quiet enough not to
 * caption the picture. EXPANDED unfolds the full panel (`AnchorMetadata`), and
 * only then does `GetLensAnchors` fetch the heavy microscope state and phasor
 * facts, for exactly this one layer.
 *
 * A layer with no anchors at all renders nothing: a dataset without recorded
 * metadata is the common case, not a fault worth a permanent pill.
 */

const areLayerAnchorsEqual = (prev: { layer: LayerState }, next: { layer: LayerState }) =>
  prev.layer.lens === next.layer.lens && prev.layer.phasorAxis === next.layer.phasorAxis;

/** The unfolded panel — mounts the full anchor query for this layer only. */
const OverlayBody = memo(({ layer }: { layer: LayerState }) => {
  const { anchors, loading } = useLayerAnchors(layer);
  return (
    <div className="flex min-w-0 flex-col gap-1 px-1 pb-1 text-white/85">
      <AnchorMetadata layer={layer} anchors={anchors} loading={loading} />
    </div>
  );
}, areLayerAnchorsEqual);
OverlayBody.displayName = "MetadataOverlayBody";

export const MetadataOverlay = () => {
  const selectedLayerId = useSelectionStore((state) => state.selectedLayerId);
  const probeLayerId = useViewerStore((state) => state.probeLayerId);
  const layers = useSceneStore((state) => state.layers);
  const [expanded, setExpanded] = useState(false);

  const layerId = activeMetadataLayerId(selectedLayerId, probeLayerId, layers);
  const layer = layerId === null ? null : layers.find((candidate) => candidate.id === layerId);

  if (!layer || layer.lens.activeAnchors.length === 0) return null;

  return (
    <MetadataOverlayFrame
      title={`Metadata for ${layerDisplayLabel(layer)}`}
      className="bottom-14 right-2"
      expanded={expanded}
      setExpanded={setExpanded}
    >
      <OverlayBody layer={layer} />
    </MetadataOverlayFrame>
  );
};
