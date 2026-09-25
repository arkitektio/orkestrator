import { AwsClient } from "aws4fetch";

import {
  FinishMediaUploadDocument,
  RequestMediaUploadDocument,
  type FinishMediaUploadMutation,
  type MediaUploadGrantFragment,
  type RequestMediaUploadMutation,
} from "@/mikro/api/graphql";
import type { MikroClient } from "@/core/lib/zarr/store/types";

/**
 * Uploading a blob to the datalayer as a media file.
 *
 * Three steps, and the middle one is the reason this exists at all:
 *
 *  1. `requestMediaUpload` mints a store row and temporary S3 credentials.
 *  2. The client PUTs the bytes straight to S3 — the server never sees them.
 *  3. `finishMediaUpload` marks the store valid, and its id is what the
 *     `ImageFileLike` scalar wants (`createSceneSnapshot`, `createSnapshot`).
 *
 * Signed with `aws4fetch`, the same signer the viewer already uses for reads
 * (the zarr read path in `lib/zarr/store`). The main process has
 * an `@aws-sdk` uploader (`main/modules/BigFileUploadService.ts`) but it streams
 * from a FILE PATH — a canvas blob never touches disk, so it cannot be reused.
 * Its grant handling is what this mirrors: path-style addressing against the
 * datalayer endpoint, `bucket`/`key` from the grant, and `grant.store` as the
 * value handed back to GraphQL.
 */

export class MediaUploadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "MediaUploadError";
  }
}

/** Path-style S3 object URL: MinIO (the usual datalayer) is not virtual-hosted. */
const objectUrl = (datalayer: string, bucket: string, key: string): string =>
  `${datalayer.replace(/\/+$/, "")}/${bucket}/${key.replace(/^\/+/, "")}`;

const requestGrant = async (
  client: MikroClient,
  input: { originalFileName: string; contentType: string; fileSize: number },
): Promise<MediaUploadGrantFragment> => {
  const result = (await client.mutate({
    mutation: RequestMediaUploadDocument,
    variables: { input },
  })) as { data?: RequestMediaUploadMutation };

  const grant = result.data?.requestMediaUpload;
  if (!grant) throw new MediaUploadError("The datalayer refused an upload grant");
  return grant;
};

/**
 * Upload `blob` and return the media store's id — the `ImageFileLike` value.
 *
 * Throws rather than returning null: every caller so far treats a snapshot as
 * best-effort and swallows this, but which step failed is worth saying out
 * loud, and a null would throw that away.
 */
export const uploadMediaBlob = async (
  client: MikroClient,
  datalayer: string,
  blob: Blob,
  fileName: string,
): Promise<string> => {
  const contentType = blob.type || "application/octet-stream";
  const grant = await requestGrant(client, {
    originalFileName: fileName,
    contentType,
    fileSize: blob.size,
  });

  // The grant caps the object size; a PUT over it fails at S3 with an opaque
  // 403, so check it here where the number is still in hand.
  if (grant.maxBytes && blob.size > grant.maxBytes) {
    throw new MediaUploadError(
      `Upload is ${blob.size} bytes, over the datalayer's ${grant.maxBytes}-byte limit`,
    );
  }

  const aws = new AwsClient({
    accessKeyId: grant.accessKey,
    secretAccessKey: grant.secretKey,
    sessionToken: grant.sessionToken,
    service: "s3",
    region: grant.region,
  });

  const response = await aws.fetch(objectUrl(datalayer, grant.bucket, grant.key), {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": contentType },
  });

  if (!response.ok) {
    // Leave the store row invalid: `finishMediaUpload` is what promotes it, so
    // simply not calling it is how a failed upload is abandoned.
    throw new MediaUploadError(
      `Upload failed: ${response.status} ${response.statusText}`,
    );
  }

  const finished = (await client.mutate({
    mutation: FinishMediaUploadDocument,
    variables: { input: { storeId: grant.store, valid: true } },
  })) as { data?: FinishMediaUploadMutation };

  const store = finished.data?.finishMediaUpload;
  if (!store) throw new MediaUploadError("The datalayer would not finalize the upload");
  return store.id;
};
