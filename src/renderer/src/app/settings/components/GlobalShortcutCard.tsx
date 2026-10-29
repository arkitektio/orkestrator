import { shortcutConflict } from "@/core/command/shortcuts";
import { useSettingsStore } from "@/core/settings/store/SettingsContext";
import type { Settings } from "@/core/settings/store/validator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { FormDescription, FormItem, FormLabel } from "@/core/ui/form";
import { Switch } from "@/core/ui/switch";
import { Keyboard } from "lucide-react";
import { useCallback } from "react";
import { useController, useFormContext } from "react-hook-form";
import { ShortcutRecorder } from "./ShortcutRecorder";

const DEFAULT_SHORTCUT = "CommandOrControl+Shift+Space";

/** What main said about the last change, in words. */
const STATUS_TEXT = {
  taken: "Another app already uses this shortcut — pick another. The previous one is still active.",
  invalid: "This shortcut cannot be registered with the system — pick another.",
} as const;

/**
 * The system-wide shortcut: summons the floating quick bar (main's
 * QuickPaletteWindow) over any app. Lives inside `SettingsForm` (auto-saving); the settings store
 * hands the value to main, and main's answer comes back as
 * `globalShortcutStatus` — a combination another app holds is refused there,
 * not here.
 */
export const GlobalShortcutCard = () => {
  const { field } = useController<Settings, "globalPaletteShortcut">({
    name: "globalPaletteShortcut",
  });
  const status = useSettingsStore((s) => s.globalShortcutStatus);
  const { getValues } = useFormContext<Settings>();
  // Pressed inside the app, a system-wide shortcut fires too, so it may not
  // share a combination with an in-app one either.
  const conflict = useCallback(
    (accelerator: string) => shortcutConflict(accelerator, "globalPaletteShortcut", getValues())?.label ?? null,
    [getValues],
  );
  const enabled = field.value !== null;
  // The web build has no main process, so nothing could register it.
  const available = typeof window !== "undefined" && !!window.api?.palette;

  const refused =
    status && (status.status === "taken" || status.status === "invalid") ? STATUS_TEXT[status.status] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Global shortcut
        </CardTitle>
        <CardDescription>
          Opens a floating search bar over whatever app is in front — search, open, run actions —
          without bringing Orkestrator's window forward. What you open lands as a tab in the main
          window. ⌘K keeps working inside Orkestrator either way.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!available && (
          <p className="text-sm text-muted-foreground">Only available in the desktop app.</p>
        )}
        <FormItem className="flex items-center justify-between gap-4">
          <FormLabel>Enabled</FormLabel>
          <Switch
            checked={enabled}
            disabled={!available}
            onCheckedChange={(on) => field.onChange(on ? DEFAULT_SHORTCUT : null)}
          />
        </FormItem>
        {enabled && (
          <FormItem>
            <FormLabel>Shortcut</FormLabel>
            <ShortcutRecorder
              value={field.value}
              defaultValue={DEFAULT_SHORTCUT}
              onChange={field.onChange}
              disabled={!available}
              conflict={conflict}
            />
            {refused ? (
              <p className="text-sm text-destructive">{refused}</p>
            ) : (
              <FormDescription>
                Click, then press the combination. It needs ⌘/Ctrl or ⌥/Alt (or a function key),
                so it never swallows ordinary typing in other apps. Esc cancels.
              </FormDescription>
            )}
          </FormItem>
        )}
      </CardContent>
    </Card>
  );
};

export default GlobalShortcutCard;
