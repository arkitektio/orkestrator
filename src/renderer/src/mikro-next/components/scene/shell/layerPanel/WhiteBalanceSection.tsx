import { useState } from "react";
import { Pipette, RotateCcw } from "lucide-react";

import { Slider } from "@/components/ui/slider";
import { CardSection, RowAction, Segment, SegmentGroup } from "@/lib/scene/layerui/cardControls";
import type { Plane } from "./rgbPlanes";
import { useNeutralPick } from "./useNeutralPick";
import {
  MIN_GAIN,
  autoGains,
  gainsForNeutral,
  gainsFromTemperatureTint,
  isNeutral,
  temperatureTintFromGains,
  windowed,
  type Gains,
} from "./whiteBalance";

/** Row colours, in slot order — the same primaries the channel rows use. */
const PRIMARY_CSS = ["#ef4444", "#22c55e", "#3b82f6"] as const;
const PRIMARY_NAMES = ["Red", "Green", "Blue"] as const;

const SliderRow = ({
  label,
  title,
  value,
  min,
  max,
  readout,
  onChange,
}: {
  label: React.ReactNode;
  title: string;
  value: number;
  min: number;
  max: number;
  readout: string;
  onChange: (value: number) => void;
}) => (
  <div className="flex items-center gap-1.5" title={title}>
    <span className="w-7 shrink-0 text-[9px] uppercase tracking-[0.08em] text-white/35">
      {label}
    </span>
    <Slider
      min={min}
      max={max}
      step={1}
      value={[value]}
      onValueChange={([next]) => onChange(next)}
      className="flex-1 py-1"
    />
    <span className="w-8 shrink-0 text-right font-mono text-[9px] text-white/40">{readout}</span>
  </div>
);

/**
 * The white-balance block of an RGB layer card: three per-primary gains
 * (`whiteBalance.ts`) with four ways to set them — a neutral-point pick in the
 * viewport, Auto from the planes' histograms, temperature/tint, and the raw
 * gains. All four write the same three numbers; nothing else is stored.
 */
export const WhiteBalanceSection = ({
  layerId,
  gains,
  slabs,
  mapped,
  climMin,
  climMax,
  onChange,
}: {
  layerId: string;
  gains: Gains;
  /** The atlas slab each primary reads — what the pick samples. */
  slabs: readonly [number, number, number];
  /** The three mapped planes, for Auto. */
  mapped: readonly Plane[];
  climMin: number;
  climMax: number;
  onChange: (gains: Gains) => void;
}) => {
  const [notice, setNotice] = useState<string | null>(null);

  const pick = useNeutralPick(layerId, slabs, (raw) => {
    const next = gainsForNeutral(raw.map((value) => windowed(value, climMin, climMax)));
    if (next) {
      setNotice(null);
      onChange(next);
    } else {
      setNotice("a primary is black or clipped to the window floor there — pick a brighter grey");
    }
  });

  const auto = autoGains(mapped, climMin, climMax);
  const { temperature, tint } = temperatureTintFromGains(gains);
  const neutral = isNeutral(gains);

  const setGain = (slot: number, gain: number) =>
    onChange(gains.map((current, i) => (i === slot ? gain : current)) as unknown as Gains);

  const hint =
    pick.state === "armed"
      ? "click a pixel that should be white or grey"
      : pick.state === "reading"
        ? "reading the picked voxel…"
        : (notice ??
          (neutral
            ? "neutral: each primary as the window renders it"
            : "each primary scaled by its gain after the exposure window"));

  return (
    <CardSection
      title="white balance"
      hint={hint}
      action={
        <div className="flex items-center gap-1">
          <SegmentGroup>
            <Segment
              active={pick.state !== "idle"}
              title={
                pick.state === "armed"
                  ? "Cancel the pick"
                  : "Pick a neutral point: click a white or grey pixel in the viewport"
              }
              onClick={() => (pick.state === "armed" ? pick.cancel() : pick.arm())}
            >
              <Pipette className="h-2.5 w-2.5" />
            </Segment>
            {auto && (
              <Segment
                active={false}
                title="Balance so each plane's brightest percentile (p99) renders white"
                onClick={() => {
                  setNotice(null);
                  onChange(auto);
                }}
              >
                auto
              </Segment>
            )}
          </SegmentGroup>
          {!neutral && (
            <RowAction
              title="Reset to neutral"
              onClick={() => {
                setNotice(null);
                onChange([1, 1, 1]);
              }}
            >
              <RotateCcw className="h-2.5 w-2.5" />
            </RowAction>
          )}
        </div>
      }
    >
      <SliderRow
        label="temp"
        title="Temperature: cooler (more blue) ↔ warmer (more red)"
        value={Math.round(temperature * 100)}
        min={-100}
        max={100}
        readout={`${temperature > 0 ? "+" : ""}${Math.round(temperature * 100)}`}
        onChange={(value) => onChange(gainsFromTemperatureTint({ temperature: value / 100, tint }))}
      />
      <SliderRow
        label="tint"
        title="Tint: greener ↔ more magenta"
        value={Math.round(tint * 100)}
        min={-100}
        max={100}
        readout={`${tint > 0 ? "+" : ""}${Math.round(tint * 100)}`}
        onChange={(value) => onChange(gainsFromTemperatureTint({ temperature, tint: value / 100 }))}
      />
      {PRIMARY_NAMES.map((name, slot) => (
        <SliderRow
          key={name}
          label={
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: PRIMARY_CSS[slot] }}
            />
          }
          title={`${name} gain`}
          value={Math.round(Math.min(1, gains[slot]) * 100)}
          min={Math.round(MIN_GAIN * 100)}
          max={100}
          readout={gains[slot].toFixed(2)}
          onChange={(value) => setGain(slot, value / 100)}
        />
      ))}
    </CardSection>
  );
};
