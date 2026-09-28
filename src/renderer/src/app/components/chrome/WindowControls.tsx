import { cn } from "@/core/util/utils";
import { Copy, Minus, Square, X } from "lucide-react";

/**
 * Minimise / maximise / close — Windows and Linux.
 *
 * Both platforms run without a caption of their own, so these are the only
 * window buttons there are. They sit in different places: Linux has no top bar
 * at all, so the rail's chrome row carries them (`RailChrome`); Windows puts
 * them in the bar that slides down from the top edge (`AutoHideTitleBar`).
 * macOS draws neither — it keeps its real traffic lights (`hiddenInset`) — and a
 * browser tab has no frame of ours at all.
 */
export const WindowControls = ({
  maximized,
  compact = false,
}: {
  maximized: boolean;
  /** Foot-of-the-rail placement: smaller, stacked in a 64px column. */
  compact?: boolean;
}) => {
  const controls = window.api?.windowControls;
  if (!controls) {
    return null;
  }

  const buttonClass = cn(
    "app-no-drag flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none",
    compact ? "h-6 w-6" : "h-10 w-12",
  );

  return (
    <div className={cn("flex items-stretch", compact && "gap-0.5")}>
      <button
        type="button"
        aria-label="Minimize"
        className={buttonClass}
        onClick={() => controls.minimize()}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={maximized ? "Restore" : "Maximize"}
        className={buttonClass}
        onClick={() => controls.toggleMaximize()}
      >
        {/* Two glyphs, because "restore" and "maximize" are different promises
            and a single square leaves the user guessing which one they'll get. */}
        {maximized ? <Copy className="h-3 w-3 -scale-x-100" /> : <Square className="h-3 w-3" />}
      </button>
      <button
        type="button"
        aria-label="Close"
        className={cn(buttonClass, "hover:bg-destructive hover:text-destructive-foreground")}
        onClick={() => controls.close()}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default WindowControls;
