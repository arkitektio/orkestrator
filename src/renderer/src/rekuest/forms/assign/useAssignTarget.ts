import { useCallback } from "react";
import { buildAssignInput } from "@/rekuest/assign";
import {
  AssignInput,
  useDetailActionQuery,
  useImplementationQuery,
} from "@/rekuest/api/graphql";
import { useAssign } from "@/rekuest/hooks/useAssign";
import { useMyLatestTask } from "@/rekuest/lib/taskIndex";
import type { AssignTarget } from "./target";

export type TargetAssignInput = Omit<
  AssignInput,
  "capture" | "action" | "implementation" | "resolution"
> & {
  /** The implementation that can handle what is picked, for an action target. */
  implementation?: string;
  /** Tie the run to this window: cancelled once the window has been gone this many seconds. */
  deadman?: number | null;
};

/**
 * What an assign form needs of its target: the action (ports, name, logo), the
 * implementation when it is one, the viewer's latest task of it, and an
 * `assign` that fills in the target. Only the target's own query runs.
 */
export const useAssignTarget = (target: AssignTarget) => {
  const actionId = target.action;
  const implementationId = target.implementation;
  const resolution = target.resolution;

  const actionQuery = useDetailActionQuery({
    variables: { id: actionId ?? "" },
    skip: !actionId,
  });
  const implementationQuery = useImplementationQuery({
    variables: { id: implementationId ?? "" },
    skip: !implementationId,
  });

  const implementation = implementationQuery.data?.implementation;
  const action = implementation?.action ?? actionQuery.data?.action;

  // The one latest task of this target, not the whole list (see `taskIndex`).
  const liveLatest = useMyLatestTask(
    implementationId ? { implementation: implementationId } : { action: actionId },
  );
  const latestTask = implementation?.myLatestTask ?? liveLatest;

  const { assign: rawAssign } = useAssign();
  const assign = useCallback(
    ({ implementation: pinned, deadman, ...input }: TargetAssignInput) =>
      rawAssign({
        deadman,
        ...buildAssignInput({
          ...input,
          ...(implementationId
            ? { implementation: implementationId, ...(resolution ? { resolution } : {}) }
            : pinned
              ? { implementation: pinned }
              : { action: actionId }),
        }),
      }),
    [rawAssign, implementationId, actionId, resolution],
  );

  return {
    action,
    implementation,
    latestTask,
    assign,
    error: implementationQuery.error ?? actionQuery.error,
  };
};
