import {ModelRefused, validateModel, type ModelPolicy} from '@/core/model/glb';

/**
 * Adding a file an app names a source for, as its steps.
 *
 * The app holds no bytes: it declared the hash and where to fetch them. An
 * admin's client fetches the source, checks the bytes against the reference
 * (and a model against the policy), and only then uploads them; the server
 * checks again. Each step is passed in, so the order and the refusals are
 * testable without Electron, a datalayer or a server.
 */

export type FetchedAsset =
  | {ok: true; path: string; ref: string; size: number; bytes: Uint8Array}
  | {ok: false; code: string; message: string};

export type AssetLimits = {
  /** The largest file of the asset's kind. */
  maxSize: number;
  /** What a model is held to before it is uploaded; absent for other kinds, which the server alone checks. */
  model?: ModelPolicy;
};

export type AddAssetSteps = {
  limits: () => Promise<AssetLimits>;
  fetch: (opts: {url: string; maxSize: number; allowPrivate: boolean}) => Promise<FetchedAsset>;
  /** Ask the admin whether a host inside this network may be contacted. */
  confirmPrivateHost: (host: string) => Promise<boolean>;
  requestUpload: (ref: string, size: number) => Promise<{store: string; grant: object}>;
  upload: (path: string, grant: object) => Promise<void>;
  create: (ref: string, store: string) => Promise<void>;
  discard: (path: string) => Promise<void>;
};

/** Why an asset was not added, in words for the admin who asked. */
export class AddAssetError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AddAssetError';
  }
}

/** Fetch, verify, upload and record the asset `ref` from `source`; returns its bytes. */
export const addAsset = async (ref: string, source: string, steps: AddAssetSteps): Promise<Uint8Array> => {
  const limits = await steps.limits();
  let fetched = await steps.fetch({url: source, maxSize: limits.maxSize, allowPrivate: false});
  if (!fetched.ok && fetched.code === 'private_host') {
    if (!(await steps.confirmPrivateHost(new URL(source).hostname))) {
      throw new AddAssetError('private_host', 'The source is inside this network and was not contacted.');
    }
    fetched = await steps.fetch({url: source, maxSize: limits.maxSize, allowPrivate: true});
  }
  if (!fetched.ok) throw new AddAssetError(fetched.code, fetched.message);

  try {
    if (fetched.ref !== ref) {
      throw new AddAssetError(
        'hash_mismatch',
        `The source serves ${fetched.ref}, not the file its app names. Nothing was uploaded.`,
      );
    }
    if (limits.model) {
      try {
        await validateModel(fetched.bytes, ref, limits.model);
      } catch (error) {
        if (error instanceof ModelRefused) throw new AddAssetError(error.code, error.message);
        throw error;
      }
    }
    const {store, grant} = await steps.requestUpload(ref, fetched.size);
    await steps.upload(fetched.path, grant);
    await steps.create(ref, store);
    return fetched.bytes;
  } finally {
    await steps.discard(fetched.path);
  }
};
