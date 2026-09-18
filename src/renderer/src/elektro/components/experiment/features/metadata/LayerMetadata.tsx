import { memo, useMemo, useState } from "react";
import {
  useGetExpLensAnchorsQuery,
  type ExpFullAnchorFragment,
} from "@/elektro/api/graphql";
import { whereOf, type SiteLike } from "@/elektro/lib/sites";
import { formatDisplay } from "@/lib/quantities";
import { ElektroNeuronModel, ElektroSimulation } from "@/linkers";
import {
  DeviceRows,
  MetadataAnchorBox,
  MetadataChip,
  MetadataHeader,
  MetadataRow,
  ValueHistogramSpoke,
  type ValueHistogramLike,
} from "@/lib/scene/metadata/MetadataChrome";
import {
  partitionAnchors,
  pinOf,
  sampleWindowOf,
  type AnchorCoverage,
} from "../../platform/model/anchors";
import type { LayerState } from "../../platform/model/layerModel";
import type { TraceSource } from "../../platform/sources/traceSource";
import { useLayerState, useRawLayer } from "../../platform/stores/experimentStore";
import { useRangeStore, type TimeWindow } from "../../platform/stores/rangeStore";

/**
 * What was RECORDED about a trace layer, and where it came from — unfolded
 * under the layer's in-canvas row label (`shell/chrome/RowLabels`), the
 * timeline's counterpart of mikro's `MetadataOverlay` body, drawn with the same
 * chrome (`@/lib/scene/metadata/MetadataChrome`).
 *
 * PROVENANCE first: the simulation(s) that produced the dataset and the neuron
 * model they ran, as links — the recording sites below name cells and sections
 * of exactly that model.
 *
 * Then the ANCHORS: a trace's lens pins metadata to coordinates of its dataset —
 * what a channel is called, its unit and value distribution, the site it was
 * recorded at or stimulated through, the rig's state and the file's own
 * acquisition metadata. Which of them describe what is on screen depends on the
 * channel the layer draws and on the visible window (an anchor may pin a sweep's
 * first sample), so the panel splits them live (`anchors.anchorInView`) and
 * shows only the ones in view; the rest stay one click away, because "there IS a
 * rig state, just not for this channel" is a different answer from "none was
 * ever recorded".
 *
 * Mounted only while the row is unfolded, so `GetExpLensAnchors` (cache-first,
 * one per unfolded layer) runs only then; until it lands the panel draws from
 * the thin projection the experiment query already carries. Spike, event and
 * annotation layers carry no lens, and so nothing to unfold.
 */

/**
 * Structural, so both the thin `ExpAnchor` projection and the full
 * `ExpFullAnchor` satisfy it — the panel degrades field by field.
 */
type PanelAnchor = {
  id: string;
  coordinates: unknown;
  channelLabel?: { label: string } | null;
  valueUnit?: { unit: string } | null;
  valueHistogram?: ValueHistogramLike | null;
  recordingSite?: PanelSite | null;
  stimulusSite?: PanelSite | null;
  rig?: ExpFullAnchorFragment["rig"];
  acquisitionMetadata?: { metadata: unknown } | null;
};

const NO_ANCHORS: readonly PanelAnchor[] = [];

type SimulationRef = { id: string; name: string; model: { id: string; name: string } };

const NO_SIMULATIONS: readonly SimulationRef[] = [];

const LINK_CLASS = "min-w-0 truncate font-mono text-white/85 underline-offset-2 hover:underline";

/** The simulation(s) that produced the dataset, and the neuron model each ran. */
const Provenance = ({ simulations }: { simulations: readonly SimulationRef[] }) => (
  <div className="flex max-w-full flex-col gap-1">
    <MetadataHeader>Source</MetadataHeader>
    {simulations.map((simulation) => (
      <div key={simulation.id} className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="shrink-0 text-white/40">model</span>
          <ElektroNeuronModel.DetailLink object={simulation.model} className={LINK_CLASS}>
            {simulation.model.name}
          </ElektroNeuronModel.DetailLink>
        </div>
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="shrink-0 text-white/40">run</span>
          <ElektroSimulation.DetailLink object={simulation} className={LINK_CLASS}>
            {simulation.name}
          </ElektroSimulation.DetailLink>
        </div>
      </div>
    ))}
  </div>
);

