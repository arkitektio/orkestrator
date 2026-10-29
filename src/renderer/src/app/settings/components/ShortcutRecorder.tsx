import { acceleratorFromKeyPress, formatAccelerator } from "@/core/command/accelerator";
import { Button } from "@/core/ui/button";
import { useEffect, useState } from "react";

/**
 * A shortcut as a button: click it, press the combination, and it records the
 * accelerator (`core/command/accelerator.ts`). Esc cancels. Shows it back the
 * way the platform writes shortcuts, with a Reset beside it once it differs
 * from `defaultValue`.
 *
 * `conflict` names what already holds a combination (`shortcutConflict`); a
 * taken one is refused, with the reason under the button, and the shortcut
 * keeps its old value.
 */
export const ShortcutRecorder = ({
  value,
  defaultValue,
  onChange,
  disabled,
  conflict,
}: {
  value: string | null;
  defaultValue: string;
  onChange: (accelerator: string) => void;
  disabled?: boolean;
  conflict?: (accelerator: string) => string | null;
}) => {
  const [recording, setRecording] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

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
      setRecording(false);
      const holder = conflict?.(accelerator);
      if (holder) {
        setRefused(`${formatAccelerator(accelerator)} already does "${holder}".`);
        return;
      }
      setRefused(null);
      onChange(accelerator);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording, onChange, conflict]);

  const reset = () => {
    setRefused(null);
    onChange(defaultValue);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {value !== defaultValue && (
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Reset
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="min-w-24 font-mono"
          disabled={disabled}
          onClick={() => {
            setRefused(null);
            setRecording(true);
          }}
        >
          {recording ? "Press a shortcut…" : formatAccelerator(value ?? defaultValue)}
        </Button>
      </div>
      {refused && <p className="text-xs text-destructive">{refused}</p>}
    </div>
  );
};
