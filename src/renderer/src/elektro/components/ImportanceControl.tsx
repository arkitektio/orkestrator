import { Button } from "@/core/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/core/components/ui/popover";
import { Slider } from "@/core/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/core/components/ui/tooltip";
import { Flame, HelpCircle, Pin, RotateCcw, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DEFAULT_WEIGHTS,
  DominanceWeights,
  heatmapGradientCss,
  isDefaultWeights,
  WEIGHT_FIELDS,
} from "../lib/importance";

export type ImportanceControlProps = {
  /** pinned || preview — drives the "on" emphasis and shows the legend. */
  active: boolean;
  pinned: boolean;
  /** Ephemeral preview: hovering the pill OR the settings popover being open. */
  onPreviewChange: (previewing: boolean) => void;
  /** Click the pill to pin/unpin the heatmap. */
  onTogglePin: () => void;
  weights: DominanceWeights;
  onWeightsChange: (weights: DominanceWeights) => void;
  min?: number;
  max?: number;
  /** "dark" for the 3D canvas overlay, "card" for light flow surfaces. */
  variant?: "dark" | "card";
  className?: string;
};

const fmt = (v?: number) =>
  v === undefined
    ? ""
    : Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.01)
      ? v.toExponential(1)
      : v.toFixed(2);

/** Plain-language explanation of how the dominance score is derived. */
const HelpTooltip = ({ dark }: { dark: boolean }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label="How is importance derived?"
        className={`rounded-full p-0.5 transition-colors ${
          dark ? "text-white/50 hover:text-white" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <HelpCircle className="size-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs space-y-1.5 text-xs leading-relaxed">
      <p>
        <span className="font-semibold">Importance</span> scores how much each
        section shapes the whole model — derived analytically from its geometry
        and channels (no simulation is run).
      </p>
      <p>It blends three factors, each as the section's share of the cell:</p>
      <ul className="ml-3 list-disc space-y-0.5">
        <li>
          <span className="font-medium">Conductance load</span> — channel
          density × surface area
        </li>
        <li>
          <span className="font-medium">Capacitance</span> — specific
          capacitance × area
        </li>
        <li>
          <span className="font-medium">Axial coupling</span> — from diameter,
          length &amp; axial resistivity
        </li>
      </ul>
      <p>
        The score is that weighted blend, normalized so all sections sum to 1.
        Use <span className="font-medium">Settings</span> to tune the weights.
      </p>
    </TooltipContent>
  </Tooltip>
);

const WeightSettings = ({
  weights,
  onWeightsChange,
}: {
  weights: DominanceWeights;
  onWeightsChange: (w: DominanceWeights) => void;
}) => {
  // Local draft so the sliders stay responsive while dragging; we only push to
  // the parent (which refetches) on release (onValueCommit).
  const [draft, setDraft] = useState<DominanceWeights>(weights);
  useEffect(() => setDraft(weights), [weights]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">Dominance weighting</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-[0.625rem] text-muted-foreground"
          disabled={isDefaultWeights(weights)}
          onClick={() => onWeightsChange(DEFAULT_WEIGHTS)}
        >
          <RotateCcw className="size-3" />
          Reset
        </Button>
      </div>

      {WEIGHT_FIELDS.map((field) => {
        const raw = draft[field.key];
        const value = raw ?? field.defaultValue;
        const isDefault = raw == null;
        return (
          <div key={field.key} className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium">{field.label}</span>
              <span className="font-mono text-[0.625rem] text-muted-foreground">
                {isDefault ? `${field.defaultValue.toFixed(2)} · default` : value.toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[value]}
              onValueChange={([n]) =>
                setDraft((d) => ({ ...d, [field.key]: n }))
              }
              onValueCommit={([n]) =>
                onWeightsChange({ ...draft, [field.key]: n })
              }
            />
            <p className="text-[0.625rem] leading-tight text-muted-foreground">
              {field.description}
            </p>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Small overlay control to recolor a neuron morphology by dominance
 * "importance". Hovering the pill previews the heatmap; clicking it pins the
 * heatmap on. A "?" tooltip explains how the score is derived; a settings
 * popover tunes the three blend weights (which refetch the score). A gradient
 * legend (min → max) appears while active. Reused by the 3D renderer and the
 * tree view.
 */
export const ImportanceControl = ({
  active,
  pinned,
  onPreviewChange,
  onTogglePin,
  weights,
  onWeightsChange,
  min,
  max,
  variant = "dark",
  className,
}: ImportanceControlProps) => {
  const dark = variant === "dark";

  // Preview is on while the pill is hovered OR the settings popover is open.
  const [hovering, setHovering] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(
    () => onPreviewChange(hovering || settingsOpen),
    [hovering, settingsOpen, onPreviewChange],
  );

  const customized = !isDefaultWeights(weights);

  const shell = dark
    ? "border-white/10 bg-black/60 text-white/80 backdrop-blur-md"
    : "border bg-card text-card-foreground shadow-sm";
  const pillActive = dark
    ? "bg-white/15 text-white ring-1 ring-white/30"
    : "bg-primary/10 text-primary ring-1 ring-primary/40";
  const pillIdle = dark ? "hover:bg-white/10" : "hover:bg-muted";
  const iconBtn = dark
    ? "text-white/60 hover:bg-white/10 hover:text-white"
    : "text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div
      className={`flex flex-col gap-2 rounded-md p-2 ${shell} ${className ?? ""}`}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onPointerEnter={() => setHovering(true)}
          onPointerLeave={() => setHovering(false)}
          onClick={onTogglePin}
          title={pinned ? "Unpin importance heatmap" : "Hover to preview · click to pin importance heatmap"}
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
            active ? pillActive : pillIdle
          }`}
        >
          <Flame className="size-3.5" />
          <span>Importance</span>
          {pinned && <Pin className="size-3 fill-current" />}
        </button>

        <HelpTooltip dark={dark} />

        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Weighting settings"
              title="Weighting settings"
              className={`relative rounded p-1 transition-colors ${iconBtn} ${
                settingsOpen ? (dark ? "bg-white/10 text-white" : "bg-muted") : ""
              }`}
            >
              <Settings2 className="size-3.5" />
              {customized && (
                <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-primary" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <WeightSettings weights={weights} onWeightsChange={onWeightsChange} />
          </PopoverContent>
        </Popover>
      </div>

      {active && (
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-right font-mono text-[0.5625rem] opacity-60">
            {fmt(min)}
          </span>
          <div
            className="h-2 flex-1 rounded-full"
            style={{ background: heatmapGradientCss() }}
          />
          <span className="w-10 shrink-0 font-mono text-[0.5625rem] opacity-60">
            {fmt(max)}
          </span>
        </div>
      )}
    </div>
  );
};

export default ImportanceControl;
