import { MapPin, PanelRightClose, PanelRightOpen, Zap } from "lucide-react";
import { memo, useMemo, useState } from "react";
import {
  PopoutFact,
  PopoutNote,
  PopoutSection,
  ThreeDPopoutCard,
} from "@/elektro/components/popout/ThreeDPopoutCard";
import { useGetExpLensAnchorsQuery, type ExpFullAnchorFragment } from "@/elektro/api/graphql";
import { InlineSectionViewer } from "@/elektro/components/morphology/InlineSectionViewer";
import { ElektroArrayDataset, ElektroNeuronModel } from "@/core/linkers";
import { formatDisplay } from "@/core/util/quantities";
import {
  HistogramSparkline,
  settingValue,
  type ValueHistogramLike,
} from "@/core/data/scene/metadata/MetadataChrome";
import { cn } from "@/core/util/utils";
import {
  anchorInView,
  anchorsForChannel,
  mergeChannelAnchors,
  sampleWindowOf,
  type AnchorCoverage,
  type ChannelSite,
} from "../../platform/model/anchors";
import { useLayerState, useRawLayer } from "../../platform/stores/experimentStore";
import { useRangeStore } from "../../platform/stores/rangeStore";

/**
 * A channel's NAME at the right edge of its track (its label, else its site's,
 * else its position) — and, clicked, everything known about that channel in a
 * `ThreeDPopoutCard` right underneath: its site as a chip (where it sits, on
 * which neuron model), the dataset it lives in (and, simulated, what computed
 * it), its values, the rig, the file's acquisition metadata.
 *
 * One place, not several: the timeline's counterpart of mikro's in-view
 * `MetadataOverlay`, but per channel and next to the line it describes. The
 * anchors behind it are merged into one record (`anchors.mergeChannelAnchors`):
 * pinned to this channel beats dataset-wide, and only what is in view counts
 * (an anchor pinned to a sample off screen waits for the window to reach it).
 *
 * The name draws from what the experiment load already carries;
 * `GetExpLensAnchors` — the heavy payload — mounts only while a card is open,
 * cache-first, one per lens.
 */

const KIND_LABELS: Record<string, string> = {
  VOLTAGE: "voltage",
  CURRENT: "current",
  INA: "sodium current",
  TIME: "time",
};

const CLAMP_MODE_LABELS: Record<string, string> = {
  CURRENT_CLAMP: "current clamp",
  VOLTAGE_CLAMP: "voltage clamp",
  ZERO_CURRENT: "I = 0",
};

const LINK_CLASS = "underline-offset-2 hover:underline";

