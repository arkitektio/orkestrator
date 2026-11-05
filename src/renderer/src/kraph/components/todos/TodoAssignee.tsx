import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { cn } from "@/core/util/utils";

/**
 * Who something is for. An item without its own assignee is its list's, shown
 * faded so it reads as inherited.
 */
export const TodoAssignee = ({
  own,
  inherited,
  className,
}: {
  own?: string | null;
  inherited?: string | null;
  className?: string;
}) => {
  const sub = own || inherited;
  if (!sub) return <span className={cn("text-xs text-muted-foreground", className)}>Unassigned</span>;
  return (
    <span className={cn(!own && "opacity-60", className)} title={own ? undefined : "From the list"}>
      <StructureDisplay identifier="@lok/user" id={sub} variant="chip" />
    </span>
  );
};
