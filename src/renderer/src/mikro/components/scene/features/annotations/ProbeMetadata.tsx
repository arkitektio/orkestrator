import { memo, useMemo, useState } from "react";
import type { AxisCoords } from "@/mikro/lib/coords/axisPath";
import { layerDisplayLabel } from "../../platform/layerui/layerIdentity";
import { probeAxisCoords } from "../../platform/probe/probeCoords";
import {
  LIVE_PROBE_COLOR,
  isSameProbePoint,
  probePointColor,
} from "../../platform/probe/probePoints";
import { LayerState, useSceneStore } from "../../platform/stores/sceneStore";
import { useSelectionStore } from "../../platform/stores/selectionStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { activeMetadataLayerId } from "./activeMetadataLayer";
import { ActiveAnchor, AnchorMetadata, useLayerAnchors, type PanelAnchor } from "./AnchorMetadata";
import { matchAnchor, pointCoverage } from "./anchorVisibility";

/**
 * The acquisition metadata of what is being PROBED — the last section of the
 * sidebar's "Probe" tab.
 *
 * A dataset's `CoordinateAnchor`s pin metadata to coordinates, and a probe is
 * a coordinate: so for the live probe and every pinned probe point this shows
 * the anchors that apply AT that point — its voxel, and the collapsed dims it
 * was read at (`pointCoverage`). An anchor several points share is one box
 * captioned with their dots, not a box per point; points on different
 * timepoints or channels then differ visibly in which boxes carry their dot.
 *
 * With nothing probed it describes the ACTIVE layer and what that layer is
 * showing (`AnchorMetadata`), as the viewport's metadata overlay used to:
 * the layer selected in the Layers tab, otherwise the probe's own target.
 *
 * `GetLensAnchors` (the heavy microscope state) mounts per probed layer and
 * only while this tab is open; the scene's thin projection draws meanwhile.
 * A layer with no anchors renders nothing.
 */

type Reading = { id: string; name: string; color: string; layerId: string; coords: AxisCoords };

const sameLens = (prev: { layer: LayerState }, next: { layer: LayerState }) =>
  prev.layer.lens === next.layer.lens && prev.layer.phasorAxis === next.layer.phasorAxis;

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <span className="block truncate text-[10px] font-medium text-white/60">{children}</span>
);

const ReadingDots = ({ readings }: { readings: readonly Reading[] }) => (
  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-medium text-white/70">
    {readings.map((reading) => (
      <span key={reading.id} className="inline-flex items-center gap-1">
        <span className="size-1.5 rounded-full" style={{ backgroundColor: reading.color }} />
        {reading.name}
      </span>
    ))}
  </span>
);

