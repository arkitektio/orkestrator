import * as React from 'react';
import {ReturnsContainer} from '@arkitektio/bsx/ports/widgets/returns/ReturnsContainer';
import {useWidgetRegistry} from '@arkitektio/bsx/ports/engine/WidgetsContext';
import {TaskEventKind, useDetailTaskQuery} from '../api/graphql';
import {TaskStatusHero} from '../components/task/TaskEventLog';
import {useBlokTravelMoment} from '../travel/context';
import {parseTimestamp} from '../travel/travelSource';

/**
 * What a task's own blok places of the run: its result (`<returns />`) and its
 * status line (`<status />`). Both read the whole task, which the task page
 * holds already; elsewhere they ask for it once.
 */

/** What the run returned last, as its return ports show it; at the viewed moment while travelling. */
export const RunReturns = ({taskId, only, omit}: {taskId: string; only?: readonly string[]; omit?: readonly string[]}) => {
  const {data} = useDetailTaskQuery({variables: {id: taskId}});
  const {registry} = useWidgetRegistry();
  const moment = useBlokTravelMoment();
  const task = data?.task;
  const ports = React.useMemo(
    () => (task?.action.returns ?? []).filter(port => (!only || only.includes(port.key)) && !omit?.includes(port.key)),
    [omit, only, task?.action.returns],
  );
  if (!task || ports.length === 0) return null;
  const at = moment === null ? null : parseTimestamp(moment);
  // Events newest first: the latest yield, or the latest one by the viewed moment.
  const shown = task.events.find(
    event =>
      event.kind === TaskEventKind.Yield &&
      event.returns != null &&
      (at === null || Number.isNaN(at) || parseTimestamp(event.createdAt) <= at),
  );
  if (!shown?.returns) return null;
  return <ReturnsContainer registry={registry} ports={ports} values={shown.returns} options={{labels: true}} />;
};

/** Where the run stands, as the task page's own status line. */
export const RunStatus = ({taskId}: {taskId: string}) => {
  const {data} = useDetailTaskQuery({variables: {id: taskId}});
  return data?.task ? <TaskStatusHero task={data.task} /> : null;
};
