import {ComponentContext} from '../api/graphql';
import {ActionBlokRenderer} from './ActionBlokRenderer';
import {useRunTask, useTaskActionBlok} from './useRun';

/**
 * The task panel's own blok: the html blok its action declared, drawn for
 * this run. Nothing for an action without one (or a server without action
 * bloks). `showAsk`: its `<ask />` draws the run's open ask, where the page
 * shows no cards for it.
 */
export const TaskRunPanel = ({taskId, showAsk = false, className}: {taskId: string; showAsk?: boolean; className?: string}) => {
  const {task} = useRunTask(taskId);
  const shown = useTaskActionBlok(task, ComponentContext.Html);
  if (!shown) return null;
  return (
    <div className={className}>
      <ActionBlokRenderer
        surfaceId={`task-${taskId}-panel`}
        chrome="minimal"
        // Fill, never intrinsic: a CardHeader is a size container and gives a shrink-to-fit box no width.
        sizing="fill"
        actionBlok={shown.actionBlok}
        run={shown.run}
        showAsk={showAsk}
      />
    </div>
  );
};

/**
 * The run in 3D: the scene blok its action declared (a `<Space>` places the
 * run's devices in their room), drawn for this run. Nothing for an action
 * without one. It takes the whole box it is given. `showAsk: false` leaves its
 * `<ask />` empty where the page shows the run's asks already.
 */
export const TaskRunScene = ({taskId, showAsk = true, className}: {taskId: string; showAsk?: boolean; className?: string}) => {
  const {task} = useRunTask(taskId);
  const shown = useTaskActionBlok(task, ComponentContext.Scene);
  if (!shown) return null;
  return (
    <div className={className ?? 'relative h-full w-full'}>
      <ActionBlokRenderer
        surfaceId={`task-${taskId}-scene`}
        chrome="none"
        sizing="fill"
        actionBlok={shown.actionBlok}
        run={shown.run}
        showAsk={showAsk}
      />
    </div>
  );
};
