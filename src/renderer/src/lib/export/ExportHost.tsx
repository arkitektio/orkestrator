import { useDialog } from "@/app/dialog";
import { useConnection } from "@/lib/arkitekt/provider";
import { useDownload } from "@/providers/download/DownloadProvider";
import { Structure } from "@/types";
import type { ApolloClient } from "@apollo/client";
import { useEffect } from "react";
import { toast } from "sonner";

import { useLatestRef } from "@/hooks/useLatestRef";

import { FILE_DOWNLOADERS, FileDownloadContext } from "./fileDownloaders";
import { subscribeExportRequests } from "./exportRequests";
import { structureLabel } from "./structureLabel";

/**
 * What an export request does, as a plain function so it can be tested
 * without the providers: every file downloads; of the rest, only the first —
 * the card that was grabbed — opens the export dialog. A selection of ten
 * images is not ten dialogs.
 */
export const handleExportRequest = (
  structures: Structure[],
  deps: {
    ctx: FileDownloadContext;
    openExportDialog: (structure: Structure) => void;
  },
) => {
  const files = structures.filter(({ identifier }) => identifier in FILE_DOWNLOADERS);
  const [first] = structures;

  for (const file of files) {
    const downloader = FILE_DOWNLOADERS[file.identifier];
    downloader.download(deps.ctx, file.id).catch((error: unknown) => {
      toast.error(
        `Couldn't download ${structureLabel(file)}: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  if (first && !(first.identifier in FILE_DOWNLOADERS)) {
    deps.openExportDialog(first);
  }
};

/**
 * Carries out `requestExport` — mounted once, inside the dialog and download
 * providers. Not behind a module guard: each file download checks its own
 * service's client, and the dialog provider guards the export dialog with
 * `Guard.Rekuest`.
 */
export const ExportHost = () => {
  const { openDialog } = useDialog();
  const { startDownload } = useDownload();
  const connection = useConnection();

  const deps = useLatestRef({ openDialog, startDownload, connection });

  useEffect(
    () =>
      subscribeExportRequests((structures) => {
        const { openDialog, startDownload, connection } = deps.current;
        const serviceMap = connection?.serviceMap ?? {};
        handleExportRequest(structures, {
          ctx: {
            getClient: (service) =>
              serviceMap[service]?.client as ApolloClient<unknown> | undefined,
            datalayerEndpoint: (serviceMap["datalayer"]?.client as { url?: string } | undefined)
              ?.url,
            startDownload,
          },
          openExportDialog: (structure) =>
            openDialog("exporttofile", { structure }, { size: "medium" }),
        });
      }),
    [deps],
  );

  return null;
};
