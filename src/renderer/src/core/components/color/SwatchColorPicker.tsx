import { useState } from "react";
import { RgbColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { cn } from "@/core/lib/utils";

/**
 * A colour swatch that opens `react-colorful`'s picker in a popover — the one
 * mikro's intensity layers use for their base colour, promoted so every viewer
 * picks colours the same way (mikro's transfer editor, elektro's layer cards).
 *
 * Two ways to hear about a change, for two kinds of caller:
 *  - `onChange` fires on every drag tick — for a caller whose edit is cheap and
 *    local (mikro's transfer, redrawn live);
 *  - `onCommit` fires ONCE when the popover closes, and only if the colour moved —
 *    for a caller whose edit is a persisted write (elektro's layer cards: a drag
 *    through the square must be one mutation, not fifty).
 * While open, the swatch shows the colour being dragged, so a commit-on-close
 * caller still sees live feedback.
 *
 * Colours are RGBA 0–255 lists; alpha is carried through untouched (the picker
 * has none). `value` null means "not set": the swatch shows `fallback`.
 */

export type Rgba = readonly number[];

const toObj = (color: Rgba | null | undefined, fallback: Rgba) => {
  const [r = 0, g = 0, b = 0] = color && color.length >= 3 ? color : fallback;
  return { r, g, b };
};

const sameRgb = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) =>
  a.r === b.r && a.g === b.g && a.b === b.b;

export const SwatchColorPicker = ({
  value,
  fallback = [138, 180, 248],
  onChange,
  onCommit,
  title = "Colour",
  align = "end",
  className,
}: {
  value: Rgba | null | undefined;
  /** What the swatch shows while `value` is null (e.g. the viewer's own pick). */
  fallback?: Rgba;
  onChange?: (rgba: number[]) => void;
  onCommit?: (rgba: number[]) => void;
  title?: string;
  align?: "start" | "center" | "end";
  className?: string;
}) => {
  const alpha = value?.[3] ?? 255;
  const committed = toObj(value, fallback);
  const [draft, setDraft] = useState<{ r: number; g: number; b: number } | null>(null);
  const shown = draft ?? committed;

  const onOpenChange = (open: boolean) => {
    if (open) {
      setDraft(committed);
      return;
    }
    if (draft && onCommit && !sameRgb(draft, committed)) {
      onCommit([draft.r, draft.g, draft.b, alpha]);
    }
    setDraft(null);
  };

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title}
          className={cn("h-5 w-5 shrink-0 cursor-pointer rounded border border-border/60", className)}
          style={{ background: `rgb(${shown.r}, ${shown.g}, ${shown.b})` }}
        />
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-2">
        <RgbColorPicker
          color={shown}
          onChange={(c) => {
            setDraft(c);
            onChange?.([c.r, c.g, c.b, alpha]);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
