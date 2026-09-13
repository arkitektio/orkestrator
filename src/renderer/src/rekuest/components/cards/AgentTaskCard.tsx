import React from "react";
import { cn } from "@/lib/utils";
import { RekuestTask } from "@/linkers";
import { ListTaskFragment } from "@/rekuest/api/graphql";
import { TaskStatusIcon } from "@/rekuest/lib/taskStatus";
import Timestamp from "@/components/ui/timestamp";

interface Props {
  item: ListTaskFragment;
}

const AgentTaskCard = ({ item }: Props) => {
  return (
    <RekuestTask.Smart object={item}>
      <RekuestTask.DetailLink object={item}>
        <div
          className={cn(
            "group flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer",
            "hover:bg-accent hover:border-accent-foreground/20 transition-colors",
          )}
        >
          <TaskStatusIcon kind={item.latestEventKind} isDone={item.isDone} />
          <p className="text-sm font-medium leading-none truncate flex-1">
            {item.action.name}
          </p>
          <span className="text-xs text-muted-foreground shrink-0">
            <Timestamp date={item.createdAt} relative />
          </span>
        </div>
      </RekuestTask.DetailLink>
    </RekuestTask.Smart>
  );
};

export default React.memo(AgentTaskCard);