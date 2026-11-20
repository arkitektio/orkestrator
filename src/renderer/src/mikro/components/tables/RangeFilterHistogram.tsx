import * as React from "react";

import { Input } from "@/core/ui/input";
import { cn } from "@/core/util/utils";

type Range = { min?: number; max?: number };

const numberFormat = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6 });

/** The bins `[from, to]` cover, as a value range over `domain`. The last bin ends at the max exactly. */
export const binsToRange = (
  from: number,
  to: number,
  domain: { min: number; max: number },
  binCount: number,
): { min: number; max: number } => {
  const lo = Math.max(0, Math.min(from, to));
  const hi = Math.min(binCount - 1, Math.max(from, to));
  const width = (domain.max - domain.min) / binCount;
  return {
    min: domain.min + lo * width,
    max: hi === binCount - 1 ? domain.max : domain.min + (hi + 1) * width,
  };
};

/** Whether bin `index` overlaps `range` (an open bound reaches the end). */
const binInRange = (index: number, range: Range, domain: { min: number; max: number }, binCount: number) => {
  const width = (domain.max - domain.min) / binCount;
  const start = domain.min + index * width;
  const end = start + width;
  return (range.min === undefined || end > range.min) && (range.max === undefined || start <= range.max);
};

/**
 * A column's distribution that narrows the grid: drag across the bars to keep
 * the rows in that span, or type the bounds. Bars outside the range fade.
 * `onChange(null)` when the range is cleared.
 */
export const RangeFilterHistogram = ({
  histogram,
  domain,
  value,
  onChange,
}: {
  histogram: readonly number[];
  domain: { min: number; max: number };
  value: Range | undefined;
  onChange: (range: Range | null) => void;
}) => {
  const binCount = histogram.length;
  const peak = histogram.reduce((best, count) => Math.max(best, count), 1);
  const [drag, setDrag] = React.useState<{ from: number; to: number } | null>(null);
  const barsRef = React.useRef<HTMLDivElement>(null);
  const constant = !(domain.max > domain.min);

  const binAt = (clientX: number) => {
    const rect = barsRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const fraction = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(binCount - 1, Math.floor(fraction * binCount)));
  };

  const shown: Range | undefined = drag ? binsToRange(drag.from, drag.to, domain, binCount) : value;
  const active = !!shown && (shown.min !== undefined || shown.max !== undefined);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={barsRef}
        role="slider"
        aria-label="Drag across the bars to filter by range"
        aria-valuemin={domain.min}
        aria-valuemax={domain.max}
        title={constant ? undefined : "Drag across the bars to keep that range"}
        className={cn(
          "flex h-12 w-full touch-none select-none items-end gap-px rounded-sm bg-muted/60 px-px",
          !constant && "cursor-crosshair",
        )}
        onPointerDown={(event) => {
          if (constant || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          const bin = binAt(event.clientX);
          setDrag({ from: bin, to: bin });
        }}
        onPointerMove={(event) => {
          if (!drag) return;
          const bin = binAt(event.clientX);
          if (bin !== drag.to) setDrag({ ...drag, to: bin });
        }}
        onPointerUp={() => {
          if (!drag) return;
          onChange(binsToRange(drag.from, drag.to, domain, binCount));
          setDrag(null);
        }}
        onPointerCancel={() => setDrag(null)}
      >
        {histogram.map((count, index) => (
          <span
            key={index}
            className={cn(
              "min-h-px flex-1 rounded-t-[1px] transition-colors",
              !active || binInRange(index, shown!, domain, binCount) ? "bg-primary/70" : "bg-foreground/15",
            )}
            style={{ height: `${(count / peak) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <BoundInput
          label="From"
          placeholder={numberFormat.format(domain.min)}
          value={shown?.min}
          onCommit={(min) => onChange({ min, max: value?.max })}
        />
        <span className="text-muted-foreground">–</span>
        <BoundInput
          label="To"
          placeholder={numberFormat.format(domain.max)}
          value={shown?.max}
          onCommit={(max) => onChange({ min: value?.min, max })}
        />
        {value && (value.min !== undefined || value.max !== undefined) && (
          <button
            type="button"
            className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => onChange(null)}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

/** One bound: empty is open; committed on Enter or when the field is left. */
const BoundInput = ({
  label,
  placeholder,
  value,
  onCommit,
}: {
  label: string;
  placeholder: string;
  value: number | undefined;
  onCommit: (value: number | undefined) => void;
}) => {
  const format = (next: number | undefined) => (next === undefined ? "" : String(Number(next.toPrecision(6))));
  const [text, setText] = React.useState(format(value));
  // Follow the brush and the chips; the field only leads while typed in.
  React.useEffect(() => setText(format(value)), [value]);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === "") return onCommit(undefined);
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) onCommit(parsed);
    else setText(format(value));
  };

  return (
    <Input
      aria-label={label}
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => event.key === "Enter" && commit()}
      className="h-7 min-w-0 flex-1 px-2! font-mono text-xs tabular-nums"
    />
  );
};
