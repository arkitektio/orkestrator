import {
  useDatalayerEndpoint,
  useKraph
} from "@/app/Arkitekt";
import {
  MediaUploadGrantFragment,
  RequestMediaUploadDocument,
  RequestMediaUploadMutation,
  RequestMediaUploadMutationVariables,
} from "@/kraph/api/graphql";
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
  z: MediaUploadGrantFragment,
  options?: UploadOptions,
) => {
  if (!z) {
    throw Error("No client configured");
  }

  // Media grants now carry short-lived S3 credentials (accessKey/secretKey/sessionToken)
  // instead of a bearer JWT, so uploads are delegated to the Electron main process,
  // which already knows how to perform a signed S3 upload (see useMikroBigFileUpload).
  if (!window.api?.uploadBigFile) {
    throw Error("Media upload is only supported in the Electron app");
  }

  const uploadId = options?.id || crypto.randomUUID();

  return new Promise<string>((resolve, reject) => {
    if (options?.signal) {
      options.signal.addEventListener("abort", () => {
        window.api.cancelBigFile({ uploadId });
        reject(new DOMException("Aborted", "AbortError"));
      });
    }

    const filePath = window.api?.getFilePath
      ? window.api.getFilePath(file)
      : (file as any).path || file.name;

    window.api
      .uploadBigFile({
        uploadId,
        path: filePath,
        grant: z,
        endpointUrl,
      })
      .then((resultStore: string) => {
        resolve(resultStore);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
};

export const useKraphMediaUpload = () => {
  const client = useKraph();
  const datalayerEndpoint = useDatalayerEndpoint();

  const upload = useCallback(
    async (file: File) => {
      if (!client || !datalayerEndpoint) {
        throw Error("No client configured");
      }

      const data = await client.mutate<
        RequestMediaUploadMutation,
        RequestMediaUploadMutationVariables
      >({
        mutation: RequestMediaUploadDocument,
        variables: {
          input: { originalFileName: file.name,  },
        },
      });

      if (!data.data?.requestMediaUpload) {
        throw Error("Failed to request upload");
      }

      const z = data.data.requestMediaUpload;


      return await uploadToStore(file, datalayerEndpoint, z, {});
    },
    [client, datalayerEndpoint],
  );

  return upload;
};
