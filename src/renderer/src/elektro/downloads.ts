import { bigFileDownloader, type FileDownloader } from "@/core/lib/export/fileDownloaders";
import { GetFileDocument } from "./api/graphql";
import { downloadElektroBigFile } from "./datalayer/useElektroBigFileDownload";

export const ELEKTRO_FILE_IDENTIFIER = "@elektro/file";

/** Elektro's file models, and how they reach the disk (a module builtin). */
export const ELEKTRO_FILE_DOWNLOADERS: Record<string, FileDownloader> = {
  [ELEKTRO_FILE_IDENTIFIER]: bigFileDownloader(
    ELEKTRO_FILE_IDENTIFIER,
    "elektro",
    GetFileDocument,
    downloadElektroBigFile,
  ),
};
