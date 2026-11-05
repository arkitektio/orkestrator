import { cn } from "@/core/util/utils";
import { TodoStatus } from "@/kraph/api/graphql";
import { dueState, formatDue } from "@/kraph/lib/todos";
import { CalendarClock } from "lucide-react";

const TONE = {
  overdue: "text-destructive",
  soon: "text-warning",
  later: "text-muted-foreground",
} as const;

/**
 * When something is due, said as how far off it is ("due in 2 d", "overdue 1 d"),
 * red when late, yellow within a day. Nothing without a date or once Done.
 * `inherited` (an item following its list's date) is shown fainter.
 */
export const TodoDue = ({
  due,
  status,
  inherited = false,
  className,
}: {
  due: string | null | undefined;
  status: TodoStatus;
  inherited?: boolean;
  className?: string;
}) => {
  const state = dueState(due, status);
  if (!due || !state) return null;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs tabular-nums", TONE[state], inherited && "opacity-70", className)}
      title={`${new Date(due).toLocaleString()}${inherited ? " (the list's date)" : ""}`}
    >
      <CalendarClock className="size-3" />
      {formatDue(due)}
    </span>
  );
};