export const ChannelTag = ({
  layerId,
  slot,
  label,
  site,
  color,
}: {
  layerId: string;
  /** Index into the layer's drawn channels. */
  slot: number;
  label: string | null;
  site: ChannelSite | null;
  /** The channel's own line colour, when channels are coloured individually. */
  color?: string | null;
}) => {
  const [open, setOpen] = useState(false);
  // Just a name on the track: the channel's own label, else what its site is
  // called, else its position. The site itself waits in the card.
  const name = label ?? site?.label ?? `channel ${slot + 1}`;

  return (
    <div className={cn("flex flex-col items-end gap-1", open && "relative z-20")}>
      <button
        type="button"
        className="pointer-events-auto flex max-w-[20rem] cursor-pointer items-center gap-1 font-mono text-[10px] text-muted-foreground drop-shadow hover:text-foreground"
        title={open ? "Hide channel metadata" : "Show channel metadata"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {/* Which line is which, when each channel has its own colour. */}
        {color && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
        <span className="truncate">{name}</span>
      </button>
      {open && (
        <div className="pointer-events-auto">
          <ChannelCard layerId={layerId} slot={slot} name={name} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
};

/**
 * The site as a chip, then where it sits and on which model. A site on a
 * section of a known model can open that section inline — the card expands to
 * the right with the model, the section framed and the rest dimmed.
 */
const SiteSection = ({
  site,
  model,
  sectionOpen,
  onToggleSection,
}: {
  site: ChannelSite;
  model: { id: string; name: string } | null;
  sectionOpen: boolean;
  onToggleSection: () => void;
}) => {
  const kind = site.kind ? (KIND_LABELS[site.kind] ?? site.kind.toLowerCase()) : null;
  const Icon = site.role === "recording" ? MapPin : Zap;
  const ToggleIcon = sectionOpen ? PanelRightClose : PanelRightOpen;
  return (
    <PopoutSection title={site.role === "recording" ? "Recorded at" : "Stimulated through"}>
      <div className="flex min-w-0 items-center gap-1">
        <span className="flex w-fit min-w-0 max-w-full items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          <Icon className="h-2.5 w-2.5 shrink-0 opacity-70" />
          <span className="truncate">{site.label}</span>
        </span>
        {model && site.location && (
          <button
            type="button"
            onClick={onToggleSection}
            className={cn(
              "ml-auto shrink-0 rounded p-0.5 transition-colors hover:bg-muted hover:text-foreground",
              sectionOpen ? "text-foreground" : "text-muted-foreground",
            )}
            title={sectionOpen ? "Close the section" : "Show the section on its model"}
            aria-label={sectionOpen ? "Close the section" : "Show the section on its model"}
            aria-pressed={sectionOpen}
          >
            <ToggleIcon className="size-3.5" />
          </button>
        )}
      </div>
      {site.cell && <PopoutFact label="cell">{site.cell}</PopoutFact>}
      {site.location && (
        <PopoutFact label="section">
          {site.location}
          {site.position != null && `(${site.position})`}
        </PopoutFact>
      )}
      {model && (
        <PopoutFact label="model">
          <ElektroNeuronModel.DetailLink object={model} className={LINK_CLASS}>
            {model.name}
          </ElektroNeuronModel.DetailLink>
        </PopoutFact>
      )}
      {kind && kind !== "unknown" && <PopoutFact label="measures">{kind}</PopoutFact>}
    </PopoutSection>
  );
};

const ValuesSection = ({ histogram, unit }: { histogram: ValueHistogramLike; unit: string | null }) => (
  <PopoutSection title={unit ? `Values · ${unit}` : "Values"}>
    {histogram.histogram && histogram.histogram.length > 0 && (
      <HistogramSparkline histogram={histogram.histogram} tone="surface" />
    )}
    {histogram.min != null && <PopoutFact label="min">{histogram.min}</PopoutFact>}
    {histogram.max != null && <PopoutFact label="max">{histogram.max}</PopoutFact>}
    {histogram.p1 != null && <PopoutFact label="p1">{histogram.p1}</PopoutFact>}
    {histogram.p99 != null && <PopoutFact label="p99">{histogram.p99}</PopoutFact>}
  </PopoutSection>
);

const RigSection = ({ rig }: { rig: NonNullable<ExpFullAnchorFragment["rig"]> }) => {
  const { state } = rig;
  const facts: [string, unknown][] = [
    ["holding", state.holdingPotential],
    ["holding", state.holdingCurrent],
    ["Rs", state.seriesResistance],
    ["Cm", state.membraneCapacitance],
    ["temp", state.temperature],
  ];
  return (
    <PopoutSection title="Rig">
      {state.mode && <PopoutFact label="mode">{CLAMP_MODE_LABELS[state.mode] ?? state.mode}</PopoutFact>}
      {facts.map(([label, value]) =>
        value == null ? null : (
          <PopoutFact key={label + String(value)} label={label}>
            {formatDisplay(value as string)}
          </PopoutFact>
        ),
      )}
      {state.devices.map((device) => {
        const settings = device.settings
          .map((setting) => {
            const value = settingValue(setting);
            return value === null ? null : `${setting.name} ${value}`;
          })
          .filter((entry): entry is string => entry !== null);
        return (
          <PopoutFact key={`${device.kind ?? ""}:${device.label}`} label={device.kind ?? "device"}>
            {device.label}
            {settings.length > 0 && <span className="text-muted-foreground"> · {settings.join(" · ")}</span>}
          </PopoutFact>
        );
      })}
    </PopoutSection>
  );
};

const asText = (value: unknown): string =>
  value !== null && typeof value === "object" ? JSON.stringify(value) : String(value);

type SiteWithModel = { id: string; label: string; model?: { id: string; name: string } | null };

type PanelAnchor = {
  id: string;
  coordinates: unknown;
  channelLabel?: { label: string } | null;
  valueUnit?: { unit: string } | null;
  valueHistogram?: ValueHistogramLike | null;
  recordingSite?: SiteWithModel | null;
  stimulusSite?: SiteWithModel | null;
  rig?: ExpFullAnchorFragment["rig"];
  acquisitionMetadata?: { metadata: unknown } | null;
};

const NO_ANCHORS: readonly PanelAnchor[] = [];

/** One channel's metadata, merged, on the card — mounted only while open. */
const ChannelCard = memo(function ChannelCard({
  layerId,
  slot,
  name,
  onClose,
}: {
  layerId: string;
  slot: number;
  name: string;
  onClose: () => void;
}) {
  const layer = useLayerState(layerId);
  const raw = useRawLayer(layerId, "TraceLayer");
  // The site's section, drawn in the card's right-hand expansion.
  const [sectionOpen, setSectionOpen] = useState(false);
  // Settled, not live: the card is read once the view stops moving.
  const visibleWindow = useRangeStore((s) => s.committedRange);
  const lensId = raw?.lens.id;
  const { data, loading } = useGetExpLensAnchorsQuery({
    variables: { id: lensId ?? "" },
    skip: !lensId,
    fetchPolicy: "cache-first",
  });

  const anchors: readonly PanelAnchor[] =
    data?.lens.activeAnchors ?? raw?.lens.activeAnchors ?? NO_ANCHORS;
  const source = layer?.source ?? null;
  const site = layer?.channelSites[slot] ?? null;

  const { merged, offScreen } = useMemo(() => {
    if (!source) return { merged: mergeChannelAnchors(anchors), offScreen: 0 };
    const channelAxis =
      source.channelAxisIndex === null ? null : (source.axisNames[source.channelAxisIndex] ?? null);
    const datasetIndex = source.channelIndices[slot] ?? null;
    const coverage: AnchorCoverage = {
      channelAxis,
      channelIndices: datasetIndex === null ? [] : [datasetIndex],
      timeAxis: source.axisNames[source.timeAxisIndex] ?? null,
      timeSamples: sampleWindowOf(source.levels[0], visibleWindow),
    };
    // Pinned to this channel first, then dataset-wide; other channels dropped.
    const own = anchorsForChannel(anchors, channelAxis, datasetIndex);
    const inView = own.filter((anchor) => anchorInView(anchor.coordinates, coverage));
    return { merged: mergeChannelAnchors(inView), offScreen: own.length - inView.length };
  }, [anchors, source, slot, visibleWindow]);

  const model = useMemo(() => {
    if (!site) return null;
    for (const anchor of anchors) {
      const candidate = site.role === "recording" ? anchor.recordingSite : anchor.stimulusSite;
      if (candidate && candidate.id === site.id && candidate.model) return candidate.model;
    }
    return null;
  }, [anchors, site]);

  // Where the channel's data lives, and — when it was simulated — what computed it.
  const sourceDataset = data?.lens.dataset ?? null;
  const simulation = sourceDataset?.simulation ?? null;
  const hasAnything =
    site || simulation || merged.histogram || merged.rig || merged.acquisition.length > 0;

  return (
    <ThreeDPopoutCard
      eyebrow={layer ? `Channel · ${layer.label}` : "Channel"}
      title={name}
      titleHint={name}
      swatch={layer?.color}
      onClose={onClose}
      aside={
        sectionOpen && site?.location && model ? (
          <InlineSectionViewer modelId={model.id} cell={site.cell} section={site.location} />
        ) : null
      }
    >
      {site && (
        <SiteSection
          site={site}
          model={model}
          sectionOpen={sectionOpen}
          onToggleSection={() => setSectionOpen((v) => !v)}
        />
      )}

      {sourceDataset && (
        <PopoutSection title="Source">
          <PopoutFact label="dataset">
            <ElektroArrayDataset.DetailLink object={sourceDataset} className={LINK_CLASS}>
              {sourceDataset.name}
            </ElektroArrayDataset.DetailLink>
          </PopoutFact>
          {simulation && (
            <>
              {/* The site already names its model; say it here only when it doesn't. */}
              {(!model || model.id !== simulation.model.id) && (
                <PopoutFact label="model">
                  <ElektroNeuronModel.DetailLink object={simulation.model} className={LINK_CLASS}>
                    {simulation.model.name}
                  </ElektroNeuronModel.DetailLink>
                </PopoutFact>
              )}
              <PopoutFact label="duration">{formatDisplay(simulation.duration)}</PopoutFact>
              {simulation.dt && <PopoutFact label="dt">{formatDisplay(simulation.dt)}</PopoutFact>}
            </>
          )}
        </PopoutSection>
      )}

      {merged.histogram && <ValuesSection histogram={merged.histogram} unit={merged.unit} />}

      {merged.rig && <RigSection rig={merged.rig} />}

      {merged.acquisition.length > 0 && (
        <PopoutSection title="Acquisition">
          {merged.acquisition.map(([key, value]) => (
            <PopoutFact key={key} label={key}>
              {asText(value)}
            </PopoutFact>
          ))}
        </PopoutSection>
      )}

      {!hasAnything && !loading && <PopoutNote>No metadata recorded.</PopoutNote>}
      {offScreen > 0 && <PopoutNote>{offScreen} more pinned to times outside the window</PopoutNote>}
      {loading && <PopoutNote>Loading…</PopoutNote>}
    </ThreeDPopoutCard>
  );
});
