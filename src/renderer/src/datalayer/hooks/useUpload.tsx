/**
 * The datalayer's generic upload primitives. Nothing here knows a module:
 * grants come from the caller, who got them from its own service.
 */
export const uploadFetch = (
  url: RequestInfo | URL,
  options?:
    | (RequestInit & { onProgress?: (ev: ProgressEvent) => void })
    | undefined,
) =>
  new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status !== 204) {
        reject(new Error(`Failed to upload file: ${xhr.responseText}`));
      }
      const body = "response" in xhr ? xhr.response : (xhr as any).responseText;
      resolve(new Response(body));
    };
    xhr.onerror = () => {
      reject(new TypeError("Network request failed"));
    };
    xhr.ontimeout = () => {
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
      const signal = options.signal;

      if (signal) {
        signal.addEventListener("abort", () => {
          xhr.abort();
          reject(new DOMException("Aborted", "AbortError"));
        });
      }
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

/**
 * Uploads `file` to the datalayer under a grant a module's own service
 * issued. Generic on purpose: each module requests its grant from its own
 * service (`useKraphMediaUpload`, `useLokUpload`, ...) and hands it here.
 */
export const uploadToStore = async (
  file: File,
  endpointUrl: string,
  z: object,
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
