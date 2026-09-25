import { useDatalayerEndpoint, useElektro } from "@/app/Arkitekt";
import {
  BigFileAccessGrantFragment,
  FinishBigfileUploadDocument,
  FinishBigfileUploadMutation,
  FinishBigfileUploadMutationVariables,
  RequestBigfileAccessDocument,
  RequestBigfileAccessMutation,
  RequestBigfileAccessMutationVariables,
} from "@/elektro/api/graphql";
import type { ApolloClient } from "@apollo/client";
import { useCallback } from "react";

export type DownloadOptions = {
  signal?: AbortSignal;
  onProgress?: (ev: { loaded: number; total: number }) => void;
  id?: string;
  savePath?: string;
};

const downloadFromStore = async (
  fileName: string,
  endpointUrl: string,
  z: BigFileAccessGrantFragment,
  options?: DownloadOptions,
) => {
  if (!z) {
    throw Error("No grant provided for download");
  }

  console.log("downloadFromStore (big file IPC)", z, fileName);

  if (!window.api?.downloadBigFile) {
    throw Error("Big file download is only supported in the Electron app");
  }

  const downloadId = options?.id || crypto.randomUUID();

  return new Promise<string>((resolve, reject) => {
    if (options?.signal) {
      options.signal.addEventListener("abort", () => {
        window.api.cancelBigFileDownload({ downloadId });
        reject(new DOMException("Aborted", "AbortError"));
      });
    }

    window.api
      .downloadBigFile({
        downloadId,
        grant: z,
        endpointUrl,
        fileName,
        savePath: options?.savePath,
      })
      .then((savedPath: string) => {
        resolve(savedPath);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
};

/**
 * Non-React big-file download: request an access grant, stream the file via the
 * Electron IPC bridge, then finalize. Shared by the `useElektroBigFileDownload`
 * hook and the agent-side `download` implementation (which has no React
 * context, only the elektro Apollo client + datalayer endpoint).
 */
export const downloadElektroBigFile = async (
  client: ApolloClient<unknown>,
  datalayerEndpoint: string,
  storeId: string,
  fileName?: string,
  options?: DownloadOptions,
): Promise<string> => {
  const data = await client.mutate<
    RequestBigfileAccessMutation,
    RequestBigfileAccessMutationVariables
  >({
    mutation: RequestBigfileAccessDocument,
    variables: {
      input: { storeId },
    },
  });

  if (!data.data?.requestBigfileAccess) {
    throw Error(`Failed to get download grant: ${JSON.stringify(data)}`);
  }

  const z = data.data.requestBigfileAccess;

  const targetFileName = fileName || storeId; // Fallback to storeId if no name
  const resultPath = await downloadFromStore(
    targetFileName,
    datalayerEndpoint,
    z,
    options,
  );

  await client.mutate<
    FinishBigfileUploadMutation,
    FinishBigfileUploadMutationVariables
  >({
    mutation: FinishBigfileUploadDocument,
    variables: {
      input: {
        storeId,
      },
    },
  });

  return resultPath;
};

export const useElektroBigFileDownload = () => {
  const client = useElektro();
  const datalayerEndpoint = useDatalayerEndpoint();

  const download = useCallback(
    async (storeId: string, fileName?: string, options?: DownloadOptions) => {
      if (!client) {
        throw Error("No client configured");
      }

      if (!datalayerEndpoint) {
        throw Error("No datalayer endpoint configured");
      }

      return downloadElektroBigFile(
        client,
        datalayerEndpoint,
        storeId,
        fileName,
        options,
      );
    },
    [client, datalayerEndpoint],
  );

  return download;
};
