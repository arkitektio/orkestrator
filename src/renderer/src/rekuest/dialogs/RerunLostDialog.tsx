import { useDialog } from "@/core/dialogs/registry";
import { RekuestTask } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReassignableTask, useReassignFromTask } from "../hooks/useAssign";
import { LostDetails } from "../lib/taskHistory";
import { AssignErrorNote } from "../components/AssignErrorNote";

const EFFECTS_WARNING: Record<string, string> = {
  IRREVERSIBLE:
    "Its implementation declares irreversible effects: whatever it already did cannot be undone, and running it again may do it twice.",
  UNKNOWN:
    "Its implementation does not declare whether it is safe to run again, so whatever it already did may happen twice.",
};

/**
 * Asked before re-running a LOST task that may already have acted on the
 * world: it started before its agent died, and its implementation does not
 * declare its effects harmless. The server re-runs nothing on its own — this
 * is the decision it leaves to the caller.
 */
export const RerunLostDialog = (props: {
  task: ReassignableTask;
  lost: LostDetails;
  capture?: boolean;
}) => {
  const { closeDialog } = useDialog();
  const { reassign } = useReassignFromTask();
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);

  const warning =
    EFFECTS_WARNING[props.lost.effects ?? "UNKNOWN"] ?? EFFECTS_WARNING.UNKNOWN;

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Run this lost task again?</DialogTitle>
        <DialogDescription>
          Its agent was lost after the task started
          {props.lost.lastProgress != null
            ? ` (last reported ${props.lost.lastProgress}%)`
            : ""}
          , so how far it got is unknown. {warning}
        </DialogDescription>
      </DialogHeader>
      <AssignErrorNote error={failure} className="my-3" />
      <DialogFooter>
        <Button variant="outline" onClick={() => closeDialog()}>
          Keep it lost
        </Button>
        <Button
          variant="destructive"
          disabled={running}
          onClick={async () => {
            setRunning(true);
            setFailure(null);
            try {
              const x = await reassign(props.task, { capture: props.capture });
              closeDialog();
              navigate(RekuestTask.linkBuilder(x.id));
            } catch (error) {
              setFailure(error);
            } finally {
              setRunning(false);
            }
          }}
        >
          Run again
        </Button>
      </DialogFooter>
    </div>
  );
};
