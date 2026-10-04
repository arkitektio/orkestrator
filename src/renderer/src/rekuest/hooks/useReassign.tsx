import { useDialog } from "@/core/dialogs/registry";
import { RekuestTask } from "@/core/linkers";
import { useNavigate } from "react-router-dom";
import { DetailTaskFragment, TaskEventKind } from "../api/graphql";
import { findLostEvent, isRiskyRerun, readLostDetails } from "../lib/taskHistory";
import { notifyAssignError } from "../lib/assignError";
import { useReassignFromTask } from "./useAssign";

/**
 * Re-run a task (same args, pinned implementation, original dependencies)
 * and navigate to the newly created task's detail page.
 *
 * A LOST task that may already have acted on the world (it started, and its
 * implementation does not declare its effects harmless) is confirmed first,
 * through the `rerunlost` dialog.
 */
export const useReassign = ({ task }: { task: DetailTaskFragment }) => {
  const { reassign: reassignTask } = useReassignFromTask();
  const { openDialog } = useDialog();
  const navigate = useNavigate();

  const reassign = async (options?: { capture: boolean }) => {
    const capture = options?.capture ?? false;
    if (task.latestEventKind === TaskEventKind.Lost) {
      const lost = readLostDetails(findLostEvent(task.events)?.value);
      if (isRiskyRerun(lost)) {
        openDialog("rerunlost", { task, lost, capture }, { size: "small" });
        return;
      }
    }
    try {
      const x = await reassignTask(task, { capture });
      navigate(RekuestTask.linkBuilder(x.id));
    } catch (error) {
      // Its callers are page actions, with nowhere to show it inline.
      notifyAssignError(error, { id: `rerun:${task.id}`, title: "Couldn't rerun the task" });
    }
  };

  return reassign;
};
