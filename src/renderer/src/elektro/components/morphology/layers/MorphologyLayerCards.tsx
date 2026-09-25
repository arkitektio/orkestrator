import { Slider } from "@/core/components/ui/slider";
import {
  Badge,
  CardSection,
  IconToggle,
  LayerCardShell,
  RowAction,
  Segment,
  SegmentGroup,
  formatCount,
} from "@/core/lib/scene/layerui/cardControls";
import { Eye, EyeOff, GitBranch, RotateCcw, Waypoints } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DEFAULT_WEIGHTS,
  type DominanceWeights,
  type ImportanceColors,
  WEIGHT_FIELDS,
  isDefaultWeights,
} from "../../../lib/importance";
import { heatmapGradientCss } from "../../../lib/heatmap";
import type { Morphology } from "../model/buildMorphology";
import { COLOR_BY_OPTIONS } from "../model/colouring";
import { FOCUS_CONTEXT_OPTIONS } from "../model/focus";
import {
  type NetworkLayout,
  STIMULATOR_COLOR,
  SYNAPSE_EXCITATORY_COLOR,
  SYNAPSE_INHIBITORY_COLOR,
} from "../model/networkLayout";
import { useMorphologyData } from "../MorphologyData";
import { useMorphologyStore } from "../stores/morphologyStore";

/**
 * The morphology's Layers tab — the scene's and the timeline's card list,
 * built from the shared `cardControls` vocabulary. These are VIEW layers of
 * one model (the morphology and its network), not server layers: no add, no
 * reorder, no delete, and nothing here is saved.
 */

const VisibilityToggle = ({
  visible,
  onToggle,
  what,
}: {
  visible: boolean;
  onToggle: () => void;
  what: string;
}) => (
  <RowAction title={visible ? `Hide the ${what}` : `Show the ${what}`} onClick={onToggle}>
    {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
  </RowAction>
);

const fmt = (v: number) =>
  Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.01) ? v.toExponential(1) : v.toFixed(2);

