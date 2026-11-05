import { Button } from "@/core/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { Progress } from "@/core/ui/progress";
import { cn } from "@/core/util/utils";
import { ListTodoItemFragment, useTodoItemObjectsQuery } from "@/kraph/api/graphql";
import { Loader2 } from "lucide-react";
import React from "react";
import { TodoStructureRow } from "./TodoStructureRow";

/** Every object on the item, read only once the popover opens. */
const AllObjects = ({ item, removable }: { item: ListTodoItemFragment; removable: boolean }) => {
  const { data, loading } = useTodoItemObjectsQuery({ variables: { item: item.id }, fetchPolicy: "cache-and-network" });
  const rows = data?.todoItemStructures ?? [];
  if (loading && rows.length === 0) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  return (
    <div className="flex flex-col gap-1">
      {rows.map((structure) => (
        <TodoStructureRow key={structure.id} structure={structure} item={item} removable={removable} />
      ))}
    </div>
  );
};

/**
 * What a card or a row shows of an item's objects: how far along they are (a
 * bar), the next few still to do, and "+N" for the rest in a popover. An item
 * over hundreds of images stays one card tall.
 */
export const TodoItemObjects = ({
  item,
  removable = false,
  className,
}: {
  item: ListTodoItemFragment;
  removable?: boolean;
  className?: string;
}) => {
  const [open, setOpen] = React.useState(false);
  const { done, total } = item.progress;
  if (total === 0) return null;
  const rest = total - item.upNext.length;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-2">
        <Progress value={(100 * done) / total} className="h-1 flex-1" />
        <span className={cn("shrink-0 text-xs tabular-nums text-muted-foreground", done === total && "text-success")}>
          {done}/{total}
        </span>
      </div>
      {item.upNext.length > 0 && (
        <div className="flex flex-col gap-1">
          {item.upNext.map((structure) => (
            <TodoStructureRow key={structure.id} structure={structure} item={item} removable={removable} />
          ))}
        </div>
      )}
      {rest > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 self-start px-1.5 text-xs text-muted-foreground" onClick={(event) => event.stopPropagation()}>
              {item.upNext.length ? `+${rest} more` : `All ${total} objects`}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="flex max-h-96 w-80 flex-col gap-2 overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-sm font-semibold">
              {item.title} <span className="font-normal tabular-nums text-muted-foreground">{done}/{total}</span>
            </h3>
            {open && <AllObjects item={item} removable={removable} />}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
