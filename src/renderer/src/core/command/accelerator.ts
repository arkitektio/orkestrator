/**
 * Electron accelerator strings for the system-wide palette shortcut.
 *
 * The recorder turns a key press into what `globalShortcut.register` takes
 * ("CommandOrControl+Shift+Space"), and the settings page shows it back as the
 * platform writes shortcuts (⌘⇧Space on macOS, Ctrl+Shift+Space elsewhere).
 * `CommandOrControl` is stored rather than Command or Control, so one setting
 * means the same thing on every machine it syncs to.
 */

export type KeyPress = {
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

/** KeyboardEvent.code → accelerator key name, for the non-obvious ones. */
const NAMED_CODES: Record<string, string> = {
  Space: "Space",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Backspace",
  Delete: "Delete",
  Escape: "Escape",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backquote: "`",
};

const MODIFIER_CODE = /^(Control|Meta|Alt|Shift|OS)(Left|Right)?$/;

/** The accelerator key for a physical key, or null when it cannot be one. */
const keyOf = (code: string): string | null => {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
  return NAMED_CODES[code] ?? null;
};

/**
 * The accelerator for a key press, or null while only modifiers are down or
 * when the combination could never work system-wide. A global shortcut needs
 * a modifier (a bare letter would swallow typing in every app) — except a
 * function key, which is safe alone.
 */
export const acceleratorFromKeyPress = (
  press: KeyPress,
  platform: string = navigatorPlatform(),
): string | null => {
  if (MODIFIER_CODE.test(press.code)) return null;
  const key = keyOf(press.code);
  if (!key) return null;

  const mac = platform === "darwin";
  const parts: string[] = [];
  // The platform's primary modifier is stored portably; the other one, when
  // held too, is stored by name.
  const primary = mac ? press.metaKey : press.ctrlKey;
  const secondary = mac ? press.ctrlKey : press.metaKey;
  if (primary) parts.push("CommandOrControl");
  if (secondary) parts.push(mac ? "Control" : "Super");
  if (press.altKey) parts.push("Alt");
  if (press.shiftKey) parts.push("Shift");

  const functionKey = /^F\d+$/.test(key);
  // Shift alone is not enough: it would steal a capital letter from every app.
  const hasRealModifier = primary || secondary || press.altKey;
  if (!hasRealModifier && !functionKey) return null;

  parts.push(key);
  return parts.join("+");
};

const MAC_SYMBOLS: Record<string, string> = {
  CommandOrControl: "⌘",
  Command: "⌘",
  Control: "⌃",
  Alt: "⌥",
  Option: "⌥",
  Shift: "⇧",
  Super: "⌘",
};

const OTHER_NAMES: Record<string, string> = {
  CommandOrControl: "Ctrl",
  Control: "Ctrl",
  Command: "Win",
  Super: "Win",
  Alt: "Alt",
  Option: "Alt",
  Shift: "Shift",
};

/** How the platform writes the shortcut: ⌘⇧Space, or Ctrl+Shift+Space. */
export const formatAccelerator = (
  accelerator: string,
  platform: string = navigatorPlatform(),
): string => {
  const parts = accelerator.split("+");
  const key = parts.pop() ?? "";
  if (platform === "darwin") {
    // macOS convention: ⌃⌥⇧⌘ order, glued to the key.
    const order = ["Control", "Alt", "Option", "Shift", "CommandOrControl", "Command", "Super"];
    const mods = [...parts].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return mods.map((m) => MAC_SYMBOLS[m] ?? m).join("") + key;
  }
  return [...parts.map((m) => OTHER_NAMES[m] ?? m), key].join("+");
};

const navigatorPlatform = (): string => {
  if (typeof navigator === "undefined") return "unknown";
  return /mac/i.test(navigator.platform) ? "darwin" : "other";
};
