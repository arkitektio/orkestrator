import * as React from 'react';
import type {BlokComponentNode} from './runtime';

/**
 * Assets: the files an app brings with it, named in a blok like everything
 * else of a dependency, as `@<dependency>.assets.<name>` (a model in a scene,
 * an image in a panel).
 *
 * The blok core knows how to show one; it does not know which agent a
 * dependency is bound to or where its files are stored. A host (rekuest, in the
 * app) answers that through this context. Without a host an asset is unknown,
 * and whatever shows it says so.
 */

export type BlokAssetKind = 'MODEL_3D' | 'IMAGE';

export type BlokAsset =
  | {status: 'loading'}
  /** The file is stored: `load` returns its bytes, which hash to `ref`. */
  | {status: 'ready'; ref: string; kind: BlokAssetKind; load: () => Promise<Uint8Array>}
  /** The app registered the asset and has not uploaded it yet: it does when it runs. */
  | {status: 'awaited'; kind: BlokAssetKind}
  | {status: 'unknown'; reason: string};

export type BlokAssetHost = {
  /** The asset `name` of the agent bound to `dependency`. A hook: called unconditionally, with empty strings when a prop names none. */
  useAsset: (dependency: string, name: string) => BlokAsset;
};

const DETACHED_HOST: BlokAssetHost = {
  useAsset: () => ({status: 'unknown', reason: 'This view has no asset store.'}),
};

const BlokAssetHostContext = React.createContext<BlokAssetHost>(DETACHED_HOST);

export const BlokAssetHostProvider = BlokAssetHostContext.Provider;

/** The segment after the dependency that names a file the agent brings instead of one of its states. */
export const ASSETS_SEGMENT = 'assets';

export const ASSET_KIND_LABELS: Record<BlokAssetKind, string> = {MODEL_3D: '3D model', IMAGE: 'image'};

/** The `(dependency, name)` a prop names when it is bound to `<dependency>.assets.<name>`; `null` otherwise. */
export const assetNamedBy = (
  component: BlokComponentNode,
  key: string,
): {dependency: string; name: string} | null => {
  const path = component.props?.find(candidate => candidate.key === key)?.dynamic_value?.path;
  if (typeof path !== 'string') return null;
  const [dependency, segment, name, ...rest] = path.split('.');
  if (segment !== ASSETS_SEGMENT || !dependency || !name || rest.length) return null;
  return {dependency, name};
};

/** The asset the prop `key` names; `null` when the prop names none. */
export const useBlokAsset = (component: BlokComponentNode, key: string): BlokAsset | null => {
  const named = assetNamedBy(component, key);
  const asset = React.useContext(BlokAssetHostContext).useAsset(named?.dependency ?? '', named?.name ?? '');
  return named ? asset : null;
};

const hex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');

/** Object URLs of verified images, by reference: one fetch and one hash per file, however often it is shown. */
const imageUrls = new Map<string, Promise<string>>();

const imageUrl = (ref: string, load: () => Promise<Uint8Array>): Promise<string> => {
  const known = imageUrls.get(ref);
  if (known) return known;
  const loading = (async () => {
    const bytes = await load();
    const actual = `sha256:${hex(await crypto.subtle.digest('SHA-256', bytes as BufferSource))}`;
    if (actual !== ref) throw new Error(`The stored image is ${actual}, not ${ref}.`);
    return URL.createObjectURL(new Blob([bytes as BlobPart]));
  })();
  imageUrls.set(ref, loading);
  loading.catch(() => imageUrls.delete(ref));
  return loading;
};

/**
 * A URL for the image asset the prop `key` names.
 *
 * `named` is false when the prop names no asset, and the component then reads
 * the prop as it always did. `url` is set once the image is stored and verified.
 */
export const useAssetImageUrl = (
  component: BlokComponentNode,
  key: string,
): {named: boolean; url?: string; problem?: string} => {
  const asset = useBlokAsset(component, key);
  const ref = asset?.status === 'ready' && asset.kind === 'IMAGE' ? asset.ref : undefined;
  const load = asset?.status === 'ready' ? asset.load : undefined;
  const [resolved, setResolved] = React.useState<{ref: string; url?: string; problem?: string}>({ref: ''});

  React.useEffect(() => {
    if (!ref || !load) return;
    let live = true;
    imageUrl(ref, load).then(
      url => live && setResolved({ref, url}),
      (error: Error) => live && setResolved({ref, problem: error.message}),
    );
    return () => {
      live = false;
    };
  }, [load, ref]);

  if (asset === null) return {named: false};
  if (asset.status === 'unknown') return {named: true, problem: asset.reason};
  if (asset.status === 'ready' && asset.kind !== 'IMAGE') {
    return {named: true, problem: `This asset is a ${ASSET_KIND_LABELS[asset.kind]}, not an image.`};
  }
  return resolved.ref === ref ? {named: true, url: resolved.url, problem: resolved.problem} : {named: true};
};
