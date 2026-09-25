import { isEditableElement } from "./insertText";
import type { VoiceSessionMode } from "./store";

/**
 * The one key that drives dictation: ⌘ / Ctrl + `code` (default `KeyL`),
 * bound on `window` in the capture phase like the palette's ⌘K so it wins
 * over whatever has focus — which is the point, since what has focus decides
 * where the words go:
 *
 *   an editable element → "fill": dictate into it
 *   anything else       → "palette": open the search bar and dictate into it
 *
 * This module only reports presses and releases; the runtime turns them into
 * "hold to talk" (release transcribes) and "tap twice for hands-free". A
 * release is the hotkey's own key going up, or the modifier going up first,
 * or the window losing focus — whichever comes first.
 *
 * The same guards as `CommandPaletteProvider`: no auto-repeat, nothing that
 * was already handled, and the `[data-command-hotkey='off']` opt-out for
 * editors that own their own chords.
 */

export const DEFAULT_VOICE_HOTKEY = "KeyL";

export const matchesVoiceHotkey = (
  event: Pick<KeyboardEvent, "metaKey" | "ctrlKey" | "altKey" | "code">,
  code: string,
): boolean => (event.metaKey || event.ctrlKey) && !event.altKey && event.code === code;

export const decideVoiceMode = (activeElement: Element | null): VoiceSessionMode =>
  isEditableElement(activeElement) ? "fill" : "palette";

/** A readable name for a `KeyboardEvent.code`, for the settings page. */
export const describeHotkey = (code: string, platform: string = navigator.platform): string => {
  const modifier = /mac|iphone|ipad/i.test(platform) ? "⌘" : "Ctrl";
  const key = code.startsWith("Key")
    ? code.slice(3)
    : code.startsWith("Digit")
      ? code.slice(5)
      : code;
  return `${modifier} ${key}`;
};

const isModifierKey = (key: string) => key === "Control" || key === "Meta";

export const attachVoiceHotkey = ({
  code,
  onPress,
  onRelease,
}: {
  /** Read live so a settings change needs no re-bind. */
  code: () => string;
  onPress: (mode: VoiceSessionMode, target: Element | null) => void;
  onRelease: () => void;
}): (() => void) => {
  let held = false;

  const release = () => {
    if (!held) return;
    held = false;
    onRelease();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!matchesVoiceHotkey(event, code())) return;
    if (event.repeat || event.defaultPrevented) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest?.("[data-command-hotkey='off']")) return;
    event.preventDefault();
    held = true;
    const active = document.activeElement;
    onPress(decideVoiceMode(active), active);
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (!held) return;
    if (event.code === code() || isModifierKey(event.key)) release();
  };

  window.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("keyup", handleKeyUp, true);
  window.addEventListener("blur", release);
  return () => {
    window.removeEventListener("keydown", handleKeyDown, true);
    window.removeEventListener("keyup", handleKeyUp, true);
    window.removeEventListener("blur", release);
  };
};
