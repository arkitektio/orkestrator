import * as React from "react";
import BlokRenderer from "@/core/blok/renderer/BlokRenderer";
import { useBlokRuntime, type BlokTaskRecord } from "@/core/blok/renderer/runtime";
import { cn } from "@/core/util/utils";
import { BlokLogoFragment, useLogoBlokQuery } from "@/rekuest/api/graphql";
import { useLatestTask } from "@/rekuest/hooks/useTasks";
import { useBlokDocument } from "../blokDocument";
import { latestTaskRecord } from "../blokLatestTask";
import { BlokLogo } from "./BlokLogo";

/** Where an action logo reads its task: `@task`, null until the viewer runs the action. */
export const ACTION_LOGO_TASK_ROOT = "task";

/** Logos never act. */
const REFUSE_EVERY_ACTION = () => true;

/**
 * An action's logo (blok context ACTION_LOGO), drawn against the task the
 * viewer last ran of the action.
 *
 * Until they run it, that task is null and the logo is the drawing kept for
 * its hash (`BlokLogo`): a list of actions renders no bloks. Once the viewer's
 * tasks hold one of the action, from the my-tasks cache with no subscription
 * of its own, the logo renders live with `@task` set to that task's record,
 * and while it runs the box is `data-logo-active`, which plays the logo's
 * animations without a hover.
 */
export const ActionLogo = ({
  action,
  className,
}: {
  action: { id: string; logo?: BlokLogoFragment | null };
  className?: string;
}) => {
  const task = useLatestTask({ action: action.id, allowDone: true });
  const record = React.useMemo(() => (task ? latestTaskRecord(task) : null), [task]);
  if (!action.logo) return null;
  if (!record) return <BlokLogo blok={action.logo} className={className} />;
  return <LiveActionLogo blokId={action.logo.id} record={record} className={className} />;
};

const LiveActionLogo = ({
  blokId,
  record,
  className,
}: {
  blokId: string;
  record: BlokTaskRecord;
  className?: string;
}) => {
  const { data } = useLogoBlokQuery({ variables: { id: blokId } });
  const blok = data?.blok;
  const { roots } = useBlokDocument((blok?.componentTree as unknown[] | null) ?? null);
  const initialState = React.useMemo(
    () => ({ ...((blok?.demoState as Record<string, unknown> | null) ?? {}), [ACTION_LOGO_TASK_ROOT]: record }),
    // The record changes with every progress report; the sync below writes it, so the state is seeded once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blok?.demoState],
  );

  return (
    <span
      data-logo-host=""
      data-logo-active={record.running ? "" : undefined}
      className={cn("relative shrink-0 overflow-hidden", className)}
    >
      {blok && (
        <BlokRenderer
          surfaceId={`action-logo-${blokId}`}
          uiComponents={roots}
          initialState={initialState}
          chrome="none"
          refuseAction={REFUSE_EVERY_ACTION}
        >
          <ActionLogoTaskSync record={record} />
        </BlokRenderer>
      )}
    </span>
  );
};

/** Keeps `@task` on the latest record. */
const ActionLogoTaskSync = ({ record }: { record: BlokTaskRecord }) => {
  const setRuntimeValue = useBlokRuntime((state) => state.setRuntimeValue);
  React.useEffect(() => {
    setRuntimeValue(ACTION_LOGO_TASK_ROOT, record);
  }, [record, setRuntimeValue]);
  return null;
};

export default ActionLogo;
