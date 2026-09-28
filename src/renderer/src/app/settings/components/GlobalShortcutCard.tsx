import { acceleratorFromKeyPress, formatAccelerator } from "@/core/command/accelerator";
import { useSettingsStore } from "@/core/settings/store/SettingsContext";
import type { Settings } from "@/core/settings/store/validator";
import { Button } from "@/core/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { FormDescription, FormItem, FormLabel } from "@/core/ui/form";
import { Switch } from "@/core/ui/switch";
import { Keyboard } from "lucide-react";
import { useEffect, useState } from "react";
import { useController } from "react-hook-form";

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
  const [recording, setRecording] = useState(false);
  const enabled = field.value !== null;
  // The web build has no main process, so nothing could register it.
  const available = typeof window !== "undefined" && !!window.api?.palette;

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Swallow everything while recording, the palette's own ⌘K included.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === "Escape") {
        setRecording(false);
        return;
      }
      const accelerator = acceleratorFromKeyPress(event);
      if (!accelerator) return; // modifiers still being held
      field.onChange(accelerator);
      setRecording(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording, field]);

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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!available}
                onClick={() => setRecording(true)}
              >
                {recording ? "Press a shortcut…" : formatAccelerator(field.value ?? DEFAULT_SHORTCUT)}
              </Button>
              {field.value !== DEFAULT_SHORTCUT && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => field.onChange(DEFAULT_SHORTCUT)}
                >
                  Reset
                </Button>
              )}
            </div>
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
