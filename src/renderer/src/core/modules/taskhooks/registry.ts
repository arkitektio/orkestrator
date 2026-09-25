import { moduleTaskHooks } from "@/core/modules/registries";
import { fileDownloadHook } from "@/core/modules/export/taskHooks";
import { derivedRecord } from "@/core/modules/host/lazy";
import { TaskHook } from "./types";

/**
 * All registered task hooks: the host's file download plus every module's
 * `taskHooks` builtin. Keyed by `type` for O(1) dispatch in the runner, and
 * built on first read (see `app/modules/registries`).
 */
export const TASK_HOOKS: Record<string, TaskHook> = derivedRecord(() =>
  Object.fromEntries([fileDownloadHook, ...moduleTaskHooks()].map((hook) => [hook.type, hook])),
);
