import { ELEKTRO_TASK_HOOKS } from "@/elektro/hooks/taskHooks";
import { fileDownloadHook } from "@/lib/export/taskHooks";
import { TaskHook } from "./types";

/**
 * All registered task hooks, merged from per-module maps (mirrors the per-module
 * local-action maps in `app/localactions.tsx`). Add a module's hooks by spreading
 * its array here. Keyed by `type` for O(1) dispatch in the runner.
 */
const ALL_TASK_HOOKS: TaskHook[] = [fileDownloadHook, ...ELEKTRO_TASK_HOOKS];

export const TASK_HOOKS: Record<string, TaskHook> = Object.fromEntries(
  ALL_TASK_HOOKS.map((hook) => [hook.type, hook]),
);
