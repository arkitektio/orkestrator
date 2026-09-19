import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * The one colormap control every card speaks: a compact SELECT showing the
 * current choice as a swatch + name, the alternatives folded into a dropdown
 * rather than spread out as a list or a pill strip.
 *
 * Deliberately dumb about what the choices ARE. Which set a caller offers —
 * the continuous `ColorMap` ramps or the categorical instance palettes — is
 * decided by the COLUMN being coloured (measure vs categorical), and that
 * decision lives at the call sites, not here.
 */
export type ColormapChoice = {
  value: string;
  label: string;
  /** The swatch's CSS background — a gradient for a ramp or a palette. */
  css: string;
  disabled?: boolean;
};

export const ColormapSelect = ({
  value,
  choices,
  onChange,
  title,
}: {
  value: string;
  choices: readonly ColormapChoice[];
  onChange: (value: string) => void;
  title?: string;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger
      size="sm"
      title={title}
      className="h-6 w-full border-white/10 bg-black/30 px-1.5 text-[10px] text-white/80"
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {choices.map((choice) => (
        <SelectItem
          key={choice.value}
          value={choice.value}
          disabled={choice.disabled}
          className="text-[10px]"
        >
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-8 shrink-0 rounded-sm border border-white/15"
              style={{ background: choice.css }}
            />
            {choice.label}
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
