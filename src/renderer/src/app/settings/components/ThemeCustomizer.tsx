import { Arkitekt, Guard } from "@/core/connection/arkitekt/host";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import MembershipBrandWriter, {
  type EditedBrand,
} from "@/lok/components/MembershipBrandWriter";
import type { BrandSource } from "@/core/settings/store/brandTheme";
import { defaultSettings, Settings } from "@/core/settings/store/validator";
import { Laptop, UsersRound } from "lucide-react";
import React from "react";
import { Control, useController } from "react-hook-form";

type Props = {
  control: Control<Settings>;
};

const DEFAULT_HUE = defaultSettings.brandHue!;
const DEFAULT_CHROMA = defaultSettings.brandChroma!;

// Pre-mapped OKLCH approximate equivalents for standard Tailwind colors
const PRESETS = [
  { name: "Red", hue: 27, chroma: 0.22 },
  { name: "Orange", hue: 45, chroma: 0.2 },
  { name: "Amber", hue: 70, chroma: 0.2 },
  { name: "Yellow", hue: 100, chroma: 0.18 },
  { name: "Lime", hue: 130, chroma: 0.18 },
  { name: "Green", hue: 145, chroma: 0.18 },
  { name: "Emerald", hue: 160, chroma: 0.16 },
  { name: "Teal", hue: 175, chroma: 0.15 },
  { name: "Cyan", hue: 195, chroma: 0.15 },
  { name: "Sky", hue: 225, chroma: 0.15 },
  { name: "Blue", hue: 250, chroma: 0.2 },
  { name: "Indigo", hue: 275, chroma: 0.2 },
  { name: "Violet", hue: 290, chroma: 0.2 },
  { name: "Purple", hue: 310, chroma: 0.2 },
  { name: "Fuchsia", hue: 330, chroma: 0.2 },
  { name: "Pink", hue: 345, chroma: 0.2 },
  { name: "Rose", hue: 355, chroma: 0.2 },
];

const SOURCES: { value: BrandSource; label: string; icon: typeof Laptop }[] = [
  { value: "membership", label: "Membership colour", icon: UsersRound },
  { value: "local", label: "Local colour", icon: Laptop },
];

/**
 * Hue, chroma, a preview and the presets — one picker, used for whichever
 * colour is being edited. It only reports; where the colour goes is the
 * caller's business.
 */
const BrandPicker = ({
  hue,
  chroma,
  onChange,
  disabled,
  actions,
}: {
  hue: number;
  chroma: number;
  onChange: (hue: number, chroma: number) => void;
  disabled?: boolean;
  actions?: React.ReactNode;
}) => {
  const change = (nextHue: number, nextChroma: number) => {
    if (Number.isFinite(nextHue) && Number.isFinite(nextChroma)) onChange(nextHue, nextChroma);
  };

  return (
    <fieldset disabled={disabled} className="space-y-6 disabled:opacity-60">
      <div className="grid gap-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="brand-hue">Brand Hue (°)</Label>
            <span className="text-sm text-muted-foreground">{hue.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-4">
            <input
              id="brand-hue"
              type="range"
              min="0"
              max="360"
              step="0.1"
              value={hue}
              onChange={(e) => change(parseFloat(e.target.value), chroma)}
              className="flex-1 accent-primary"
            />
            <Input
              type="number"
              min="0"
              max="360"
              step="0.1"
              value={hue}
              onChange={(e) => change(parseFloat(e.target.value), chroma)}
              className="w-20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="brand-chroma">Brand Chroma</Label>
            <span className="text-sm text-muted-foreground">{chroma.toFixed(3)}</span>
          </div>
          <div className="flex items-center gap-4">
            <input
              id="brand-chroma"
              type="range"
              min="0"
              max="0.4"
              step="0.001"
              value={chroma}
              onChange={(e) => change(hue, parseFloat(e.target.value))}
              className="flex-1 accent-primary"
            />
            <Input
              type="number"
              min="0"
              max="0.4"
              step="0.001"
              value={chroma}
              onChange={(e) => change(hue, parseFloat(e.target.value))}
              className="w-20"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <div
            className="w-12 h-12 rounded-md border shadow-sm"
            style={{ backgroundColor: `oklch(60% ${chroma} ${hue})` }}
            title={`oklch(60% ${chroma} ${hue})`}
          />
          <div className="flex-1 text-sm font-mono text-muted-foreground">
            oklch(L {chroma.toFixed(3)} {hue.toFixed(1)})
          </div>
          {actions}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Presets</Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="w-8 h-8 rounded-full border border-input ring-offset-background hover:ring-2 hover:ring-ring hover:ring-offset-2 transition-all"
              style={{ backgroundColor: `oklch(60% ${p.chroma} ${p.hue})` }}
              onClick={() => change(p.hue, p.chroma)}
              aria-label={`Set color to ${p.name}`}
              title={p.name}
            />
          ))}
        </div>
      </div>
    </fieldset>
  );
};