const coverageOf = (source: TraceSource, window: TimeWindow): AnchorCoverage => ({
  channelAxis:
    source.channelAxisIndex === null ? null : (source.axisNames[source.channelAxisIndex] ?? null),
  channelIndices: source.channelIndices,
  timeAxis: source.axisNames[source.timeAxisIndex] ?? null,
  timeSamples: sampleWindowOf(source.levels[0], window),
});

const CLAMP_MODE_LABELS: Record<string, string> = {
  CURRENT_CLAMP: "current clamp",
  VOLTAGE_CLAMP: "voltage clamp",
  ZERO_CURRENT: "I = 0",
};

/** A site as the panel reads it; `model` arrives with the full anchor payload. */
type PanelSite = SiteLike & { model?: { id: string; name: string } | null };

/**
 * A recording or stimulus site, and the neuron model it sits on — its cell and
 * section are named in that model's terms, so the link is what makes
 * "soma(0.5)" mean something.
 */
const SiteRow = ({ label, site }: { label: string; site: PanelSite }) => {
  const where = whereOf(site);
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-0.5">
      <MetadataRow
        label={label}
        value={
          <>
            {site.label}
            {where && where !== site.label && <span className="text-white/45"> · {where}</span>}
          </>
        }
      />
      {site.model && (
        <div className="flex min-w-0 items-baseline gap-1.5 pl-1">
          <span className="shrink-0 text-white/40">on</span>
          <ElektroNeuronModel.DetailLink object={site.model} className={LINK_CLASS}>
            {site.model.name}
          </ElektroNeuronModel.DetailLink>
        </div>
      )}
    </div>
  );
};

const RigSpoke = ({ rig }: { rig: NonNullable<ExpFullAnchorFragment["rig"]> }) => {
  const { state } = rig;
  const facts: [string, unknown][] = [
    ["holding", state.holdingPotential],
    ["holding", state.holdingCurrent],
    ["Rs", state.seriesResistance],
    ["Cm", state.membraneCapacitance],
    ["temp", state.temperature],
  ];
  return (
    <div className="flex flex-col gap-1">
      <MetadataHeader>Rig</MetadataHeader>
      {state.mode && (
        <MetadataRow label="mode" value={CLAMP_MODE_LABELS[state.mode] ?? state.mode} />
      )}
      {facts.map(([label, value]) =>
        value == null ? null : (
          <MetadataRow key={label + String(value)} label={label} value={formatDisplay(value as string)} />
        ),
      )}
      <DeviceRows devices={state.devices} />
    </div>
  );
};

const metadataValue = (value: unknown): string =>
  value !== null && typeof value === "object" ? JSON.stringify(value) : String(value);

/** The file's own metadata, one row per top-level key — as stated, not interpreted. */
const AcquisitionSpoke = ({ metadata }: { metadata: unknown }) => {
  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const entries = Object.entries(metadata as Record<string, unknown>).filter(
    ([, value]) => value != null && value !== "",
  );
  if (entries.length === 0) return null;
  return (
    <div className="flex max-w-full flex-col gap-1">
      <MetadataHeader>Acquisition</MetadataHeader>
      {entries.map(([key, value]) => {
        const text = metadataValue(value);
        return (
          <div key={key} title={`${key}: ${text}`} className="min-w-0 max-w-full">
            <MetadataRow label={key} value={text} />
          </div>
        );
      })}
    </div>
  );
};

/** One in-view anchor: its channel, then whichever metadata spokes it carries. */
const ActiveAnchor = ({ anchor }: { anchor: PanelAnchor }) => {
  const hasSpokes =
    Boolean(anchor.channelLabel) ||
    Boolean(anchor.valueHistogram) ||
    Boolean(anchor.recordingSite) ||
    Boolean(anchor.stimulusSite) ||
    Boolean(anchor.rig) ||
    Boolean(anchor.acquisitionMetadata);

  return (
    <MetadataAnchorBox align="start">
      {anchor.channelLabel?.label && <MetadataChip>{anchor.channelLabel.label}</MetadataChip>}

      {(anchor.recordingSite || anchor.stimulusSite) && (
        <div className="flex flex-col gap-1">
          <MetadataHeader>Site</MetadataHeader>
          {anchor.recordingSite && <SiteRow label="recorded" site={anchor.recordingSite} />}
          {anchor.stimulusSite && <SiteRow label="stimulus" site={anchor.stimulusSite} />}
        </div>
      )}

      {anchor.valueHistogram && (
        <ValueHistogramSpoke histogram={anchor.valueHistogram} unit={anchor.valueUnit?.unit} />
      )}

      {anchor.rig && <RigSpoke rig={anchor.rig} />}

      {anchor.acquisitionMetadata && (
        <AcquisitionSpoke metadata={anchor.acquisitionMetadata.metadata} />
      )}

      {!hasSpokes && <span className="text-[9px] text-white/40">no metadata recorded</span>}
    </MetadataAnchorBox>
  );
};