/** The anchors of one layer, each captioned with the readings it applies to. */
const LayerProbeMetadata = ({
  layer,
  readings,
}: {
  layer: LayerState;
  readings: readonly Reading[];
}) => {
  const { anchors, loading } = useLayerAnchors(layer);
  const [showOthers, setShowOthers] = useState(false);

  const { applying, others } = useMemo(() => {
    const coverages = readings.map((reading) => pointCoverage(layer, reading.coords));
    const applying: { anchor: PanelAnchor; readings: Reading[] }[] = [];
    const others: PanelAnchor[] = [];
    for (const anchor of anchors) {
      const matched = readings.filter(
        (_, index) => matchAnchor(anchor.coordinates, coverages[index]).satisfied,
      );
      if (matched.length > 0) applying.push({ anchor, readings: matched });
      else others.push(anchor);
    }
    return { applying, others };
  }, [anchors, layer, readings]);

  if (anchors.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-[10px] text-white/85">
      <SectionTitle>Metadata · {layerDisplayLabel(layer)}</SectionTitle>
      {applying.length === 0 && (
        <span className="text-white/40">Nothing anchored at the probed points.</span>
      )}
      {applying.map(({ anchor, readings: matched }) => (
        <ActiveAnchor key={anchor.id} anchor={anchor} align="start">
          <ReadingDots readings={matched} />
        </ActiveAnchor>
      ))}
      {others.length > 0 && (
        <>
          <button
            className="self-start text-[9px] uppercase tracking-widest text-white/40 transition-colors hover:text-white/70"
            onClick={() => setShowOthers((previous) => !previous)}
          >
            {others.length} more anchored elsewhere
          </button>
          {showOthers && (
            <div className="flex flex-wrap gap-1">
              {others.map((anchor) => (
                <span key={anchor.id} className="text-[9px] text-white/40">
                  {anchor.channelLabel?.label ?? "unlabelled"}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      {loading && <span className="text-[9px] text-white/30">Loading…</span>}
    </div>
  );
};

/** Nothing probed: the active layer and what it is showing. */
const ActiveLayerMetadata = memo(({ layer }: { layer: LayerState }) => {
  const { anchors, loading } = useLayerAnchors(layer);
  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-white/85">
      <SectionTitle>Metadata · {layerDisplayLabel(layer)}</SectionTitle>
      <AnchorMetadata layer={layer} anchors={anchors} loading={loading} />
    </div>
  );
}, sameLens);
ActiveLayerMetadata.displayName = "ActiveLayerMetadata";

/** One probed layer, resolved by id so a contrast drag elsewhere re-renders nothing here. */
const ProbedLayer = ({ layerId, readings }: { layerId: string; readings: readonly Reading[] }) => {
  const layer = useSceneStore(
    (state) => state.layers.find((candidate) => candidate.id === layerId) ?? null,
  );
  if (!layer || layer.lens.activeAnchors.length === 0) return null;
  return <LayerProbeMetadata layer={layer} readings={readings} />;
};

const ActiveLayer = () => {
  const selectedLayerId = useSelectionStore((state) => state.selectedLayerId);
  const probeLayerId = useViewerStore((state) => state.probeLayerId);
  // Both selectors read `layers` but return a SCALAR / the one layer: the
  // array's identity is republished by every `updateLayer`.
  const layerId = useSceneStore((state) =>
    activeMetadataLayerId(selectedLayerId, probeLayerId, state.layers),
  );
  const layer = useSceneStore((state) =>
    layerId === null
      ? null
      : (state.layers.find((candidate) => candidate.id === layerId) ?? null),
  );
  if (!layer || layer.lens.activeAnchors.length === 0) return null;
  return <ActiveLayerMetadata layer={layer} />;
};

export const ProbeMetadata = () => {
  const points = useViewerStore((state) => state.probePoints);
  // The SETTLED live probe, never the hot field (P17).
  const liveProbe = useViewerStore((state) => state.probeReadout);
  const dimSelections = useViewerStore((state) => state.dimSelections);
  // The live probe's layer only, as a scalar-ish selector: its lens decides
  // the axis names the live coordinates are stated in.
  const liveLayer = useSceneStore((state) =>
    liveProbe && liveProbe.strategy !== "mesh"
      ? (state.layers.find((candidate) => candidate.id === liveProbe.layerId) ?? null)
      : null,
  );

  const byLayer = useMemo(() => {
    const readings: Reading[] = points.flatMap((point) =>
      point.coords
        ? [
            {
              id: point.id,
              name: String(point.index),
              color: probePointColor(point.index),
              layerId: point.probe.layerId,
              coords: point.coords,
            },
          ]
        : [],
    );
    // Left out while it rests on a pinned place — that point already speaks for it.
    if (
      liveProbe &&
      liveLayer &&
      !points.some((point) => isSameProbePoint(point.probe, liveProbe))
    ) {
      readings.push({
        id: "live",
        name: "live",
        color: LIVE_PROBE_COLOR,
        layerId: liveProbe.layerId,
        coords: probeAxisCoords(liveLayer, liveProbe.voxelIndex, dimSelections),
      });
    }
    const groups = new Map<string, Reading[]>();
    for (const reading of readings) {
      const group = groups.get(reading.layerId);
      if (group) group.push(reading);
      else groups.set(reading.layerId, [reading]);
    }
    return [...groups.entries()];
  }, [points, liveProbe, liveLayer, dimSelections]);

  if (byLayer.length === 0) return <ActiveLayer />;
  return (
    <>
      {byLayer.map(([layerId, readings]) => (
        <ProbedLayer key={layerId} layerId={layerId} readings={readings} />
      ))}
    </>
  );
};
