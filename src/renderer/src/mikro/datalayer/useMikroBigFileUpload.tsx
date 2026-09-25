import {
  useDatalayerEndpoint,
  useMikro
} from "@/core/app/Arkitekt";
import {
  BigFileUploadGrantFragment,
  FinishBigfileUploadDocument,
  FinishBigfileUploadMutation,
  FinishBigfileUploadMutationVariables,
  RequestBigfileUploadDocument,
  RequestBigfileUploadMutation,
  RequestBigfileUploadMutationVariables
} from "@/mikro/api/graphql";
import { useCallback } from "react";

export const uploadFetch = (
  url: RequestInfo | URL,
  options?:
    | (RequestInit & { onProgress?: (ev: ProgressEvent) => void })
    | undefined,
) =>
  new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Remove the progress + abort listeners once the request settles. The abort
    // listener in particular is attached to a caller-owned AbortSignal that
    // usually outlives the request, so without this each chunk/retry leaks a
    // listener (closing over xhr) onto that long-lived signal.
    const onAbort = () => {
      xhr.abort();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const cleanup = () => {
      if (options?.onProgress) {
        xhr.upload.removeEventListener("progress", options.onProgress);
      }
      options?.signal?.removeEventListener("abort", onAbort);
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status !== 204) {
        reject(new Error(`Failed to upload file: ${xhr.responseText}`));
      }
      const body = "response" in xhr ? xhr.response : (xhr as any).responseText;
      resolve(new Response(body));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new TypeError("Network request failed"));
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new TypeError("Network request failed"));
    };

    xhr.open(options?.method || "POST", url.toString(), true);

    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }

    if (options?.onProgress) {
      xhr.upload.addEventListener("progress", options.onProgress);
    }

    if (options?.signal) {
      options.signal.addEventListener("abort", onAbort);
    }

    xhr.send(options?.body as any);
  });

export type ExtraRequest = RequestInit & {
  onProgress?: (this: any, e: ProgressEvent) => void;
};

export type UploadOptions = {
  signal?: AbortSignal;
  onProgress?: (ev: ProgressEvent) => void;
  id?: string;
};

const uploadToStore = async (
  file: File,
  endpointUrl: string,
  z: BigFileUploadGrantFragment,
  options?: UploadOptions,
) => {
  if (!z) {
    throw Error("No client configured",);
  }

  // Fallback if we are not in Electron (shouldn't happen in this app context, but good for safety)
  if (!window.api?.uploadBigFile) {
     throw Error("Big file upload is only supported in the Electron app");
  }

  const uploadId = options?.id || crypto.randomUUID();

  return new Promise((resolve, reject) => {
    if (options?.signal) {
       options.signal.addEventListener("abort", () => {
         window.api.cancelBigFile({ uploadId });
         reject(new DOMException("Aborted", "AbortError"));
       });
    }

    // In Electron, File objects dragged into the app might fall back to web standards depending on version/handling.
    // Use window.api.getFilePath(file) if available (via webUtils).
    const filePath = window.api?.getFilePath ? window.api.getFilePath(file) : (file as any).path || file.name;

    window.api.uploadBigFile({
       uploadId,
       path: filePath,
       grant: z,
       endpointUrl
    }).then((resultStore: string) => {
       resolve(resultStore);
    }).catch((err: any) => {
       reject(err);
    });
  });
};

export const useMikroBigFileUpload = () => {
  const client = useMikro();
  const datalayerEndpoint = useDatalayerEndpoint();

  const upload = useCallback(
    async (file: File, options?: UploadOptions) => {
      if (!client) {
        throw Error("No client configured");
      }

      const data = await client.mutate<
        RequestBigfileUploadMutation,
        RequestBigfileUploadMutationVariables
      >({
        mutation: RequestBigfileUploadDocument,
        variables: {
          input: { originalFileName: file.name,  },
        },
      });

      if (!data.data?.requestBigfileUpload) {
        throw Error(`Failed to get upload grant: ${JSON.stringify(data)}`);
        }

      if (!datalayerEndpoint) {
        throw Error("No datalayer endpoint configured");
      }

      const z = data.data.requestBigfileUpload;

      await uploadToStore(file, datalayerEndpoint, z, options);

      await client.mutate<FinishBigfileUploadMutation, FinishBigfileUploadMutationVariables>({
        mutation: FinishBigfileUploadDocument,
        variables: {
          input: {
            storeId: z.store,
          },
        },
      });

      return z.store;
    },
    [client, datalayerEndpoint],
  );

  return upload;
};
