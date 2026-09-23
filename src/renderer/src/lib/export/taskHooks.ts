import { TaskHook } from "@/lib/taskhooks/types";
import { toast } from "sonner";

import { FILE_DOWNLOADERS } from "./fileDownloaders";

export const FILE_DOWNLOAD_HOOK = "file.download";

/**
 * Download the file a completed task returned. The first return port that is
 * a downloadable file model (`FILE_DOWNLOADERS`) is the file, so one hook
 * serves every exporter whatever module its file lives in. `params.name` is
 * what was exported, for the toasts.
 */
export const fileDownloadHook: TaskHook = {
  type: FILE_DOWNLOAD_HOOK,
  onSuccess: async (ctx) => {
    const name =
      (ctx.params.name as string | undefined) ??
      (ctx.params.modelName as string | undefined) ??
      "it";

    // `returns` is positional, aligned to the task action's return ports.
    const returnPorts = ctx.task.action?.returns ?? [];
    const index = returnPorts.findIndex(
      (port) => !!port.identifier && port.identifier in FILE_DOWNLOADERS,
    );
    const fileId = index >= 0 ? (ctx.returns[index] as string | undefined) : undefined;
    if (index < 0 || !fileId) {
      toast.error(`Export of ${name} produced no file.`);
      return;
    }

    const downloader = FILE_DOWNLOADERS[returnPorts[index].identifier!];
    const fileName = await downloader.download(ctx, fileId);
    toast.success(`Exported ${name} — ${fileName} downloaded.`);
  },
};
