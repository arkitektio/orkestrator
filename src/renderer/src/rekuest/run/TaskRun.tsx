import * as React from 'react';
import {useNavigate} from 'react-router-dom';
import {Box} from 'lucide-react';
import {RekuestSpace} from '@/core/linkers';
import {PageAction} from '@/core/ui/page-action';
import {ComponentContext, type RunTaskFragment} from '../api/graphql';
import {ActionBlokRenderer} from './ActionBlokRenderer';
import {runAgentIds} from './binding';
import {useRunOfTask, useRunTask, useSpacesForAgents, useTaskActionBlok} from './useRun';

/** The query parameter a space page reads the run to draw from. */
export const SPACE_TASK_PARAM = 'task';

/** A space page drawing a run into its room. */
export const spaceRunLink = (spaceId: string, taskId: string): string =>
  `${RekuestSpace.linkBuilder(spaceId)}?${new URLSearchParams({[SPACE_TASK_PARAM]: taskId}).toString()}`;

/**
 * The task panel's own blok: the html blok its action declared, drawn for
 * this run. Nothing for an action without one (or a server without action
 * bloks).
 */
export const TaskRunPanel = ({taskId, className}: {taskId: string; className?: string}) => {
  const {task} = useRunTask(taskId);
  const shown = useTaskActionBlok(task, ComponentContext.Html);
  if (!shown) return null;
  return (
    <div className={className}>
      <ActionBlokRenderer
        surfaceId={`task-${taskId}-panel`}
        chrome="minimal"
        sizing="intrinsic"
        actionBlok={shown.actionBlok}
        run={shown.run}
        // The task page shows the run's asks above, as cards of their own.
        showAsk={false}
      />
    </div>
  );
};

/**
 * Where to open a run in 3D: the space it was started in, else the space
 * placing the most of its agents. Null while there is none.
 */
export const useRunSpace = (task: RunTaskFragment | null): string | null => {
  const run = useRunOfTask(task);
  const agents = React.useMemo(() => (run ? runAgentIds(run.binding, run.self) : []), [run]);
  // Asked only when the run names no space of its own.
  const {spaces} = useSpacesForAgents(task?.space ? [] : agents);
  return task?.space?.id ?? spaces[0]?.space.id ?? null;
};

/** "Open in space": the run drawn into its space, for an action with an overlay. */
export const OpenRunInSpace = ({taskId, priority}: {taskId: string; priority?: number}) => {
  const {task} = useRunTask(taskId);
  const overlay = useTaskActionBlok(task, ComponentContext.Overlay);
  const space = useRunSpace(overlay ? task : null);
  const navigate = useNavigate();
  if (!overlay || !space) return null;
  return (
    <PageAction
      priority={priority}
      size="sm"
      variant="outline"
      onClick={() => navigate(spaceRunLink(space, taskId))}
      title="Show this run in 3D, over the devices where they stand"
    >
      <Box className="h-4 w-4" />
      Open in space
    </PageAction>
  );
};
