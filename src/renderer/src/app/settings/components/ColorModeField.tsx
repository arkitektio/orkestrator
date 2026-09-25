import { Label } from "@/core/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { useTheme, type Theme } from "@/core/settings/theme/ThemeProvider";
import { Laptop, Moon, Sun } from "lucide-react";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

/**
 * Light, dark, or whatever the OS is using — the first row of Appearance.
 *
 * Not part of the settings form beneath it: the theme is applied the instant
 * it is chosen (it would be strange to pick "Light" and stay in the dark
 * until Save), and it is stored by `ThemeProvider` on its own key, so it is
 * not a `Settings` field. Three explicit choices rather than a switch because
 * "follow the system" is a real third state, and a switch cannot show it.
 */
export const ColorModeField = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-2">
      <Label>Color mode</Label>
      <ToggleGroup
        type="single"
        variant="outline"
        value={theme}
        // Radix reports "" when the pressed item is pressed again; a mode
        // cannot be un-chosen, so ignore that.
        onValueChange={(value) => {
          if (value) setTheme(value as Theme);
        }}
        aria-label="Color mode"
        className="justify-start"
      >
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <ToggleGroupItem key={value} value={value} aria-label={label} className="gap-2 px-3">
            <Icon className="h-4 w-4" />
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">
        System follows your operating system, and changes with it.
      </p>
    </div>
  );
};

export default ColorModeField;
