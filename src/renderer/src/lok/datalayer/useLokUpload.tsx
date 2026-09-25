import { useCoordinationEndpoint, useLok } from "@/core/app/Arkitekt";
import {
  PresignedPostCredentialsFragment,
  RequestMediaUploadDocument,
  RequestMediaUploadMutation,
  RequestMediaUploadMutationVariables,
} from "@/lok/api/graphql";
import { ApolloClient, NormalizedCache } from "@apollo/client";
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
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new MediaUploadError(storeError(xhr.responseText, xhr.status)));
        return;
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

/**
 * What lok's media bucket takes (`presign_media_upload`): raster images only —
 * no SVG or HTML, the bucket is served from our own domain — up to 10 MiB. The
 * store enforces both through the signed policy; checking here too turns a
 * cryptic S3 refusal into a sentence, before any bytes are sent.
 */
export const LOK_MEDIA_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
] as const;
export const LOK_MEDIA_ACCEPT = LOK_MEDIA_TYPES.join(",");
export const LOK_MEDIA_MAX_BYTES = 10 * 1024 * 1024;

export class MediaUploadError extends Error {}

/** Why lok would refuse this file, or null if it would not. */
export const lokMediaProblem = (file: Pick<File, "type" | "size">): string | null => {
  if (!(LOK_MEDIA_TYPES as readonly string[]).includes(file.type)) {
    return "Only PNG, JPEG, GIF, WebP and AVIF images can be uploaded";
  }
  if (file.size > LOK_MEDIA_MAX_BYTES) {
    return "Images can be at most 10 MB";
  }
  return null;
};

/** S3 answers a refused POST with an XML `<Message>`; fall back to the status. */
const storeError = (body: string, status: number) => {
  const message = /<Message>([^<]*)<\/Message>/.exec(body)?.[1];
  return `Upload refused by the store${message ? `: ${message}` : ` (HTTP ${status})`}`;
};

export type ExtraRequest = RequestInit & {
  onProgress?: (this: any, e: ProgressEvent) => void;
};

const customFetch = (uri: any, options: ExtraRequest) => {
  if (options.onProgress) {
    return uploadFetch(uri, options);
  }
  return fetch(uri, options);
};

export type UploadOptions = {
  signal?: AbortSignal;
  onProgress?: (ev: ProgressEvent) => void;
};

const uploadToStore = async (
  file: File,
  endpointUrl: string,
  z: PresignedPostCredentialsFragment,
  options?: UploadOptions,
) => {
  if (!z) {
    throw Error("No client configured");
  }

  const data = new FormData();
  data.append("key", z.key);
  data.append("bucket", z.bucket);
  data.append("X-Amz-Algorithm", z.xAmzAlgorithm);
  data.append("X-Amz-Credential", z.xAmzCredential);
  data.append("X-Amz-Date", z.xAmzDate);
  data.append("X-Amz-Signature", z.xAmzSignature);
  data.append("Policy", z.policy);
  // The policy pins the type exactly; the store refuses anything else.
  data.append("Content-Type", z.contentType);

  data.append("file", file); // HYPER IMPORTANT TO BE THE LAST ITEM FOR FUCKS SAKE; HOW CAN THIS BE A STANDARD?

  const x = customFetch(`${endpointUrl}/${z.bucket}`, {
    body: data,
    mode: "cors",
    method: "POST",
    onProgress: options?.onProgress,
    signal: options?.signal,
  });

  const response = await x;
  // `fetch` resolves on a 4xx; a refused upload must not pass for a stored one.
  if (!response.ok) {
    throw new MediaUploadError(storeError(await response.text(), response.status));
  }
  return `${z.store}`;
};

export const useLokUpload = () => {
  const client = useLok() as ApolloClient<NormalizedCache> | undefined;
  // lok's media store is the coordination server's, at its base path — not the
  // `datalayer` service fakts hands the modules.
  const datalayerEndpoint = useCoordinationEndpoint();

  const upload = useCallback(
    async (file: File, options?: UploadOptions) => {
      if (!client) {
        throw Error("No client configured");
      }

      if (!datalayerEndpoint) {
        throw Error("Not connected to a coordination server");
      }

      const problem = lokMediaProblem(file);
      if (problem) {
        throw new MediaUploadError(problem);
      }

      const data = await client.mutate<
        RequestMediaUploadMutation,
        RequestMediaUploadMutationVariables
      >({
        mutation: RequestMediaUploadDocument,
        variables: {
          key: file.name,
          datalayer: "default",
          contentType: file.type,
        },
      });

      if (!data.data?.requestMediaUpload) {
        throw Error("Failed to request upload");
      }

      const z = data.data.requestMediaUpload;

      return await uploadToStore(file, datalayerEndpoint, z, options);
    },
    [client, datalayerEndpoint],
  );

  return upload;
};

export type FileUploadOptions = {
  signal?: AbortSignal;
  onProgress?: (ev: ProgressEvent) => void;
};
