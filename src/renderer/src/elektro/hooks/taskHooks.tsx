import { fileDownloadHook } from "@/core/lib/export/taskHooks";
import { TaskHook } from "@/core/lib/taskhooks/types";

export { ELEKTRO_FILE_IDENTIFIER } from "../downloads";
export const ELEKTRO_DOWNLOAD_HOOK = "elektro.download";

/**
 * The generic file download (`lib/export/taskHooks.ts`) under its old name:
 * pending hooks are persisted, so an export started before the rename still
 * finds its handler after a reload.
 */
export const ELEKTRO_TASK_HOOKS: TaskHook[] = [
  { ...fileDownloadHook, type: ELEKTRO_DOWNLOAD_HOOK },
];
