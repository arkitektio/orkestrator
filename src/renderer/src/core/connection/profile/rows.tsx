import { cn } from "@/core/util/utils";

/**
 * The compact row list profile sections share, so four modules' lists read as
 * one page: a hairline-separated column, no card around it.
 */
export const ProfileRows = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col divide-y divide-border/40">{children}</div>
);

export const ProfileRow = ({
  icon,
  title,
  meta,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** Right-aligned, muted: a size, a date, a status. */
  meta?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex items-center gap-3 py-2 text-sm", className)}>
    {icon && (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
    )}
    <span className="min-w-0 flex-1 truncate">{title}</span>
    {meta && <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>}
  </div>
);
