import { Button } from "@/core/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { cn } from "@/core/util/utils";
import { TodoItemStructureFragment, TodoStatus } from "@/kraph/api/graphql";
import { NEXT_STATUS, STATUS_ICON, STATUS_PILL, STATUS_RING, STATUS_TONE } from "@/kraph/lib/todoStatus";
import { TODO_COLUMNS, todoStatusLabel } from "@/kraph/lib/todos";
import { Check, ChevronDown, Play } from "lucide-react";
import { SetStatusOptions, StatusItem, useSetTodoStatus } from "./useSetTodoStatus";

type Props = {
  structure: TodoItemStructureFragment;
  item: StatusItem;
  /**
   * - `pill`: the state as a coloured pill; a click moves it on (To do → Doing →
   *   Done → To do), the caret sets any state. The Knowledge sidebar, the item page.
   * - `icons`: Doing and Done as two small symbols, the active one filled. A tight
   *   row: the page bar's unfolded chip.
   * - `check`: a round mark to tick (red ring, yellow while Doing, green tick when
   *   done); a click ticks or unticks. A list of objects: board cards, item rows.
   */
  variant?: "pill" | "icons" | "check";
  /** Passed on to every change (Undo where the result leaves the screen). */
  options?: SetStatusOptions;
  className?: string;
};

/**
 * One object's To do / Doing / Done, wherever it is shown, in one look (the
 * status colours of `lib/todoStatus`) and through one write (`useSetTodoStatus`).
 *
 * No Radix tooltips in the `icons` form: it lives in the page bar's chip, and a
 * portalled tooltip under the pointer would fold the chip. The native `title`
 * says the same.
 */
export const TodoStatusControl = ({ structure, item, variant = "pill", options, className }: Props) => {
  const { setStatus, loading } = useSetTodoStatus(structure, item);
  const status = structure.status;
  const label = todoStatusLabel(status);
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  if (variant === "check") {
    const done = status === TodoStatus.Done;
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={done ? true : status === TodoStatus.Doing ? "mixed" : false}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        title={done ? "Done · click for To do" : status === TodoStatus.Doing ? "Doing · click when done" : "To do · click when done"}
        disabled={loading}
        onClick={(event) => {
          stop(event);
          void setStatus(done ? TodoStatus.Todo : TodoStatus.Done, options);
        }}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full ring-2 ring-inset transition-colors disabled:opacity-60",
          STATUS_RING[status],
          done && "bg-success text-success-foreground",
          className,
        )}
      >
        {done ? <Check className="size-2.5" strokeWidth={3} /> : status === TodoStatus.Doing ? <span className="size-1.5 rounded-full bg-warning" /> : null}
      </button>
    );
  }

  if (variant === "icons") {
    const toggle = (target: TodoStatus, Icon: typeof Play, name: string) => {
      const active = status === target;
      return (
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "size-6 rounded-full",
            active ? cn("ring-2 ring-inset", STATUS_RING[target], STATUS_TONE[target]) : "text-foreground/70 hover:text-foreground",
          )}
          disabled={loading}
          aria-pressed={active}
          aria-label={active ? `${name}, press to put it back to To do` : `Mark as ${name.toLowerCase()}`}
          title={active ? `${name} · press again for To do` : `Mark as ${name.toLowerCase()}`}
          onClick={(event) => {
            stop(event);
            void setStatus(active ? TodoStatus.Todo : target, options);
          }}
        >
          <Icon className="size-3" />
        </Button>
      );
    };
    return (
      <div className={cn("flex items-center gap-0.5", className)}>
        {toggle(TodoStatus.Doing, Play, "Doing")}
        {toggle(TodoStatus.Done, Check, "Done")}
      </div>
    );
  }

  const Icon = STATUS_ICON[status];
  const next = NEXT_STATUS[status];
  return (
    <div className={cn("inline-flex items-stretch overflow-hidden rounded-full border text-xs font-medium", STATUS_PILL[status], className)}>
      <button
        type="button"
        className="flex items-center gap-1 py-0.5 pl-2 pr-1.5 transition-opacity hover:opacity-80 disabled:opacity-60"
        disabled={loading}
        title={`${label} · click for ${todoStatusLabel(next)}`}
        aria-label={`${label}. Move to ${todoStatusLabel(next)}`}
        onClick={(event) => {
          stop(event);
          void setStatus(next, options);
        }}
      >
        <Icon className="size-3" />
        {label}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center border-l border-current/20 px-1 transition-opacity hover:opacity-80 disabled:opacity-60"
            disabled={loading}
            aria-label="Set the status"
            onClick={stop}
          >
            <ChevronDown className="size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={stop}>
          <DropdownMenuRadioGroup value={status} onValueChange={(value) => void setStatus(value as TodoStatus, options)}>
            {TODO_COLUMNS.map((column) => {
              const ColumnIcon = STATUS_ICON[column.status];
              return (
                <DropdownMenuRadioItem key={column.status} value={column.status}>
                  <ColumnIcon className={cn("size-3.5", STATUS_TONE[column.status])} />
                  {column.label}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
