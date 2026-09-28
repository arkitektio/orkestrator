import { useDialog } from "@/core/dialogs/registry";
import { TooltipButton } from "@/core/ui/tooltip-button";
import { cn } from "@/core/util/utils";
import { Plus } from "lucide-react";
import { TaskStatus, ThreadFragment } from "../../api/graphql";
import { MailTask } from "../../linkers";
import { ListDot } from "./ListDot";

/** The caller's tasks a conversation is in, as chips above its mail (null when none). */
export const ThreadTasks = ({ thread }: { thread: ThreadFragment }) => {
  const { openDialog } = useDialog();
  if (thread.tasks.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1">
      {thread.tasks.map((task) => (
        <MailTask.Smart key={task.id} object={task}>
          <MailTask.DetailLink
            object={task}
            className={cn(
              "inline-flex max-w-64 items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 text-xs hover:bg-muted",
              task.status !== TaskStatus.Open && "text-muted-foreground line-through",
            )}
          >
            <ListDot color={task.list?.color} />
            <span className="truncate">{task.title}</span>
          </MailTask.DetailLink>
        </MailTask.Smart>
      ))}
      <TooltipButton
        variant="ghost"
        size="icon-sm"
        tooltip="Add to another task"
        onClick={() => openDialog("kuvertaddtotask", { threads: [thread.id] }, { size: "small" })}
      >
        <Plus />
      </TooltipButton>
    </div>
  );
};
