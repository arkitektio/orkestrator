import { useEffect, useRef } from "react";

import { useCommandPalette } from "./CommandPaletteProvider";
import { PalettePanel } from "./Menu";

const hideQuick = () => window.api?.palette?.hideQuick?.();

const Hint = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] text-muted-foreground">{children}</span>
);

/**
 * The palette as the floating quick bar renders it (`?role=quick`): the same
 * `PalettePanel` as ⌘K, with no dialog around it — the window IS the dialog.
 *
 * The palette state stays open for the window's lifetime. Whatever would
 * close it in-app (a pick, an action's `onDone`) hides the window instead and
 * re-arms a fresh palette for the next summon; main's `quick:shown` resets the
 * query and puts the caret back in the input.
 */
export const QuickPalette = () => {
  const { open, openPalette } = useCommandPalette();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const focusInput = () => {
    const focus = () => inputRef.current?.focus({ preventScroll: true });
    focus();
    requestAnimationFrame(focus);
  };

  // Open on mount, and fresh on every summon.
  useEffect(() => {
    openPalette({ fresh: true });
    return window.api?.palette?.onQuickShown?.(() => {
      openPalette({ fresh: true });
      focusInput();
    });
  }, [openPalette]);

  // A pick or an action closed the palette: that means "done" here.
  useEffect(() => {
    if (open) return;
    hideQuick();
    openPalette({ fresh: true });
  }, [open, openPalette]);

  return (
    <div
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        hideQuick();
      }}
    >
      <PalettePanel
        inputRef={inputRef}
        onDismiss={hideQuick}
        footer={
          <>
            <Hint>↵ open</Hint>
            <Hint>⇧↵ use as context</Hint>
            <Hint>esc close</Hint>
          </>
        }
      />
    </div>
  );
};

export default QuickPalette;
