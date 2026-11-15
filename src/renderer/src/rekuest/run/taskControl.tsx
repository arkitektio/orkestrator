import * as React from 'react';
import {reportError} from '@/core/notify';
import {useLatestRef} from '@/core/util/hooks/useLatestRef';
import {
  CancelDocument,
  InterruptDocument,
  PauseDocument,
  ResumeDocument,
  type TaskEventKind,
} from '../api/graphql';
import {useRekuest} from '../api/hooks';
import {isCancelable, isInterruptable, isPausable, isResumable} from '../lib/taskStatus';

/**
 * What a blok does to the task it is about: `task.cancel()`, `task.pause()`,
 * `task.resume()`, `task.step()` and `task.interrupt()`, and whether each
 * would be taken right now (`task.can.<operation>`). Starting it again is the
 * page's, never a blok's: a run nobody designed is not one click away.
 */
export type TaskControl = 'cancel' | 'pause' | 'resume' | 'step' | 'interrupt';
export type TaskCan = Record<TaskControl, boolean>;

export const NO_TASK_CONTROL: TaskCan = Object.freeze({
  cancel: false,
  pause: false,
  resume: false,
  step: false,
  interrupt: false,
});

type Controlled = {id: string; isDone: boolean; latestEventKind: TaskEventKind};

/** What may be done to `task` now; nothing for the past, or before there is a task. */
export const taskCanOf = (task: Controlled | null, past = false): TaskCan =>
  !task || past
    ? NO_TASK_CONTROL
    : {
        cancel: isCancelable(task),
        pause: isPausable(task),
        resume: isResumable(task),
        step: isResumable(task),
        interrupt: isInterruptable(task),
      };

const FAILED: Record<TaskControl, string> = {
  cancel: "Couldn't cancel the task",
  pause: "Couldn't pause the task",
  resume: "Couldn't resume the task",
  step: "Couldn't step the task",
  interrupt: "Couldn't interrupt the task",
};

/**
 * `task.can` and what `task.<operation>()` calls, for `task`. An operation
 * that may not be taken does nothing; one that fails is reported here, since
 * a blok has nowhere to show it. The promise keeps the control busy.
 */
export const useTaskControl = (
  task: Controlled | null,
  past: boolean,
): {can: TaskCan; control: ((operation: TaskControl) => unknown) | undefined} => {
  const client = useLatestRef(useRekuest());
  const id = task?.id;
  const done = task?.isDone ?? false;
  const kind = task?.latestEventKind;
  const can = React.useMemo(
    () => taskCanOf(id && kind ? {id, isDone: done, latestEventKind: kind} : null, past),
    [done, id, kind, past],
  );
  const canRef = useLatestRef(can);
  const control = React.useMemo(() => {
    if (!id) return undefined;
    return (operation: TaskControl) => {
      if (!canRef.current[operation]) return undefined;
      const run = async () => {
        if (!client.current) throw new Error('Rekuest is not connected.');
        const input = operation === 'resume' || operation === 'step' ? {task: id, step: operation === 'step'} : {task: id};
        const mutation =
          operation === 'cancel'
            ? CancelDocument
            : operation === 'pause'
              ? PauseDocument
              : operation === 'interrupt'
                ? InterruptDocument
                : ResumeDocument;
        return client.current.mutate({mutation, variables: {input}});
      };
      return run().catch((error: unknown) => reportError(error, FAILED[operation]));
    };
  }, [canRef, client, id]);
  return {can, control};
};
