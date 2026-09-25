import { Eye, EyeOff } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/core/util/utils";

/**
 * The shared card surface every layer kind renders into — one dialect for all of
 * them, as `@/lib/scene/layerui/cardControls` is for mikro's layer cards.
 *
 * One prop shape for every kind, deliberately: a card that needs fewer props is
 * still assignable where more are passed, so the registry can hand every card the
 * same object and the panel never special-cases a kind.
 */
export type LayerCardProps<L> = {
  layer: L;
  hidden: boolean;
  onToggleHidden: (id: string, hidden: boolean) => void;
};

export const CardShell = ({
  color,
  title,
  subtitle,
  hidden,
  onToggle,
  children,
  aside,
}: {
  color: string;
  title: string;
  subtitle?: ReactNode;
  hidden: boolean;
  onToggle: () => void;
  children?: ReactNode;
  aside?: ReactNode;
}) => (
  <div
    className={cn(
      "flex flex-col gap-1.5 rounded-md border border-border/60 p-2 transition-colors hover:bg-accent/40",
      hidden && "opacity-50",
    )}
  >
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        title={hidden ? "Show on the timeline" : "Hide from the timeline"}
      >
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-xs font-medium">{title}</span>
          {subtitle && (
            <span className="truncate font-mono text-[10px] text-muted-foreground">{subtitle}</span>
          )}
        </span>
        {hidden ? (
          <EyeOff className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <Eye className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {aside}
    </div>
    {children}
  </div>
);

/** One labelled fact in a card: omitted entirely when there is no value. */
export const CardFact = ({ label, value }: { label: string; value: ReactNode | null | undefined }) => {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-baseline gap-2 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-mono tabular-nums">{value}</span>
    </div>
  );
};
