import { RekuestTask } from "@/core/linkers";
import { useNavigate } from "react-router-dom";
import { DetailTaskFragment } from "../api/graphql";
import { useReassignFromTask } from "./useAssign";

/**
 * Re-run a task (same args, pinned implementation, original dependencies)
 * and navigate to the newly created task's detail page.
 */
export const useReassign = ({ task }: { task: DetailTaskFragment }) => {
  const { reassign: reassignTask } = useReassignFromTask();
  const navigate = useNavigate();

  const reassign = async (options?: { capture: boolean }) => {
    const x = await reassignTask(task, { capture: options?.capture ?? false });
    navigate(RekuestTask.linkBuilder(x.id));
  };

  return reassign;
};
