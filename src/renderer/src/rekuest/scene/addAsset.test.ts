import {describe, expect, it, vi} from 'vitest';
import {DEFAULT_MODEL_POLICY, modelRef} from '@/core/model/glb';
import {buildGlb, triangleModel} from '@/core/model/testing';
import {addAsset, AddAssetError, type AddAssetSteps, type FetchedAsset} from './addAsset';

const SOURCE = 'https://vendor.example/models/stage-v2.glb';

const setup = async (overrides: Partial<AddAssetSteps> = {}, bytes = buildGlb(...triangleModel())) => {
  const ref = await modelRef(bytes);
  const fetched: FetchedAsset = {ok: true, path: '/tmp/x.glb', ref, size: bytes.length, bytes};
  const steps: AddAssetSteps = {
    limits: vi.fn(async () => ({maxSize: DEFAULT_MODEL_POLICY.maxSize, model: DEFAULT_MODEL_POLICY})),
    fetch: vi.fn(async () => fetched),
    confirmPrivateHost: vi.fn(async () => true),
    requestUpload: vi.fn(async () => ({store: '7', grant: {key: 'k'}})),
    upload: vi.fn(async () => undefined),
    create: vi.fn(async () => undefined),
    discard: vi.fn(async () => undefined),
    ...overrides,
  };
  return {ref, bytes, steps};
};

const failure = async (run: Promise<unknown>): Promise<string> => {
  try {
    await run;
  } catch (error) {
    if (error instanceof AddAssetError) return error.code;
    throw error;
  }
  return 'added';
};

describe('addAsset', () => {
  it('fetches, verifies, uploads and records, then removes the temporary file', async () => {
    const {ref, bytes, steps} = await setup();
    expect(await addAsset(ref, SOURCE, steps)).toBe(bytes);
    expect(steps.requestUpload).toHaveBeenCalledWith(ref, bytes.length);
    expect(steps.upload).toHaveBeenCalledWith('/tmp/x.glb', {key: 'k'});
    expect(steps.create).toHaveBeenCalledWith(ref, '7');
    expect(steps.discard).toHaveBeenCalledWith('/tmp/x.glb');
  });

  it('uploads nothing when the source serves other bytes than the app names', async () => {
    const {steps} = await setup();
    expect(await failure(addAsset('sha256:' + '0'.repeat(64), SOURCE, steps))).toBe('hash_mismatch');
    expect(steps.requestUpload).not.toHaveBeenCalled();
    expect(steps.discard).toHaveBeenCalled();
  });

  it('uploads nothing when the model breaks the policy', async () => {
    const [document, binary] = triangleModel();
    const {ref, steps} = await setup({}, buildGlb({...document, images: [{uri: 'https://example.org/t.png'}]}, binary));
    expect(await failure(addAsset(ref, SOURCE, steps))).toBe('external_reference');
    expect(steps.upload).not.toHaveBeenCalled();
  });

  it('leaves a file that is no model to the server to judge', async () => {
    const bytes = new TextEncoder().encode('not a glb, an image by its declaration');
    const {ref, steps} = await setup({limits: vi.fn(async () => ({maxSize: 1024}))}, bytes);
    expect(await addAsset(ref, SOURCE, steps)).toBe(bytes);
    expect(steps.fetch).toHaveBeenCalledWith({url: SOURCE, maxSize: 1024, allowPrivate: false});
    expect(steps.create).toHaveBeenCalledWith(ref, '7');
  });

  it('contacts a host inside the network only after the admin agrees', async () => {
    const refused: FetchedAsset = {ok: false, code: 'private_host', message: 'inside'};
    const declined = await setup({fetch: vi.fn(async () => refused), confirmPrivateHost: vi.fn(async () => false)});
    expect(await failure(addAsset(declined.ref, SOURCE, declined.steps))).toBe('private_host');
    expect(declined.steps.fetch).toHaveBeenCalledTimes(1);

    const agreed = await setup();
    const ok = await (agreed.steps.fetch as () => Promise<FetchedAsset>)();
    agreed.steps.fetch = vi.fn(async (opts: {allowPrivate: boolean}) => (opts.allowPrivate ? ok : refused));
    expect(await failure(addAsset(agreed.ref, SOURCE, agreed.steps))).toBe('added');
    expect(agreed.steps.confirmPrivateHost).toHaveBeenCalledWith('vendor.example');
  });

  it('reports why a source could not be fetched', async () => {
    const {ref, steps} = await setup({fetch: vi.fn(async () => ({ok: false as const, code: 'too_large', message: 'big'}))});
    expect(await failure(addAsset(ref, SOURCE, steps))).toBe('too_large');
    expect(steps.discard).not.toHaveBeenCalled();
  });
});
