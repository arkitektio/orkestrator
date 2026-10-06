import type { ReactNode } from "react";

import { Slider } from "@/core/ui/slider";

/**
 * One labelled row of an in-viewport tool panel: a short uppercase label, the
 * control, and an optional numeric readout. Shared by every enhancer and
 * design panel so they line up when stacked.
 */
export const ParamRow = ({
  label,
  title,
  children,
  readout,
}: {
  label: string;
  title: string;
  children: ReactNode;
  readout?: string;
}) => (
  <div className="flex items-center gap-2" title={title}>
    <span className="w-12 select-none text-right text-[10px] font-medium uppercase text-muted-foreground">{label}</span>
    <div className="w-32">{children}</div>
    {readout !== undefined && (
      <span className="w-8 select-none text-[10px] tabular-nums text-muted-foreground">{readout}</span>
    )}
  </div>
);

/** A `ParamRow` holding one slider — the common case. */
export const SliderRow = ({
  label,
  title,
  value,
  min,
  max,
  step,
  readout,
  disabled,
  onChange,
}: {
  label: string;
  title: string;
  value: number;
  min: number;
  max: number;
  step: number;
  readout: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) => (
  <ParamRow label={label} title={title} readout={readout}>
    <Slider
      min={min}
      max={max}
      step={step}
      value={[value]}
      disabled={disabled}
      onValueChange={([next]) => onChange(next)}
    />
  </ParamRow>
);