const SliderRow = ({
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) => (
  <div className="flex items-center gap-1.5">
    <Slider
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      className="flex-1 py-1"
    />
    <span className="w-10 shrink-0 text-right font-mono text-[9px] text-white/40">
      {format(value)}
    </span>
  </div>
);

/**
 * The dominance blend weights. A local draft keeps the sliders live while
 * dragging; the store (and so the refetch) only sees the released value.
 */
const ImportanceSection = ({ importance }: { importance: ImportanceColors }) => {
  const weights = useMorphologyStore((s) => s.importanceWeights);
  const setWeights = useMorphologyStore((s) => s.setImportanceWeights);
  const [draft, setDraft] = useState<DominanceWeights>(weights);
  useEffect(() => setDraft(weights), [weights]);

  return (
    <CardSection
      title="importance"
      action={
        !isDefaultWeights(weights) && (
          <RowAction title="Back to the built-in blend" onClick={() => setWeights(DEFAULT_WEIGHTS)}>
            <RotateCcw className="h-2.5 w-2.5" />
          </RowAction>
        )
      }
      hint="Each section's share of the cell, blended — derived from geometry and channels, no simulation."
    >
      <div className="flex items-center gap-1.5">
        <span className="w-9 shrink-0 text-right font-mono text-[9px] text-white/40">
          {fmt(importance.min)}
        </span>
        <div className="h-1.5 flex-1 rounded-full" style={{ background: heatmapGradientCss() }} />
        <span className="w-9 shrink-0 font-mono text-[9px] text-white/40">{fmt(importance.max)}</span>
      </div>
      {WEIGHT_FIELDS.map((field) => {
        const raw = draft[field.key];
        return (
          <div key={field.key} className="flex flex-col gap-0.5" title={field.description}>
            <span className="text-[9px] text-white/50">
              {field.label}
              {raw == null && <span className="text-white/25"> · default</span>}
            </span>
            <div className="flex items-center gap-1.5">
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[raw ?? field.defaultValue]}
                onValueChange={([n]) => setDraft((d) => ({ ...d, [field.key]: n }))}
                onValueCommit={([n]) => setWeights({ ...draft, [field.key]: n })}
                className="flex-1 py-1"
              />
              <span className="w-7 shrink-0 text-right font-mono text-[9px] text-white/40">
                {(raw ?? field.defaultValue).toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}
    </CardSection>
  );
};

export const MorphologyLayerCard = ({
  morphology,
  importance,
  zoomed = false,
}: {
  morphology: Morphology;
  /** Null where there is no dominance score to colour by (the editor). */
  importance: ImportanceColors | null;
  /** A zoomed-in render: offer what to do with the model around the focus. */
  zoomed?: boolean;
}) => {
  const settings = useMorphologyStore((s) => s.morphology);
  const setMorphology = useMorphologyStore((s) => s.setMorphology);
  const [expanded, setExpanded] = useState(true);

  const options = COLOR_BY_OPTIONS.filter((o) => o.value !== "importance" || importance?.hasData);

  return (
    <LayerCardShell
      icon={<GitBranch className="h-3 w-3 text-emerald-300" />}
      tile="bg-emerald-400/15"
      title="Morphology"
      badges={
        <>
          <Badge title="Sections">{formatCount(morphology.sections.length)}</Badge>
          {morphology.anySynthetic && (
            <Badge title="Some sections carry no 3D coordinates and are laid out from their length and branching instead">
              synthetic
            </Badge>
          )}
        </>
      }
      actions={
        <VisibilityToggle
          what="morphology"
          visible={settings.visible}
          onToggle={() => setMorphology({ visible: !settings.visible })}
        />
      }
      hidden={!settings.visible}
      expanded={expanded}
      onToggle={() => setExpanded((e) => !e)}
    >
      <CardSection title="colour by">
        <div>
          <SegmentGroup>
            {options.map((o) => (
              <Segment
                key={o.value}
                active={settings.colorBy === o.value}
                title={o.title}
                onClick={() => setMorphology({ colorBy: o.value })}
              >
                {o.label}
              </Segment>
            ))}
          </SegmentGroup>
        </div>
        {settings.colorBy === "uniform" && (
          <input
            type="color"
            value={settings.uniformColor}
            onChange={(e) => setMorphology({ uniformColor: e.target.value })}
            className="h-5 w-10 cursor-pointer rounded border border-white/10 bg-transparent"
            title="Morphology colour"
          />
        )}
      </CardSection>

      {zoomed && (
        <CardSection title="rest of the model">
          <div>
            <SegmentGroup>
              {FOCUS_CONTEXT_OPTIONS.map((o) => (
                <Segment
                  key={o.value}
                  active={settings.context === o.value}
                  title={o.title}
                  onClick={() => setMorphology({ context: o.value })}
                >
                  {o.label}
                </Segment>
              ))}
            </SegmentGroup>
          </div>
        </CardSection>
      )}

      {settings.colorBy === "importance" && importance?.hasData && (
        <ImportanceSection importance={importance} />
      )}

      <CardSection title="radius scale" hint="Thicken thin dendrites to read the arbor at a distance.">
        <SliderRow
          value={settings.radiusScale}
          min={0.25}
          max={8}
          step={0.25}
          format={(v) => `×${v.toFixed(2)}`}
          onChange={(radiusScale) => setMorphology({ radiusScale })}
        />
      </CardSection>
      <CardSection title="min radius">
        <SliderRow
          value={settings.minRadius}
          min={0}
          max={5}
          step={0.1}
          format={(v) => `${v.toFixed(1)} µm`}
          onChange={(minRadius) => setMorphology({ minRadius })}
        />
      </CardSection>
    </LayerCardShell>
  );
};

const Swatch = ({ color, label }: { color: string; label: string }) => (
  <span className="flex items-center gap-1 text-[9px] text-white/50">
    <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
    {label}
  </span>
);

/** Renders nothing for a model without a network. */
export const NetworkLayerCard = ({ network }: { network: NetworkLayout }) => {
  const settings = useMorphologyStore((s) => s.network);
  const setNetwork = useMorphologyStore((s) => s.setNetwork);
  const [expanded, setExpanded] = useState(false);

  if (!network.hasData) return null;

  return (
    <LayerCardShell
      icon={<Waypoints className="h-3 w-3 text-violet-300" />}
      tile="bg-violet-400/15"
      title="Network"
      badges={
        <Badge title="Synapses">{formatCount(network.synapses.length)} syn</Badge>
      }
      actions={
        <VisibilityToggle
          what="network"
          visible={settings.visible}
          onToggle={() => setNetwork({ visible: !settings.visible })}
        />
      }
      hidden={!settings.visible}
      expanded={expanded}
      onToggle={() => setExpanded((e) => !e)}
    >
      <CardSection
        title="draw"
        hint={
          network.unmatchedSynapses > 0
            ? `${network.unmatchedSynapses} synapse${network.unmatchedSynapses === 1 ? "" : "s"} without a matching section (not shown)`
            : undefined
        }
      >
        <div className="flex flex-wrap gap-1">
          {network.synapses.length > 0 && (
            <IconToggle
              active={settings.synapses}
              title="Synapse markers on the morphology"
              onClick={() => setNetwork({ synapses: !settings.synapses })}
              icon={<span className="size-1.5 rounded-full bg-amber-400" />}
              label={`${formatCount(network.synapses.length)} synapses`}
            />
          )}
          {network.stimulators.length > 0 && (
            <IconToggle
              active={settings.stimulators}
              title="Stimulator glyphs beside the arbor"
              onClick={() => setNetwork({ stimulators: !settings.stimulators })}
              icon={<span className="size-1.5 rotate-45 bg-violet-400" />}
              label={`${formatCount(network.stimulators.length)} stimulators`}
            />
          )}
          {network.connections.length > 0 && (
            <IconToggle
              active={settings.connections}
              title="Stimulator → synapse connections"
              onClick={() => setNetwork({ connections: !settings.connections })}
              icon={<span className="h-px w-2 bg-violet-300" />}
              label={`${formatCount(network.connections.length)} connections`}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <Swatch color={SYNAPSE_EXCITATORY_COLOR} label="excitatory" />
          <Swatch color={SYNAPSE_INHIBITORY_COLOR} label="inhibitory" />
          <Swatch color={STIMULATOR_COLOR} label="stimulator" />
        </div>
      </CardSection>
    </LayerCardShell>
  );
};

/** The Layers tab: the viewer's cards, fed from the model data. */
export const MorphologyLayerCards = () => {
  const { morphology, importance, network, focus } = useMorphologyData();
  return (
    <div className="flex flex-col gap-1.5 p-2">
      <MorphologyLayerCard morphology={morphology} importance={importance} zoomed={focus !== null} />
      <NetworkLayerCard network={network} />
    </div>
  );
};
