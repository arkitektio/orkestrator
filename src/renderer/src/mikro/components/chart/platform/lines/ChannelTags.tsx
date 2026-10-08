import { useMemo } from "react";
import { cn } from "@/core/util/utils";
import { chartChannelColors } from "./channelColors";

/** A lens over cells can leave hundreds of lines; a legend names the first few. */
export const CHANNEL_TAG_CAP = 8;

/**
 * Which line is which: a dot in each line's colour beside its name. Nothing for
 * a layer that draws one line — its own legend entry already says it.
 */
export const ChannelTags = ({
  color,
  labels,
  className,
}: {
  /** The layer's colour; the lines' are derived from it. */
  color: string;
  labels: readonly string[];
  className?: string;
}) => {
  const colors = useMemo(() => chartChannelColors(color, labels.length), [color, labels.length]);
  if (labels.length <= 1) return null;
  const rest = labels.length - CHANNEL_TAG_CAP;
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5", className)}>
      {labels.slice(0, CHANNEL_TAG_CAP).map((label, line) => (
        <span key={line} className="flex min-w-0 items-center gap-1">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: colors[line] }} />
          <span className="truncate text-[10px] text-foreground/80 drop-shadow">{label}</span>
        </span>
      ))}
      {rest > 0 && <span className="shrink-0 text-[10px] text-muted-foreground">+{rest} more</span>}
    </div>
  );
};
