// @vitest-environment jsdom
import * as React from 'react';
import {act, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  assetNamedBy,
  AssetSourceNotice,
  BlokAssetHostProvider,
  useAssetImageUrl,
  type BlokAsset,
} from './assets';
import type {BlokComponentNode} from './runtime';

const node = (path?: string, extra: object = {}): BlokComponentNode =>
  ({
    id: 'image',
    component: 'img',
    props: [{key: 'src', ...(path ? {dynamic_value: {path}} : {}), ...extra}],
  }) as unknown as BlokComponentNode;

const refOf = async (bytes: Uint8Array): Promise<string> => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource));
  return `sha256:${[...digest].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
};

const Probe = ({component}: {component: BlokComponentNode}) => {
  const image = useAssetImageUrl(component, 'src');
  return <output>{JSON.stringify(image)}</output>;
};

const shown = () => JSON.parse(screen.getByRole('status').textContent ?? '{}');

const show = async (component: BlokComponentNode, asset: BlokAsset) => {
  const seen: Array<[string, string]> = [];
  const host = {
    useAsset: (dependency: string, name: string) => {
      seen.push([dependency, name]);
      return asset;
    },
  };
  await act(async () => {
    render(
      <BlokAssetHostProvider value={host}>
        <Probe component={component} />
      </BlokAssetHostProvider>,
    );
  });
  return seen;
};

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('an asset named in a blok', () => {
  it('is a path of exactly <dependency>.assets.<name>', () => {
    expect(assetNamedBy(node('self.assets.logo'), 'src')).toEqual({dependency: 'self', name: 'logo'});
    expect(assetNamedBy(node('self.assets'), 'src')).toBeNull();
    expect(assetNamedBy(node('self.assets.logo.png'), 'src')).toBeNull();
    expect(assetNamedBy(node('assets.self.logo'), 'src')).toBeNull();
    expect(assetNamedBy(node('self.State.logo'), 'src')).toBeNull();
    expect(assetNamedBy(node(undefined, {static_value: 'https://example.org/logo.png'}), 'src')).toBeNull();
  });

  it('leaves a prop that names none to be read as it always was', async () => {
    const seen = await show(node(undefined, {static_value: 'https://example.org/logo.png'}), {status: 'loading'});
    expect(shown()).toEqual({named: false});
    expect(seen.at(-1)).toEqual(['', '']);
  });

  it('becomes a URL once its verified bytes are there', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const ref = await refOf(bytes);
    URL.createObjectURL = vi.fn(() => 'blob:logo');
    const seen = await show(node('self.assets.logo'), {status: 'ready', ref, kind: 'IMAGE', load: async () => bytes});
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(shown()).toEqual({named: true, url: 'blob:logo'});
    expect(seen.at(-1)).toEqual(['self', 'logo']);
  });

  it('is not shown when the stored bytes are not the ones registered', async () => {
    const ref = `sha256:${'0'.repeat(64)}`;
    await show(node('self.assets.logo'), {status: 'ready', ref, kind: 'IMAGE', load: async () => new Uint8Array([9])});
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(shown().named).toBe(true);
    expect(shown().url).toBeUndefined();
    expect(shown().problem).toContain('The stored image is sha256:');
  });

  it('says so when it is a model, or not there', async () => {
    await show(node('self.assets.scope'), {status: 'ready', ref: 'sha256:x', kind: 'MODEL_3D', load: async () => new Uint8Array()});
    expect(shown()).toEqual({named: true, problem: 'This asset is a 3D model, not an image.'});
    document.body.innerHTML = '';
    await show(node('self.assets.logo'), {status: 'unknown', reason: 'Its app registers no asset named "logo".'});
    expect(shown()).toEqual({named: true, problem: 'Its app registers no asset named "logo".'});
  });

  it('carries where an awaited file is fetched from', async () => {
    await show(node('self.assets.logo'), {status: 'awaited', kind: 'IMAGE', source: {host: 'vendor.example', canAdd: false}});
    expect(shown()).toEqual({named: true, source: {host: 'vendor.example', canAdd: false}});
  });

  it('offers the file to whoever may add it, and names the host to everyone', async () => {
    const add = vi.fn();
    const {rerender} = render(<AssetSourceNotice kind="MODEL_3D" source={{host: 'vendor.example', canAdd: true, add}} />);
    expect(screen.getByText('It will be fetched from vendor.example.')).toBeTruthy();
    screen.getByRole('button', {name: 'Add 3D model'}).click();
    expect(add).toHaveBeenCalledTimes(1);

    rerender(<AssetSourceNotice kind="MODEL_3D" source={{host: 'vendor.example', canAdd: true, add, adding: true, error: 'big'}} />);
    expect((screen.getByRole('button', {name: 'Adding…'}) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('big')).toBeTruthy();

    rerender(<AssetSourceNotice kind="IMAGE" source={{host: 'vendor.example', canAdd: false, add}} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('An admin of your organization can add it from vendor.example.')).toBeTruthy();
  });
});
