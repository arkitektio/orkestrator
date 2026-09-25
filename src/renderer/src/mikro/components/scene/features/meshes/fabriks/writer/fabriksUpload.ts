import { AwsClient } from "aws4fetch";

import {
  FinishFabriksUploadDocument,
  RequestFabriksUploadDocument,
  type FabriksUploadGrantFragment,
  type FinishFabriksUploadMutation,
  type RequestFabriksUploadMutation,
} from "@/mikro/api/graphql";
import type { MikroClient } from "@/lib/zarr/store/types";
import { MANIFEST_NAME } from "../fabriksManifest";

/**
 * Ship an in-memory fabriks prefix to the datalayer.
 *
 * Mirrors `platform/sources/mediaUpload.ts` (grant → signed PUT → finish),
 * with the two differences a PREFIX forces:
 *
 *  - The grant scopes a prefix, not an object: every file goes to
 *    `<datalayer>/<bucket>/<grant.key>/<relative path>`.
 *  - **`fabriks.json` is PUT last, alone, after every other file has landed.**
 *    The manifest is the format's completion marker — `finishFabriksUpload`
 *    reads it and refuses a prefix without one — so a failure anywhere before
 *    it leaves an unfinished prefix the server will never register, which is
 *    exactly the recovery story the format promises.
 */

export class FabriksUploadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "FabriksUploadError";
  }
}

const DEFAULT_PARALLELISM = 4;

const objectUrl = (datalayer: string, bucket: string, key: string, relative: string): string =>
  `${datalayer.replace(/\/+$/, "")}/${bucket}/${key.replace(/^\/+|\/+$/g, "")}/${relative}`;

const requestGrant = async (client: MikroClient): Promise<FabriksUploadGrantFragment> => {
  const result = (await client.mutate({
    mutation: RequestFabriksUploadDocument,
    variables: { input: {} },
  })) as { data?: RequestFabriksUploadMutation };
  const grant = result.data?.requestFabriksUpload;
  if (!grant) throw new FabriksUploadError("The datalayer refused a fabriks upload grant");
  return grant;
};

export type FabriksUploadProgress = {
  /** Files landed so far, out of `total` (the manifest counts as one). */
  done: number;
  total: number;
  bytesDone: number;
  bytesTotal: number;
};

/**
 * Upload every file of `files` and return the fabriks store's id — the
 * `FabriksLike` value `createMeshCollection` takes.
 *
 * `files` must have the manifest as an entry; it is uploaded last regardless
 * of its position. Rejects with `FabriksUploadError`; on any failure the
 * finish mutation is NOT called.
 */
export const uploadFabriksPrefix = async (
  client: MikroClient,
  datalayer: string,
  files: ReadonlyMap<string, Uint8Array>,
  options: {
    parallelism?: number;
    onProgress?: (progress: FabriksUploadProgress) => void;
    signal?: AbortSignal;
  } = {},
): Promise<string> => {
  const manifest = files.get(MANIFEST_NAME);
  if (!manifest) throw new FabriksUploadError(`The prefix has no ${MANIFEST_NAME}; nothing to register.`);

  let bytesTotal = 0;
  for (const bytes of files.values()) bytesTotal += bytes.byteLength;

  const grant = await requestGrant(client);
  if (grant.maxBytes && bytesTotal > grant.maxBytes) {
    throw new FabriksUploadError(
      `The collection is ${bytesTotal} bytes, over the datalayer's ${grant.maxBytes}-byte limit`,
    );
  }

  const aws = new AwsClient({
    accessKeyId: grant.accessKey,
    secretAccessKey: grant.secretKey,
    sessionToken: grant.sessionToken,
    service: "s3",
    region: grant.region,
  });

  const progress: FabriksUploadProgress = { done: 0, total: files.size, bytesDone: 0, bytesTotal };
  const put = async (relative: string, bytes: Uint8Array): Promise<void> => {
    if (options.signal?.aborted) throw new FabriksUploadError("Upload cancelled");
    const response = await aws.fetch(objectUrl(datalayer, grant.bucket, grant.key, relative), {
      method: "PUT",
      // A Uint8Array over any buffer is a valid body at runtime; lib.dom's
      // BodyInit is stricter than the platform.
      body: bytes as unknown as BodyInit,
      headers: { "Content-Type": "application/octet-stream" },
      signal: options.signal,
    });
    if (!response.ok) {
      throw new FabriksUploadError(`Uploading ${relative} failed: ${response.status} ${response.statusText}`);
    }
    progress.done += 1;
    progress.bytesDone += bytes.byteLength;
    options.onProgress?.({ ...progress });
  };

  // Everything but the manifest, `parallelism` at a time.
  const queue = [...files].filter(([path]) => path !== MANIFEST_NAME);
  const workers = Array.from({ length: Math.max(1, options.parallelism ?? DEFAULT_PARALLELISM) }, async () => {
    while (queue.length > 0) {
      const [path, bytes] = queue.shift()!;
      await put(path, bytes);
    }
  });
  await Promise.all(workers);

  // The manifest lands last, alone: it is the completion marker.
  await put(MANIFEST_NAME, manifest);

  const finished = (await client.mutate({
    mutation: FinishFabriksUploadDocument,
    variables: { input: { storeId: grant.store, valid: true } },
  })) as { data?: FinishFabriksUploadMutation };
  const store = finished.data?.finishFabriksUpload;
  if (!store) throw new FabriksUploadError("The datalayer would not finalize the fabriks upload");
  return store.id;
};
