import { useSelf } from "@/core/connection/useSelf";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { ListTodoItemFragment, TodoStatus } from "@/kraph/api/graphql";
import { dueState } from "@/kraph/lib/todos";
import { CalendarClock, Eye, EyeOff } from "lucide-react";
import React from "react";
import { useSearchParams } from "react-router-dom";

/** Nobody: an item for no one (its own assignee and its list's both empty). */
const NOBODY = "-";

/**
 * A board's filters, kept in the URL (`?who=<sub>&done=hide`) so a filtered
 * board can be linked and survives a reload: whose items (one avatar per
 * person with an item here) and whether Done is shown.
 */
export const useTodoBoardFilters = () => {
  const [params, setParams] = useSearchParams();
  const who = params.get("who");
  const hideDone = params.get("done") === "hide";
  const overdue = params.get("due") === "overdue";

  const set = (key: string, value: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );

  const visible = React.useMemo(() => {
    if (!who && !overdue) return undefined;
    return (item: ListTodoItemFragment) =>
      (!who || (item.effectiveAssignee ?? NOBODY) === who) &&
      (!overdue || dueState(item.effectiveDueAt, item.status) === "overdue");
  }, [who, overdue]);

  return {
    who,
    hideDone,
    overdue,
    visible,
    setOverdue: (value: boolean) => set("due", value ? "overdue" : null),
    setWho: (value: string | null) => set("who", value),
    setHideDone: (value: boolean) => set("done", value ? "hide" : null),
  };
};

export const TodoBoardFilters = ({
  items,
  filters,
}: {
  items: readonly ListTodoItemFragment[];
  filters: ReturnType<typeof useTodoBoardFilters>;
}) => {
  const me = useSelf().userId;
  // Everyone with an item here, you first.
  const people = React.useMemo(() => {
    const subs = [...new Set(items.map((item) => item.effectiveAssignee ?? NOBODY))];
    return subs.sort((a, b) => Number(b === String(me)) - Number(a === String(me)));
  }, [items, me]);
  const done = items.filter((item) => item.status === TodoStatus.Done).length;
  const late = items.filter((item) => dueState(item.effectiveDueAt, item.status) === "overdue").length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {people.length > 1 && (
        <div className="flex items-center gap-1" role="group" aria-label="Whose items">
          <Button
            variant={filters.who ? "ghost" : "secondary"}
            size="sm"
            className="h-7 rounded-full px-2.5 text-xs"
            onClick={() => filters.setWho(null)}
          >
            Everyone
          </Button>
          {people.map((sub) => {
            const active = filters.who === sub;
            return (
              <button
                key={sub}
                type="button"
                aria-pressed={active}
                title={sub === NOBODY ? "Unassigned" : sub === String(me) ? "Yours" : undefined}
                onClick={() => filters.setWho(active ? null : sub)}
                className={cn(
                  "rounded-full transition-all",
                  active ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-60 hover:opacity-100",
                )}
              >
                {sub === NOBODY ? (
                  <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">?</span>
                ) : (
                  <StructureDisplay identifier="@lok/user" id={sub} variant="avatar" className="size-7" />
                )}
              </button>
            );
          })}
        </div>
      )}
      {(late > 0 || filters.overdue) && (
        <Button
          variant={filters.overdue ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1 text-xs text-destructive"
          aria-pressed={filters.overdue}
          onClick={() => filters.setOverdue(!filters.overdue)}
        >
          <CalendarClock className="size-3.5" />
          Overdue ({late})
        </Button>
      )}
      {done > 0 && (
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => filters.setHideDone(!filters.hideDone)}>
          {filters.hideDone ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          {filters.hideDone ? `Show done (${done})` : "Hide done"}
        </Button>
      )}
    </div>
  );
};
