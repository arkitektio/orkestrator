import { AwsClient } from "aws4fetch";

import {
  FinishKulisseUploadDocument,
  FinishMediaUploadDocument,
  RequestKulisseUploadDocument,
  RequestMediaUploadDocument,
  type FinishKulisseUploadMutation,
  type FinishMediaUploadMutation,
  type MediaUploadGrantFragment,
  type RequestKulisseUploadMutation,
  type RequestMediaUploadMutation,
} from "@/mikro/api/graphql";
import type { MikroClient } from "@/core/data/zarr/store/types";

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

/** The grant fields a PUT needs, whatever kind of store it writes. */
type PutGrant = Pick<MediaUploadGrantFragment, "accessKey" | "secretKey" | "sessionToken" | "region" | "bucket" | "key" | "maxBytes">;

/** PUT `blob` with `grant`, refusing up front what the grant's byte cap would. */
const putWithGrant = async (datalayer: string, grant: PutGrant, blob: Blob, contentType: string): Promise<void> => {
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
    // Leave the store row invalid: finishing is what promotes it, so simply
    // not calling it is how a failed upload is abandoned.
    throw new MediaUploadError(
      `Upload failed: ${response.status} ${response.statusText}`,
    );
  }
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

  await putWithGrant(datalayer, grant, blob, contentType);

  const finished = (await client.mutate({
    mutation: FinishMediaUploadDocument,
    variables: { input: { storeId: grant.store, valid: true } },
  })) as { data?: FinishMediaUploadMutation };

  const store = finished.data?.finishMediaUpload;
  if (!store) throw new MediaUploadError("The datalayer would not finalize the upload");
  return store.id;
};

/**
 * Upload a binary glTF as a kulisse store and return its id — the
 * `KulisseLike` value `createFixture` takes. Finishing is where the server
 * reads the file: one that is not a self-contained glTF 2.0 model is refused
 * there, with the reason in the error.
 */
export const uploadKulisseBlob = async (
  client: MikroClient,
  datalayer: string,
  blob: Blob,
  fileName: string,
): Promise<string> => {
  const requested = (await client.mutate({
    mutation: RequestKulisseUploadDocument,
    variables: { input: { originalFileName: fileName, fileSize: blob.size } },
  })) as { data?: RequestKulisseUploadMutation };
  const grant = requested.data?.requestKulisseUpload;
  if (!grant) throw new MediaUploadError("The datalayer refused a model upload grant");

  await putWithGrant(datalayer, grant, blob, "model/gltf-binary");

  const finished = (await client.mutate({
    mutation: FinishKulisseUploadDocument,
    variables: { input: { storeId: grant.store, valid: true } },
  })) as { data?: FinishKulisseUploadMutation };

  const store = finished.data?.finishKulisseUpload;
  if (!store) throw new MediaUploadError("The datalayer would not finalize the model upload");
  return store.id;
};