/**
 * The colour on your membership in the active organization — stored on lok,
 * so it follows you to every machine. Edits go ONLY there (never into local
 * settings), and the picker shows what the membership holds, not this
 * machine's colour.
 *
 * Mounted inside `Guard.Lok`: the writer's mutation needs lok's client.
 */
const MembershipBrandEditor = () => {
  const profile = Arkitekt.useActiveProfile();
  const stored = {
    hue: profile?.label.brandHue ?? undefined,
    chroma: profile?.label.brandChroma ?? undefined,
  };
  // Null until the user touches the picker — see `MembershipBrandWriter`.
  const [edited, setEdited] = React.useState<EditedBrand | null>(null);

  const hue = edited?.hue ?? stored.hue ?? DEFAULT_HUE;
  const chroma = edited?.chroma ?? stored.chroma ?? DEFAULT_CHROMA;
  const unset = !edited && stored.hue === undefined && stored.chroma === undefined;

  return (
    <div className="space-y-3">
      {unset && (
        <p className="text-xs text-muted-foreground">
          Neither your membership nor your organization has a colour yet, so the app uses your
          local colour. Pick one to set it for your membership.
        </p>
      )}
      <BrandPicker
        hue={hue}
        chroma={chroma}
        onChange={(nextHue, nextChroma) => setEdited({ hue: nextHue, chroma: nextChroma })}
        actions={<MembershipBrandWriter brand={edited} onCleared={() => setEdited(null)} />}
      />
    </div>
  );
};

/** This machine's own colour, in local settings. Never sent anywhere. */
const LocalBrandEditor = ({ control }: Props) => {
  const { field: hueField } = useController({ control, name: "brandHue" });
  const { field: chromaField } = useController({ control, name: "brandChroma" });

  const apply = (hue: number, chroma: number) => {
    hueField.onChange(hue);
    chromaField.onChange(chroma);
  };

  return (
    <BrandPicker
      hue={hueField.value ?? DEFAULT_HUE}
      chroma={chromaField.value ?? DEFAULT_CHROMA}
      onChange={apply}
      actions={
        <Button type="button" variant="outline" onClick={() => apply(DEFAULT_HUE, DEFAULT_CHROMA)}>
          Reset to Default
        </Button>
      }
    />
  );
};

/**
 * Whose colour tints the app, and that colour.
 *
 * Two sources, chosen explicitly: the membership colour (on lok, the same on
 * every machine you sign in from) or a local colour (this machine only). Each
 * has its own picker writing to its own place — one set of controls writing
 * both used to overwrite the membership with this machine's colour, and a
 * local edit was invisible whenever a membership colour existed.
 */
export const ThemeCustomizer: React.FC<Props> = ({ control }) => {
  const { field: sourceField } = useController({ control, name: "brandSource" });
  const source: BrandSource = sourceField.value ?? "membership";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Brand colour</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={source}
          onValueChange={(value) => {
            if (value) sourceField.onChange(value as BrandSource);
          }}
          aria-label="Brand colour source"
          className="justify-start"
        >
          {SOURCES.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem key={value} value={value} aria-label={label} className="gap-2 px-3">
              <Icon className="h-4 w-4" />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-xs text-muted-foreground">
          {source === "membership"
            ? "Stored on your membership in this organization, so it follows you to every machine. Falls back to the organization's colour."
            : "Only on this machine. Your membership colour is left as it is."}
        </p>
      </div>

      {source === "membership" ? (
        // Guarded from the outside — the writer's mutation hook must never
        // mount without lok's Apollo client.
        <Guard.Lok
          notConnectedFallback={
            <p className="text-xs text-muted-foreground">Sign in to change your membership colour.</p>
          }
          connectingFallback={
            <p className="text-xs text-muted-foreground">Connecting to your organization…</p>
          }
        >
          <MembershipBrandEditor />
        </Guard.Lok>
      ) : (
        <LocalBrandEditor control={control} />
      )}
    </div>
  );
};
