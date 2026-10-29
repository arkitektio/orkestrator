import { formatAccelerator } from "@/core/command/accelerator";
import {
  CONFIGURABLE_SHORTCUTS,
  FIXED_SHORTCUTS,
  SHORTCUT_GROUPS,
  shortcutConflict,
  voiceAccelerator,
  type ConfigurableShortcut,
} from "@/core/command/shortcuts";
import { defaultSettings, type Settings } from "@/core/settings/store/validator";
import { Button } from "@/core/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { FormDescription, FormField, FormItem, FormLabel } from "@/core/ui/form";
import { useCallback } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Link } from "react-router-dom";
import { GlobalShortcutCard } from "../components/GlobalShortcutCard";
import { SettingsForm } from "../components/SettingsForm";
import { SettingsPage } from "../components/SettingsPage";
import { ShortcutRecorder } from "../components/ShortcutRecorder";
import { settingsLink } from "../sections";

/** A shortcut as the keys to press. */
const Keys = ({ accelerator }: { accelerator: string }) => (
  <kbd className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
    {formatAccelerator(accelerator)}
  </kbd>
);

/**
 * What already holds a combination, read from the form as it stands — so a
 * shortcut just changed on this page counts before it has saved.
 */
const useConflict = (ownId: string) => {
  const { getValues } = useFormContext<Settings>();
  return useCallback(
    (accelerator: string) => shortcutConflict(accelerator, ownId, getValues())?.label ?? null,
    [getValues, ownId],
  );
};

const ConfigurableRow = ({ shortcut }: { shortcut: ConfigurableShortcut }) => {
  const { control } = useFormContext<Settings>();
  const conflict = useConflict(shortcut.key);
  const fallback = defaultSettings[shortcut.key] ?? "";

  return (
    <FormField
      control={control}
      name={shortcut.key}
      render={({ field }) => (
        <FormItem className="flex flex-row items-start justify-between gap-4 py-3">
          <div className="flex flex-col gap-1">
            <FormLabel>{shortcut.label}</FormLabel>
            <FormDescription>{field.value ? shortcut.description : "Off."}</FormDescription>
          </div>
          <div className="flex shrink-0 items-start gap-1">
            {field.value ? (
              <>
                <ShortcutRecorder
                  value={field.value}
                  defaultValue={fallback}
                  onChange={field.onChange}
                  conflict={conflict}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange(null)}>
                  Turn off
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // The default may have been taken meanwhile; then it stays
                  // off rather than doubling up.
                  if (!conflict(fallback)) field.onChange(fallback);
                }}
              >
                Turn on
              </Button>
            )}
          </div>
        </FormItem>
      )}
    />
  );
};

const VoiceRow = () => {
  const code = useWatch<Settings, "voiceHotkey">({ name: "voiceHotkey" });
  const enabled = useWatch<Settings, "voiceControl">({ name: "voiceControl" });
  const accelerator = voiceAccelerator(code);
  return (
    <div className="flex flex-row items-center justify-between gap-4 py-2 text-sm">
      <span>
        Dictate{" "}
        <Link to={settingsLink("voice")} className="text-muted-foreground underline-offset-2 hover:underline">
          {enabled ? "(change in Voice input)" : "(off, in Voice input)"}
        </Link>
      </span>
      {accelerator && <Keys accelerator={accelerator} />}
    </div>
  );
};

export const ShortcutsPage = () => (
  <SettingsPage slug="shortcuts">
    <SettingsForm>
      <Card>
        <CardHeader>
          <CardTitle>Yours to change</CardTitle>
          <CardDescription>
            Click a shortcut, then press the new combination. It needs ⌘/Ctrl or ⌥/Alt (or a
            function key). Esc cancels. A combination something else already uses is refused.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {CONFIGURABLE_SHORTCUTS.map((shortcut) => (
            <ConfigurableRow key={shortcut.key} shortcut={shortcut} />
          ))}
        </CardContent>
      </Card>

      <GlobalShortcutCard />

      <Card>
        <CardHeader>
          <CardTitle>Built in</CardTitle>
          <CardDescription>These are fixed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {SHORTCUT_GROUPS.map((group) => {
            const entries = FIXED_SHORTCUTS.filter((entry) => entry.group === group.key);
            const voice = group.key === "voice";
            if (entries.length === 0 && !voice) return null;
            return (
              <section key={group.key}>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </h3>
                <div className="divide-y">
                  {entries.map((entry) => (
                    <div key={entry.id} className="flex flex-row items-center justify-between gap-4 py-2 text-sm">
                      <span>{entry.label}</span>
                      <Keys accelerator={entry.accelerator} />
                    </div>
                  ))}
                  {voice && <VoiceRow />}
                </div>
              </section>
            );
          })}
        </CardContent>
      </Card>
    </SettingsForm>
  </SettingsPage>
);

export default ShortcutsPage;
