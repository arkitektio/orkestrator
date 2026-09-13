import { useDialog } from "@/app/dialog";
import { useConnection } from "@/lib/arkitekt/provider";
import { useDownload } from "@/providers/download/DownloadProvider";
import { TaskEventKind, useFullTaskQuery } from "@/rekuest/api/graphql";
import { ApolloClient } from "@apollo/client";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PendingHook, usePendingHooksStore } from "./pendingHooksStore";
import { TASK_HOOKS } from "./registry";
import { HookContext } from "./types";

const TERMINAL_FAILURE_KINDS: TaskEventKind[] = [
  TaskEventKind.Critical,
  TaskEventKind.Failed,
  TaskEventKind.Cancelled,
  TaskEventKind.Interrupted,
];

/**
 * Watches every persisted pending hook and dispatches its registered handler the
 * moment the task yields (or errors). Mounted once at the app root, so it
 * re-attaches to still-running (or already-finished) hooks on every reload —
 * this is what makes a hook survive a reload. Generalizes the old ExportWatcher.
 */
export const TaskHookRunner = () => {
  const hooks = usePendingHooksStore((s) => s.hooks);

  return (
    <>
      {hooks
        .filter((h) => h.status !== "done")
        .map((entry) => (
          <SingleHookWatcher key={entry.reference} entry={entry} />
        ))}
    </>
  );
};

const SingleHookWatcher = ({ entry }: { entry: PendingHook }) => {
  const setStatus = usePendingHooksStore((s) => s.setStatus);
  const removePendingHook = usePendingHooksStore((s) => s.removePendingHook);
  const { startDownload } = useDownload();
  const navigate = useNavigate();
  const dialog = useDialog();
  const connection = useConnection();

  // Dedupes within one mount. After a reload the task is re-read from cache, so
  // completion still fires (the ref resets with the fresh mount).
  const handledRef = useRef(false);

  // Full ports: handlers align positional `returns` to `task.action.returns`.
  const { data } = useFullTaskQuery({
    variables: { id: entry.taskId },
    fetchPolicy: "cache-and-network",
  });
  const task = data?.task;

  useEffect(() => {
    if (!task || handledRef.current) return;

    const hook = TASK_HOOKS[entry.hookType];
    const serviceMap = connection?.serviceMap ?? {};
    const buildCtx = (returns: unknown[]): HookContext => ({
      task,
      returns,
      params: entry.params,
      getClient: (service) =>
        serviceMap[service]?.client as ApolloClient<unknown> | undefined,
      datalayerEndpoint: (
        serviceMap["datalayer"]?.client as { url?: string } | undefined
      )?.url,
      startDownload,
      navigate,
      dialog,
    });

    const failure = task.events.find((e) =>
      TERMINAL_FAILURE_KINDS.includes(e.kind),
    );
    if (failure) {
      handledRef.current = true;
      setStatus(entry.reference, "error", failure.message ?? "Task failed");
      void hook?.onError?.(buildCtx([]));
      window.setTimeout(() => removePendingHook(entry.reference), 8000);
      return;
    }

    const yieldEvent = task.events.find(
      (e) => e.kind === TaskEventKind.Yield && e.returns,
    );
    if (!yieldEvent || !yieldEvent.returns) return;

    handledRef.current = true;

    if (!hook) {
      console.warn(`No task hook registered for type "${entry.hookType}"`);
      removePendingHook(entry.reference);
      return;
    }

    void (async () => {
      try {
        await hook.onSuccess(buildCtx(yieldEvent.returns as unknown[]));
        removePendingHook(entry.reference);
      } catch (e: any) {
        setStatus(entry.reference, "error", e?.message ?? String(e));
      }
    })();
  }, [task, entry, connection, setStatus, removePendingHook, startDownload, navigate, dialog]);

  return null;
};
