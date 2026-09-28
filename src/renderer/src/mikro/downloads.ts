import { bigFileDownloader, type FileDownloader } from "@/core/modules/export/fileDownloaders";
import { GetFileDocument } from "./api/graphql";
import { downloadMikroBigFile } from "./datalayer/useMikroBigFileDownload";

export const MIKRO_FILE_IDENTIFIER = "@mikro/file";

/** Mikro's file models, and how they reach the disk (a module builtin). */
export const MIKRO_FILE_DOWNLOADERS: Record<string, FileDownloader> = {
  [MIKRO_FILE_IDENTIFIER]: bigFileDownloader(
    MIKRO_FILE_IDENTIFIER,
    "mikro",
    GetFileDocument,
    downloadMikroBigFile,
  ),
};