/** Why an anchor is not on screen, for the tooltip — the coordinates themselves are noise. */
const whyOutOfView = (anchor: PanelAnchor, coverage: AnchorCoverage): string | undefined => {
  if (coverage.channelAxis) {
    const pin = pinOf(anchor.coordinates, coverage.channelAxis);
    if (pin !== null && !coverage.channelIndices.includes(pin)) return `channel ${pin} is not drawn`;
  }
  if (coverage.timeAxis && pinOf(anchor.coordinates, coverage.timeAxis) !== null) {
    return "pinned to a time outside the visible window";
  }
  return undefined;
};

/**
 * The anchors that exist but describe something else. Worth listing: a missing
 * rig state and a rig state for another channel look identical otherwise.
 */
const OutOfView = ({
  anchors,
  coverage,
}: {
  anchors: readonly PanelAnchor[];
  coverage: AnchorCoverage;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <button
        className="self-start text-[9px] uppercase tracking-widest text-white/40 transition-colors hover:text-white/70"
        onClick={() => setOpen((previous) => !previous)}
      >
        {anchors.length} more out of view
      </button>
      {open &&
        anchors.map((anchor) => (
          <span
            key={anchor.id}
            className="pl-1 text-[9px] text-white/40"
            title={whyOutOfView(anchor, coverage)}
          >
            {anchor.channelLabel?.label ?? anchor.recordingSite?.label ?? "unlabelled"}
          </span>
        ))}
    </div>
  );
};

/** One trace layer's provenance and in-view anchors — mounts the full query for its lens only. */
export const LayerMetadata = memo(function LayerMetadata({
  layerId,
  showHeader,
}: {
  layerId: string;
  showHeader: boolean;
}) {
  const layer = useLayerState(layerId);
  const raw = useRawLayer(layerId, "TraceLayer");
  // Settled, not live: re-partitioning at pan rate is waste, and the panel is
  // read once the view stops moving.
  const visibleWindow = useRangeStore((s) => s.committedRange);
  const lensId = raw?.lens.id;
  const { data, loading } = useGetExpLensAnchorsQuery({
    variables: { id: lensId ?? "" },
    skip: !lensId,
    fetchPolicy: "cache-first",
  });

  const anchors: readonly PanelAnchor[] = data?.lens.activeAnchors ?? raw?.lens.activeAnchors ?? NO_ANCHORS;
  const source = layer?.source ?? null;
  const coverage = useMemo(() => (source ? coverageOf(source, visibleWindow) : null), [source, visibleWindow]);
  const { inView, outOfView } = useMemo(
    () => (coverage ? partitionAnchors(anchors, coverage) : { inView: [], outOfView: [] }),
    [anchors, coverage],
  );

  const simulations = data?.lens.dataset.simulations ?? NO_SIMULATIONS;

  if (!layer || !coverage) return null;
  if (!loading && anchors.length === 0 && simulations.length === 0) {
    return (
      <div className="flex min-w-0 flex-col items-start gap-1.5 text-left text-[10px]">
        {showHeader && <SectionHeader layer={layer} />}
        <span className="text-white/40">No metadata recorded.</span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5 text-left text-[10px]">
      {showHeader && <SectionHeader layer={layer} />}
      {simulations.length > 0 && <Provenance simulations={simulations} />}
      {anchors.length > 0 &&
        (inView.length === 0 ? (
          <span className="text-white/40">Nothing anchored to what this layer is showing.</span>
        ) : (
          inView.map((anchor) => <ActiveAnchor key={anchor.id} anchor={anchor} />)
        ))}
      {outOfView.length > 0 && <OutOfView anchors={outOfView} coverage={coverage} />}
      {loading && <span className="text-[9px] text-white/30">Loading…</span>}
    </div>
  );
});

const SectionHeader = ({ layer }: { layer: LayerState }) => (
  <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/85">
    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: layer.color }} />
    <span className="truncate">{layer.label}</span>
  </div>
);
