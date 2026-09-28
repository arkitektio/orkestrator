import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { toast } from "@/core/notify";
import { AlarmClock } from "lucide-react";
import { useMemo, useState } from "react";
import { useSnoozeTasksMutation } from "../api/graphql";
import { formatDue, fromLocalInput, snoozePresets, TASK_VIEWS } from "../components/tasks/taskOps";
import { toastText } from "../errors";

/** Snooze tasks until a chosen time: hidden from Active until then. */
export const SnoozeTaskForm = ({ tasks }: { tasks: string[] }) => {
  const { closeDialog } = useDialog();
  const [custom, setCustom] = useState("");
  const presets = useMemo(() => snoozePresets(), []);
  const [snooze, { loading }] = useSnoozeTasksMutation({ refetchQueries: TASK_VIEWS });

  const until = (at: Date) =>
    snooze({ variables: { input: { tasks, until: at.toISOString() } } })
      .then(() => {
        toast.success(`Snoozed until ${formatDue(at.toISOString())}`);
        closeDialog();
      })
      .catch((e) => toast.error(toastText(e)));

  return (
    <div className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Snooze {tasks.length === 1 ? "task" : `${tasks.length} tasks`}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col">
        {presets.map((p) => (
          <Button key={p.label} variant="ghost" className="justify-between" disabled={loading} onClick={() => until(p.at)}>
            <span className="flex items-center gap-2">
              <AlarmClock className="h-4 w-4" />
              {p.label}
            </span>
            <span className="text-xs text-muted-foreground">{formatDue(p.at.toISOString())}</span>
          </Button>
        ))}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const iso = fromLocalInput(custom);
          if (iso) void until(new Date(iso));
        }}
      >
        <Input type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Snooze until" />
        <DialogFooter>
          <Button type="submit" variant="outline" disabled={loading || !custom}>
            Snooze
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
};
