import { formatDisplay } from "@/core/util/quantities";
import { cn } from "@/core/util/utils";
import { ChevronDown, Tags } from "lucide-react";
import { memo } from "react";

/**
 * The chrome both viewers' in-view metadata is drawn with — mikro's scene
 * overlay (`MetadataOverlay`) and elektro's unfolding channel tags (`ChannelMetadata`).
 *
 * Only the presentation is shared. WHICH anchors are in view is each viewer's own
 * question (a channel toggle and a dim slider in the scene, the drawn channels and
 * the visible time window on the timeline), and so is what an anchor carries
 * (a light path and a microscope in mikro, a rig and a recording site in elektro).
 */

export const MetadataHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9px] uppercase tracking-widest text-white/40">{children}</div>
);

export const MetadataRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-baseline gap-1.5">
    <span className="shrink-0 text-white/40">{label}</span>
    <span className="min-w-0 truncate font-mono text-white/85">{value}</span>
  </div>
);

/** The channel label an anchor names, as a small chip. */
export const MetadataChip = ({ children }: { children: React.ReactNode }) => (
  <span className="shrink-0 rounded border border-white/15 bg-white/5 px-1 py-px text-[9px] text-white/85">
    {children}
  </span>
);

/**
 * One in-view anchor's box; its spokes stack inside. Right-aligned by default
 * (the scene docks its overlay on the right edge); a panel hanging off a
 * left-hand label passes `align="start"`.
 */
export const MetadataAnchorBox = ({
  children,
  align = "end",
}: {
  children: React.ReactNode;
  align?: "start" | "end";
}) => (
  <div
    className={cn(
      "flex flex-col gap-1.5 rounded border border-white/10 bg-white/[0.03] p-1.5",
      align === "end" ? "items-end text-right" : "items-start text-left",
    )}
  >
    {children}
  </div>
);

/** Read-only shape of a value distribution — reference, not a levels editor.
 * Memoized on the histogram's identity (Apollo-cached, stable): the metadata
 * pane re-partitions on every layer edit (a clim drag ticks per frame), and
 * without the memo every tick rebuilt one `<rect>` per bin per anchor. */
export const HistogramSparkline = memo(function HistogramSparkline({
  histogram,
  tone = "overlay",
}: {
  histogram: readonly number[];
  /** `overlay`: white on the dark viewport chrome; `surface`: theme tokens, for a card. */
  tone?: "overlay" | "surface";
}) {
  // reduce, not Math.max(...bins): a fine-grained histogram would blow the
  // argument limit.
  const peak = histogram.reduce((best, count) => Math.max(best, count), 1);
  const step = 100 / Math.max(1, histogram.length);
  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      className={cn("h-6 w-full rounded-sm", tone === "overlay" ? "bg-white/5" : "bg-muted")}
      aria-hidden
    >
      {histogram.map((count, index) => {
        const height = (count / peak) * 24;
        return (
          <rect
            key={index}
            x={index * step}
            y={24 - height}
            width={step}
            height={height}
            className={tone === "overlay" ? "fill-white/50" : "fill-foreground/50"}
          />
        );
      })}
    </svg>
  );
});

export type ValueHistogramLike = {
  histogram?: readonly number[] | null;
  min?: number | null;
  max?: number | null;
  p1?: number | null;
  p99?: number | null;
};

/** The "Values" spoke: the distribution's shape (once it landed) and its limits. */
export const ValueHistogramSpoke = ({
  histogram,
  unit,
}: {
  histogram: ValueHistogramLike;
  unit?: string | null;
}) => {
  const limits = [
    histogram.min != null && `min ${histogram.min}`,
    histogram.max != null && `max ${histogram.max}`,
    histogram.p1 != null && `p1 ${histogram.p1}`,
    histogram.p99 != null && `p99 ${histogram.p99}`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-1">
      <MetadataHeader>Values{unit ? ` · ${unit}` : ""}</MetadataHeader>
      {histogram.histogram && histogram.histogram.length > 0 && (
        <HistogramSparkline histogram={histogram.histogram} />
      )}
      {limits.length > 0 && (
        <div className="font-mono text-[9px] text-white/50">{limits.join(" · ")}</div>
      )}
    </div>
  );
};

export type SettingLike = {
  name: string;
  quantity?: string | number | null;
  text?: string | null;
  number?: number | null;
  flag?: boolean | null;
};

/**
 * A `Setting` is a tagged union by which field is non-null — render whichever
 * one the server filled, and say nothing rather than "null" when none is.
 */
export const settingValue = (setting: SettingLike): string | null => {
  if (setting.quantity != null) return formatDisplay(setting.quantity);
  if (setting.text != null && setting.text !== "") return setting.text;
  if (setting.number != null) return String(setting.number);
  if (setting.flag != null) return setting.flag ? "on" : "off";
  return null;
};

export type DeviceLike = {
  kind?: string | null;
  label: string;
  settings: readonly SettingLike[];
};

/** One row per device: its kind, its label, and whichever settings are filled. */
export const DeviceRows = ({ devices }: { devices: readonly DeviceLike[] }) => (
  <>
    {devices.map((device) => {
      const settings = device.settings
        .map((setting) => {
          const value = settingValue(setting);
          return value === null ? null : `${setting.name} ${value}`;
        })
        .filter((entry): entry is string => entry !== null);
      return (
        <div key={`${device.kind ?? ""}:${device.label}`} className="pl-1">
          <MetadataRow
            label={device.kind ?? "device"}
            value={
              <>
                {device.label}
                {settings.length > 0 && (
                  <span className="text-white/45"> · {settings.join(" · ")}</span>
                )}
              </>
            }
          />
        </div>
      );
    })}
  </>
);

/**
 * The overlay's frame. Two states: COLLAPSED is nothing but a small unfold
 * button — no title, no count — cheap enough to leave up on every view and
 * quiet enough not to caption the picture. EXPANDED unfolds the panel, and only
 * then is `children` mounted, so the heavy anchor query a body runs fires only
 * once someone asked.
 *
 * `className` positions it (the scene docks it above its mode controls).
 * Controlled, so the fold state can outlive the frame — the host keeps it while
 * the frame unmounts for a moment (no layer has anchors, then one does again).
 */
export const MetadataOverlayFrame = ({
  title,
  className,
  expanded,
  setExpanded,
  children,
}: {
  /** Tooltip of the collapsed button. */
  title: string;
  className: string;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  children: React.ReactNode;
}) => {
  if (!expanded) {
    return (
      <button
        type="button"
        className={cn(
          "pointer-events-auto absolute z-30 flex h-6 w-6 items-center justify-center rounded-md border border-black/10 bg-black/40 text-white/70 backdrop-blur-md hover:text-white",
          className,
        )}
        title={title}
        aria-label="Show metadata"
        aria-expanded={false}
        onClick={() => setExpanded(true)}
      >
        <Tags className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-auto absolute z-30 flex max-h-[50vh] w-72 flex-col items-end overflow-hidden rounded-lg border border-black/10 bg-black/40 text-right backdrop-blur-md",
        className,
      )}
    >
      <button
        type="button"
        className="flex items-center gap-1.5 px-2 py-1 text-white/70 hover:text-white"
        title="Collapse metadata"
        aria-label="Hide metadata"
        aria-expanded
        onClick={() => setExpanded(false)}
      >
        <Tags className="h-3 w-3 shrink-0" />
        <ChevronDown className="h-3 w-3 shrink-0 text-white/50" />
      </button>
      <div className="min-h-0 w-full overflow-y-auto border-t border-white/10 px-1 pt-1">
        {children}
      </div>
    </div>
  );
};
