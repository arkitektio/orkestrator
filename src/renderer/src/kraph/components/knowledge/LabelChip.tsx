import { cn } from "@/core/lib/utils";
import { termTint } from "@/kraph/lib/terms";

export type LabelChipProps = {
  label: string;
  color?: readonly number[] | null;
  state?: "claimed" | "pending" | "failed";
  expanded?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
};

/**
 * One word this datum has been called. A button, because the chip *is* the
 * way into its card; pending and failed states are shown on the chip itself
 * rather than in a toast, so the eye never has to leave the row.
 */
export const LabelChip = ({
  label,
  color,
  state = "claimed",
  expanded = false,
  onClick,
  title,
  className,
}: LabelChipProps) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-expanded={onClick ? expanded : undefined}
    data-state={state}
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors",
      "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      expanded ? "border-primary bg-accent" : "border-border/60",
      state === "pending" && "opacity-60 animate-pulse",
      state === "failed" && "border-destructive text-destructive",
      className,
    )}
  >
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ background: termTint(color) }}
      aria-hidden
    />
    {label}
  </button>
);

export default LabelChip;
