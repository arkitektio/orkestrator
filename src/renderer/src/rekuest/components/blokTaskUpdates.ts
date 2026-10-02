import type {BlokTaskUpdate} from '@/core/blok/renderer/runtime';
import {TaskEventKind, type TaskEventFragment} from '../api/graphql';
import {failureFallback} from '../lib/taskTracker';

type ReportedEvent = Pick<TaskEventFragment, 'kind' | 'progress' | 'message' | 'returns'>;

const returnsOf = (event: ReportedEvent): Pick<BlokTaskUpdate, 'returns'> =>
  event.returns == null ? {} : {returns: event.returns};

/**
 * What a task event means for a blok that bound the call to a name
 * (`runtime/task.ts`), or `undefined` for one that changes nothing a blok
 * shows: the queue and lifecycle chatter, logs, and a late report on a task
 * that already ended.
 */
export const taskUpdateFromEvent = (event: ReportedEvent): BlokTaskUpdate | undefined => {
  switch (event.kind) {
    case TaskEventKind.Progress:
      return {
        progress: event.progress ?? undefined,
        message: event.message ?? undefined,
      };
    case TaskEventKind.Yield:
      return returnsOf(event);
    case TaskEventKind.Completed:
      return {...returnsOf(event), end: 'done'};
    case TaskEventKind.Failed:
    case TaskEventKind.Critical:
    case TaskEventKind.Lost:
      return {end: 'failed', error: event.message || failureFallback(event.kind)};
    case TaskEventKind.Cancelled:
    case TaskEventKind.Interrupted:
      return {end: 'cancelled'};
    default:
      return undefined;
  }
};
