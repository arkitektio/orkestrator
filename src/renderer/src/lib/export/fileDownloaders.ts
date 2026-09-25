import type { DownloadProps } from "@/providers/download/DownloadProvider";
import type { ApolloClient, DocumentNode } from "@apollo/client";

/** What a download needs from the app, so a downloader can be a plain function. */
export type FileDownloadContext = {
  getClient: (service: string) => ApolloClient<unknown> | undefined;
  datalayerEndpoint?: string;
  startDownload: DownloadProps["startDownload"];
};

type BigFileDownload = (
  client: ApolloClient<unknown>,
  datalayerEndpoint: string,
  storeId: string,
  fileName?: string,
  options?: {
    id?: string;
    signal?: AbortSignal;
    onProgress?: (ev: { loaded: number; total: number }) => void;
  },
) => Promise<string>;

/** What a module's file query answers: a name and the big-file store it lives in. */
type BigFileQuery = { file?: { name: string; store: { id: string } } | null };

/** A smart model that IS a file, and how to bring it to disk. */
export type FileDownloader = {
  identifier: string;
  /** The module whose client fetches it; absent, it cannot be downloaded. */
  service: string;
  /** Downloads to the Downloads folder, with progress in the rail. Returns the file's name. */
  download: (ctx: FileDownloadContext, fileId: string) => Promise<string>;
};

/**
 * Which file models can be downloaded is the modules' to say: each registers
 * its downloaders as a builtin (`fileDownloaders`), and the host reads them
 * from `FILE_DOWNLOADERS` in `app/modules/registries`.
 *
 * Every `File` model in the datalayer has the same shape — a name and a big
 * file store — so one builder serves each module: look the file up, then
 * stream it through the module's own access grant.
 */
export const bigFileDownloader = (
  identifier: string,
  service: string,
  query: DocumentNode,
  downloadBigFile: BigFileDownload,
): FileDownloader => ({
  identifier,
  service,
  download: async (ctx, fileId) => {
    const client = ctx.getClient(service);
    if (!client) {
      throw new Error(`${service} is not available to download the file.`);
    }
    const endpoint = ctx.datalayerEndpoint;
    if (!endpoint) {
      throw new Error("No datalayer endpoint configured.");
    }

    const res = await client.query<BigFileQuery, { id: string }>({
      query,
      variables: { id: fileId },
    });
    const file = res.data?.file;
    if (!file) {
      throw new Error("File not found");
    }

    await ctx.startDownload(file.name, ({ id, signal, onProgress }) =>
      downloadBigFile(client, endpoint, file.store.id, file.name, { id, signal, onProgress }),
    );
    return file.name;
  },
});
