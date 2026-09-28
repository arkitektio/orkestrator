import { PageAction } from "@/core/ui/page-action";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { useSearchParams } from "react-router-dom";
import { TaskView } from "./taskOps";

const VIEWS: TaskView[] = ["active", "snoozed", "done"];

/** The view a task page shows (`?view=`), kept in the URL with the selection. */
export const useTaskView = () => {
  const [params, setParams] = useSearchParams();
  const raw = params.get("view");
  const view: TaskView = VIEWS.includes(raw as TaskView) ? (raw as TaskView) : "active";
  const setView = (next: TaskView) =>
    setParams(
      (current) => {
        const out = new URLSearchParams(current);
        if (next === "active") out.delete("view");
        else out.set("view", next);
        out.delete("task");
        return out;
      },
      { replace: true },
    );
  return { view, setView };
};

export const VIEW_LABEL: Record<TaskView, string> = { active: "Active", snoozed: "Snoozed", done: "Done" };

/** Active / Snoozed / Done, as a page action. */
export const TaskViewToggle = ({ view, onChange }: { view: TaskView; onChange: (view: TaskView) => void }) => (
  <PageAction.Slot collapse="hide">
    <ToggleGroup type="single" size="sm" value={view} onValueChange={(v) => v && onChange(v as TaskView)}>
      {VIEWS.map((v) => (
        <ToggleGroupItem key={v} value={v}>
          {VIEW_LABEL[v]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  </PageAction.Slot>
);
