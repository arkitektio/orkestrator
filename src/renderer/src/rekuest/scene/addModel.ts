import {ModelRefused, validateModel, type ModelPolicy} from '@/core/model/glb';

/**
 * Adding a model the organization has not stored, as its steps.
 *
 * The admin's client fetches the URL the blok names, checks the bytes against
 * the reference and the policy, and only then uploads them; the server checks
 * again. Each step is passed in, so the order and the refusals are testable
 * without Electron, a datalayer or a server.
 */

export type FetchedModel =
  | {ok: true; path: string; ref: string; size: number; bytes: Uint8Array}
  | {ok: false; code: string; message: string};

export type AddModelSteps = {
  policy: () => Promise<ModelPolicy>;
  fetch: (opts: {url: string; maxSize: number; allowPrivate: boolean}) => Promise<FetchedModel>;
  /** Ask the admin whether a host inside this network may be contacted. */
  confirmPrivateHost: (host: string) => Promise<boolean>;
  requestUpload: (ref: string, size: number) => Promise<{store: string; grant: object}>;
  upload: (path: string, grant: object) => Promise<void>;
  create: (ref: string, store: string, source: string) => Promise<void>;
  discard: (path: string) => Promise<void>;
};

/** Why a model was not added, in words for the admin who asked. */
export class AddModelError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AddModelError';
  }
}

/** Fetch, verify, upload and record the model `ref` from `source`; returns its bytes. */
export const addModel = async (ref: string, source: string, steps: AddModelSteps): Promise<Uint8Array> => {
  const policy = await steps.policy();
  let fetched = await steps.fetch({url: source, maxSize: policy.maxSize, allowPrivate: false});
  if (!fetched.ok && fetched.code === 'private_host') {
    if (!(await steps.confirmPrivateHost(new URL(source).hostname))) {
      throw new AddModelError('private_host', 'The source is inside this network and was not contacted.');
    }
    fetched = await steps.fetch({url: source, maxSize: policy.maxSize, allowPrivate: true});
  }
  if (!fetched.ok) throw new AddModelError(fetched.code, fetched.message);

  try {
    if (fetched.ref !== ref) {
      throw new AddModelError(
        'hash_mismatch',
        `The source serves ${fetched.ref}, not the model this blok names. Nothing was uploaded.`,
      );
    }
    try {
      await validateModel(fetched.bytes, ref, policy);
    } catch (error) {
      if (error instanceof ModelRefused) throw new AddModelError(error.code, error.message);
      throw error;
    }
    const {store, grant} = await steps.requestUpload(ref, fetched.size);
    await steps.upload(fetched.path, grant);
    await steps.create(ref, store, source);
    return fetched.bytes;
  } finally {
    await steps.discard(fetched.path);
  }
};
