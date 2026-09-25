import { moduleTaskHooks } from "@/app/modules/registries";
import { fileDownloadHook } from "@/lib/export/taskHooks";
import { lazyRecord } from "@/lib/module-host/lazy";
import { TaskHook } from "./types";

/**
 * All registered task hooks: the host's file download plus every module's
 * `taskHooks` builtin. Keyed by `type` for O(1) dispatch in the runner, and
 * built on first read (see `app/modules/registries`).
 */
export const TASK_HOOKS: Record<string, TaskHook> = lazyRecord(() =>
  Object.fromEntries([fileDownloadHook, ...moduleTaskHooks()].map((hook) => [hook.type, hook])),
);
