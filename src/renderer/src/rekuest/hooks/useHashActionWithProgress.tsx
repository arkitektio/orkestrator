import { useCallback, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { buildAssignInput } from "@/rekuest/assign";
import {
  TaskEventFragment,
  TaskEventKind,
  useActionIdByHashQuery,
} from "../api/graphql";
import { isTerminalEvent, trackTask } from "../lib/taskTracker";
import { useAssign } from "./useAssign";

export type useActionOptions = {
  hash?: string;
  onDone?: (event: TaskEventFragment) => void;
  onError?: (error: string) => void;
  object?: string;
};

export const useHashActionWithProgress = (
  options: useActionOptions
) => {

  // Only the id / existence is needed here — skip the full `Ports` subtree.
  const { data } = useActionIdByHashQuery({
    variables: {
      hash: options.hash,
    },
  });

  const [doing, setDoing] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { assign: postAssign } = useAssign();

  const doStuff = useCallback(
    (event: TaskEventFragment) => {
      if (event.kind == TaskEventKind.Progress) {
        setProgress(event.progress || 0);
        return;
      }

      // Gate on `isTerminalEvent` rather than hand-listing kinds: Cancelled and
      // Interrupted also end the task, and used to leave `doing` stuck true.
      if (!isTerminalEvent(event.kind)) return;

      setDoing(false);
      setProgress(null);

      if (
        event.kind == TaskEventKind.Failed ||
        event.kind == TaskEventKind.Critical
      ) {
        setError(event.message || "Unknown error");
        options.onError?.(event.message || "Unknown error");
        return;
      }

      options.onDone?.(event);
    },
    [setDoing, setProgress, setError, options.onDone, options.onError],
  );

  const assign = async (args: { [key: string]: unknown }) => {
    const reference = uuidv4();
    const untrack = trackTask(reference, doStuff);

    try {
      await postAssign(buildAssignInput({
        action: data?.action.id,
        args: args,
        reference: reference,
      }));

      setDoing(true);
      setError(null);
    } catch (e) {
      untrack();
      const message = e instanceof Error ? e.message : "Unknown error";
      toast.error(message);
      setDoing(false);
      setError(message);
    }
  };


  return {
    assign,
    doing,
    progress,
    error,
    action: data?.action,
    installed: data?.action != undefined,
  };
};

