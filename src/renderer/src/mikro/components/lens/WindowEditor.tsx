import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Plus, X } from "lucide-react";

/** One row of the editor: an axis and the two sides of its window, as typed. */
export type WindowDraft = { axis: string; min: string; max: string };

const parse = (text: string) => {
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : null;
};

/**
 * The windows a set of drafts states: only the axes that are actually
 * constrained, each side null where it was left blank. An axis with both sides
 * blank says nothing, which is exactly what the absence of a window means.
 */
export const windowsFromDrafts = (drafts: readonly WindowDraft[]) =>
  drafts.flatMap((draft) => {
    const axis = draft.axis.trim();
    const min = parse(draft.min);
    const max = parse(draft.max);
    return axis && (min !== null || max !== null) ? [{ axis, min, max }] : [];
  });

/** Drafts for a known set of axes, pre-filled from the windows of the lens cut again. */
export const draftsFor = (
  axes: readonly string[],
  windows: readonly { axis: string; min?: number | null; max?: number | null }[],
): WindowDraft[] => {
  const names = axes.length ? axes : windows.map((window) => window.axis);
  return names.map((axis) => {
    const window = windows.find((candidate) => candidate.axis === axis);
    return {
      axis,
      min: window?.min != null ? String(window.min) : "",
      max: window?.max != null ? String(window.max) : "",
    };
  });
};

/**
 * Cut a container by windows: an inclusive range per axis of the space it
 * lives in, either side left blank to stay open.
 *
 * With `fixedAxes` the rows are the container's axes and only the numbers are
 * typed. Without (a container whose space the client cannot read the axes of)
 * the axis is typed too, and rows are added and removed by hand; the server is
 * what says whether an axis by that name exists.
 */
export const WindowEditor = ({
  drafts,
  onChange,
  fixedAxes,
}: {
  drafts: readonly WindowDraft[];
  onChange: (drafts: WindowDraft[]) => void;
  fixedAxes: boolean;
}) => {
  const patch = (index: number, change: Partial<WindowDraft>) =>
    onChange(drafts.map((draft, i) => (i === index ? { ...draft, ...change } : draft)));

  return (
    <div className="flex flex-col gap-2">
      {drafts.map((draft, index) => (
        <div
          // Index-keyed on purpose: a typed axis name changes on every keystroke.
          key={fixedAxes ? draft.axis : index}
          className="grid grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-2"
        >
          {fixedAxes ? (
            <span className="truncate font-mono text-sm">{draft.axis}</span>
          ) : (
            <Input
              aria-label="Axis"
              placeholder="axis"
              className="h-8 font-mono text-xs"
              value={draft.axis}
              onChange={(event) => patch(index, { axis: event.target.value })}
            />
          )}
          <Input
            type="number"
            aria-label={`${draft.axis || "axis"} from`}
            placeholder="from (open)"
            className="h-8 font-mono text-xs"
            value={draft.min}
            onChange={(event) => patch(index, { min: event.target.value })}
          />
          <Input
            type="number"
            aria-label={`${draft.axis || "axis"} to`}
            placeholder="to (open)"
            className="h-8 font-mono text-xs"
            value={draft.max}
            onChange={(event) => patch(index, { max: event.target.value })}
          />
          {!fixedAxes && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label="Remove window"
              onClick={() => onChange(drafts.filter((_, i) => i !== index))}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}

      {!fixedAxes && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={() => onChange([...drafts, { axis: "", min: "", max: "" }])}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add window
        </Button>
      )}
    </div>
  );
};
