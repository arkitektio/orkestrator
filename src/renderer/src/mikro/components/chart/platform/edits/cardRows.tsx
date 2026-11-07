import type { ReactNode } from "react";

/**
 * The one line of a card section: a small caps label, the control(s) at the
 * end. Shared by what a layer reads (`ChartLayerReads`) and how it is drawn
 * (`ChartLayerStyle`), so the two sections line up.
 */
export const CardRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center gap-2">
    <span className="shrink-0 text-[9px] font-medium uppercase tracking-[0.08em] text-foreground/35">
      {label}
    </span>
    <span className="ml-auto flex min-w-0 items-center gap-1.5">{children}</span>
  </div>
);

/** The scene cards' select look: a dark well, muted until hovered. */
export const CARD_SELECT =
  "h-5 rounded border border-foreground/10 bg-background/30 px-1.5 text-[10px] text-foreground/70";
