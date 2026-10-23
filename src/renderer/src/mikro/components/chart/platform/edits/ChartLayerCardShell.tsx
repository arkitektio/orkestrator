import { Eye, EyeOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CardSection, LayerCardShell } from "@/core/data/scene/layerui/cardControls";
import { Button } from "@/core/ui/button";
import type { ChartLayerState } from "../model/chartLayerModel";
import { ChartLayerMenu } from "./ChartLayerMenu";
import { ChartLayerPlacement } from "./ChartLayerPlacement";

/** The look of a header button, the scene cards' compact dialect. */
export const CHART_CARD_BUTTON = "h-5 w-5 shrink-0 p-0 text-white/45 hover:text-white/90";

/**
 * The surface every chart layer card wears: the scene's `LayerCardShell`, so a
 * chart's layers read as the same list as a scene's — the tile, the 11px name,
 * the trailing icon actions, the fold on a header click.
 *
 * The tile is the layer's colour, as a disc: on a chart the colour IS what tells
 * one line from another. What the layer reads, and why it is not drawn when it
 * is not, stay under the header whether folded or not; the rest unfolds.
 */
export const ChartLayerCardShell = ({
  layer,
  hidden,
  onToggleHidden,
  badges,
  actions,
  children,
}: {
  layer: ChartLayerState;
  hidden: boolean;
  onToggleHidden: (id: string, hidden: boolean) => void;
  badges?: ReactNode;
  /** Kind-specific buttons, before visibility and the menu. */
  actions?: ReactNode;
  children?: ReactNode;
}) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <LayerCardShell
      icon={<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: layer.color }} />}
      tile="bg-white/10"
      title={layer.label}
      badges={badges}
      hidden={hidden}
      expanded={expanded}
      onToggle={() => setExpanded((open) => !open)}
      actions={
        <>
          {actions}
          <Button
            variant="ghost"
            size="icon"
            className={CHART_CARD_BUTTON}
            title={hidden ? "Show on the chart" : "Hide from the chart"}
            onClick={() => onToggleHidden(layer.id, !hidden)}
          >
            {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          <ChartLayerMenu layerId={layer.id} label={layer.label} triggerClassName={CHART_CARD_BUTTON} />
        </>
      }
      pinned={
        <div className="flex flex-col gap-0.5 px-2 pb-1.5">
          <span className="truncate font-mono text-[9px] text-white/40" title={layer.reads}>
            {layer.reads}
          </span>
          <ChartLayerPlacement layer={layer} />
        </div>
      }
    >
      {children}
    </LayerCardShell>
  );
};

/** One fact a card states: omitted entirely when there is no value. */
export const ChartFact = ({ label, value }: { label: string; value: ReactNode | null | undefined }) => {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 text-[9px] font-medium uppercase tracking-[0.08em] text-white/35">
        {label}
      </span>
      <span className="ml-auto truncate font-mono text-[10px] tabular-nums text-white/60">{value}</span>
    </div>
  );
};

/** The facts block of a card: what is drawn, from where, at which scale. */
export const ChartFacts = ({ children, error }: { children: ReactNode; error?: string | null }) => (
  <CardSection title="data">
    <div className="flex flex-col gap-0.5">{children}</div>
    {error && (
      <div className="truncate text-[10px] text-red-300" title={error}>
        {error}
      </div>
    )}
  </CardSection>
);
