import type { Settings } from "@/core/settings/store/validator";
import { acceleratorFromKeyPress } from "./accelerator";

/**
 * Every keyboard shortcut the app has, as data: what Settings → Keyboard
 * shortcuts lists, and what a newly recorded shortcut is checked against so
 * one combination never means two things.
 *
 * Accelerator strings throughout (`accelerator.ts`), so a recorded press and a
 * listed shortcut compare as plain strings.
 */

export type ShortcutGroup = "palette" | "tabs" | "window" | "voice";

export const SHORTCUT_GROUPS: { key: ShortcutGroup; title: string }[] = [
  { key: "palette", title: "Command palette" },
  { key: "tabs", title: "Tabs and panes" },
  { key: "window", title: "Window" },
  { key: "voice", title: "Voice" },
];

export type FixedShortcut = {
  id: string;
  label: string;
  accelerator: string;
  group: ShortcutGroup;
};

/**
 * The shortcuts that are not configurable. Descriptive: each is bound where
 * its comment says, and an entry here must follow a change there.
 */
export const FIXED_SHORTCUTS: FixedShortcut[] = [
  // `CommandPaletteProvider`
  { id: "palette.open", label: "Open the command palette", accelerator: "CommandOrControl+K", group: "palette" },
  { id: "palette.resume", label: "Open the palette where you left it", accelerator: "CommandOrControl+M", group: "palette" },
  { id: "palette.fresh", label: "Open the palette, cleared", accelerator: "CommandOrControl+,", group: "palette" },
  // `TabsProvider`
  { id: "tabs.new", label: "New tab", accelerator: "CommandOrControl+T", group: "tabs" },
  { id: "tabs.close", label: "Close the tab", accelerator: "CommandOrControl+W", group: "tabs" },
  { id: "tabs.next", label: "Next tab", accelerator: "Control+Tab", group: "tabs" },
  { id: "tabs.previous", label: "Previous tab", accelerator: "Control+Shift+Tab", group: "tabs" },
  { id: "tabs.split", label: "Split with the last tab, or end the split", accelerator: "CommandOrControl+\\", group: "tabs" },
  { id: "tabs.swap", label: "Swap the two panes", accelerator: "CommandOrControl+Shift+\\", group: "tabs" },
  // The application menu (`WindowManager.setupApplicationMenu`)
  { id: "window.reload", label: "Reload", accelerator: "CommandOrControl+R", group: "window" },
  { id: "window.forceReload", label: "Force reload", accelerator: "CommandOrControl+Shift+R", group: "window" },
];

/** The in-app shortcuts that are settings: accelerator strings, null for off. */
export type ConfigurableShortcutKey = "railFloatShortcut" | "pageSidebarShortcut";

export type ConfigurableShortcut = {
  key: ConfigurableShortcutKey;
  label: string;
  description: string;
  group: ShortcutGroup;
};

export const CONFIGURABLE_SHORTCUTS: ConfigurableShortcut[] = [
  {
    key: "railFloatShortcut",
    label: "Float or dock the sidebar",
    description:
      "Floating, the sidebar hides and slides in from the left edge. In fullscreen it docks the sidebar until you leave fullscreen.",
    group: "window",
  },
  {
    key: "pageSidebarShortcut",
    label: "Show or hide the page sidebar",
    description: "The panel on the right of the page you are looking at.",
    group: "window",
  },
];

/** The voice hotkey is ⌘/Ctrl plus one key (`core/voice/hotkey.ts`), as an accelerator. */
export const voiceAccelerator = (code: string): string | null =>
  acceleratorFromKeyPress(
    { code, metaKey: true, ctrlKey: false, altKey: false, shiftKey: false },
    "darwin",
  );

type Taken = { id: string; label: string; accelerator: string };

/** Everything that holds a combination right now, the user's settings included. */
export const takenShortcuts = (settings: Settings): Taken[] => {
  const taken: Taken[] = FIXED_SHORTCUTS.map(({ id, label, accelerator }) => ({ id, label, accelerator }));
  for (const { key, label } of CONFIGURABLE_SHORTCUTS) {
    const accelerator = settings[key];
    if (accelerator) taken.push({ id: key, label, accelerator });
  }
  if (settings.globalPaletteShortcut) {
    taken.push({
      id: "globalPaletteShortcut",
      label: "Open the quick bar from any app",
      accelerator: settings.globalPaletteShortcut,
    });
  }
  const voice = voiceAccelerator(settings.voiceHotkey);
  if (voice) taken.push({ id: "voiceHotkey", label: "Dictate", accelerator: voice });
  return taken;
};

/**
 * What already uses `accelerator`, other than the shortcut `ownId` being
 * recorded; null when it is free.
 */
export const shortcutConflict = (
  accelerator: string,
  ownId: string,
  settings: Settings,
): Taken | null =>
  takenShortcuts(settings).find((entry) => entry.id !== ownId && entry.accelerator === accelerator) ?? null;
