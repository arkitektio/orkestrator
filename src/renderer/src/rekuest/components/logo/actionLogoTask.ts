import { loadVocabulary } from "@arkitektio/bsx/spec/vocabulary";
import { latestTaskRecord, type LatestTaskSource } from "../blokLatestTask";

/**
 * The task an action logo draws against (blok language v2: the logo reads
 * `task`, the viewer's last task of the action, null until they run it), in
 * the one task-record shape (vocabulary `records.task`): lowercase status,
 * `running`/`done`/`failed`, `progress`, `message`, `error`, `args`, `ask`,
 * `answer`, `returns`.
 */
export type ActionLogoTask = Readonly<Record<string, unknown>> & { readonly running: boolean };

const idle = (): Record<string, unknown> => ({ ...(loadVocabulary().records.task.idle ?? {}) });

export const actionLogoTask = (task: LatestTaskSource): ActionLogoTask => {
  const folded = latestTaskRecord(task);
  return {
    ...idle(),
    id: task.id,
    status: folded.status,
    running: folded.running,
    done: folded.done,
    failed: folded.failed,
    progress: folded.progress,
    message: folded.message || null,
    error: folded.error || null,
    returns: folded.returns,
  };
};
