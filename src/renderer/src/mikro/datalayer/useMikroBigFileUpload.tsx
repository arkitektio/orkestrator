import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { UploadAlreadyStored } from "@/core/datalayer/UploadProvider";
import { DialogDismissedError } from "@/core/dialogs/DialogProvider";
import { useDialog } from "@/core/dialogs/registry";
import { useMikro } from "@/mikro/api/funcs";
import type { DuplicateUploadChoice } from "@/mikro/forms/DuplicateUploadForm";
import {
  BigFileUploadGrantFragment,
  FileCandidatesDocument,
  FileCandidatesQuery,
  FileCandidatesQueryVariables,
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
  /**
   * Ask before sending a file mikro already holds (default). Off where the
   * upload itself runs inside an awaited dialog: the question would replace it.
   */
  checkDuplicates?: boolean;
};

/** One question at a time: files dropped together are asked about in turn, never over each other. */
let asking: Promise<unknown> = Promise.resolve();
const oneAtATime = <T,>(ask: () => Promise<T>): Promise<T> => {
  const next = asking.then(ask, ask);
  asking = next.catch(() => undefined);
  return next;
};

const filePathOf = (file: File): string =>
  window.api?.getFilePath ? window.api.getFilePath(file) : (file as any).path || file.name;

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
    const filePath = filePathOf(file);

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
  const { awaitDialog } = useDialog();

  /**
   * Before a byte is sent: does mikro already hold this file? The sample (size
   * and three 4 MiB windows, 12 MiB read) finds candidates; only then is the
   * whole file hashed, to tell a copy from a file that merely shares those
   * windows. A real copy — or one whose digest mikro does not know yet — is put
   * to the person. "Use the stored file" ends the upload as `UploadAlreadyStored`;
   * closing the question cancels it. Anything failing here only means the check
   * is skipped: it never stops an upload.
   */
  const askAboutCopies = useCallback(
    async (file: File, options?: UploadOptions) => {
      if (!client || !window.api?.sampleBigFile || !window.api?.digestBigFile) return;
      const path = filePathOf(file);
      let candidates: FileCandidatesQuery["fileCandidates"] = [];
      let size = 0;
      let verified = false;
      try {
        const sampled = await window.api.sampleBigFile({ path });
        size = sampled.size;
        const { data } = await client.query<FileCandidatesQuery, FileCandidatesQueryVariables>({
          query: FileCandidatesDocument,
          variables: { size: sampled.size, sample: sampled.sample },
          fetchPolicy: "network-only",
        });
        candidates = data?.fileCandidates ?? [];
        if (candidates.length === 0) return;
        options?.signal?.throwIfAborted();
        const { digest } = await window.api.digestBigFile({ path });
        const same = candidates.filter((candidate) => candidate.store.digest === digest);
        // A candidate with a known, different digest is a different file.
        candidates = same.length > 0 ? same : candidates.filter((candidate) => candidate.store.digest == null);
        if (candidates.length === 0) return;
        verified = same.length > 0;
      } catch (error) {
        if ((error as Error)?.name === "AbortError") throw error;
        console.warn("Could not check whether the file is already stored; uploading it.", error);
        return;
      }

      const choice = await oneAtATime(() =>
        awaitDialog<DuplicateUploadChoice, "duplicateupload">("duplicateupload", {
          fileName: file.name,
          size,
          verified,
          candidates,
        }),
      ).catch((error) => {
        if (error instanceof DialogDismissedError) throw new DOMException("Aborted", "AbortError");
        throw error;
      });
      if (choice.kind === "existing") {
        throw new UploadAlreadyStored({
          object: { identifier: "@mikro/file", id: choice.file.id, label: choice.file.name },
          container: choice.file.folder
            ? { identifier: "@mikro/folder", id: choice.file.folder.id, label: choice.file.folder.name }
            : undefined,
        });
      }
    },
    [client, awaitDialog],
  );

  const upload = useCallback(
    async (file: File, options?: UploadOptions) => {
      if (!client) {
        throw Error("No client configured");
      }

      if (options?.checkDuplicates !== false) {
        await askAboutCopies(file, options);
      }

      const data = await client.mutate<
        RequestBigfileUploadMutation,
        RequestBigfileUploadMutationVariables
      >({
        mutation: RequestBigfileUploadDocument,
        variables: {
          input: { originalFileName: file.name, fileSize: file.size },
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
    [client, datalayerEndpoint, askAboutCopies],
  );

  return upload;
};
