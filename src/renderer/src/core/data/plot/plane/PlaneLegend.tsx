import { colormapGradientCSS, type ColorMap } from "@/core/data/scene/gpu/colormaps";
import { formatSiValue } from "../coords/siFormat";

/**
 * A plane's legend, in the top-right corner of the plot area: one chip per
 * entry (a layer, or a group of one), and a colour bar for a value drawn as
 * colour. Stacked in one column and capped in height, so it never runs over
 * the plot; past a dozen entries it scrolls.
 */

export type LegendEntry = { key: string; label: string; color: string; muted?: boolean };
export type LegendScale = { title: string; colormap: ColorMap; lo: number; hi: number };

export const PlaneLegend = ({ entries, scale }: { entries: readonly LegendEntry[]; scale?: LegendScale | null }) => {
  if (entries.length <= 1 && !scale) return null;
  return (
    <div className="pointer-events-auto absolute right-2 top-2 flex max-h-[45%] w-44 flex-col gap-1.5 overflow-y-auto rounded-md border border-white/10 bg-zinc-950/75 p-2 text-[10px] backdrop-blur">
      {entries.length > 1 &&
        entries.map((entry) => (
          <div key={entry.key} className={`flex items-center gap-1.5 ${entry.muted ? "opacity-40" : ""}`}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="truncate text-foreground/80" title={entry.label}>
              {entry.label}
            </span>
          </div>
        ))}
      {scale && (
        <div className="flex flex-col gap-0.5">
          <span className="truncate text-foreground/60">{scale.title}</span>
          <div className="h-2 w-full rounded-sm" style={{ background: colormapGradientCSS(scale.colormap) }} />
          <div className="flex justify-between font-mono tabular-nums text-foreground/50">
            <span>{formatSiValue(scale.lo)}</span>
            <span>{formatSiValue(scale.hi)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Colours for the groups of one layer (conditions, clusters, channels), in
 * order: distinct on a dark canvas, colour-blind-safe in its first six.
 */
export const GROUP_PALETTE = ["#4e9cf5", "#f5a04a", "#46c08a", "#e8667c", "#a68cf7", "#3fc5d8", "#e9c84a", "#f07fc4"] as const;
export const groupColor = (index: number): string => GROUP_PALETTE[index % GROUP_PALETTE.length];
