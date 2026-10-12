// @vitest-environment jsdom
import * as React from 'react';
import * as THREE from 'three';
import {act, createRoot, extend} from '@react-three/fiber';
import {afterEach, describe, expect, it} from 'vitest';
import BlokRenderer from '../../BlokRenderer';
import {normalizeBlokComponentTree} from '../../runtime';
import {createSceneStore, SceneStoreProvider} from './context';
import {BlokSceneEmbedProvider} from './host';
import tree from './scene.fixture.json';

// `Canvas` does this for a real scene.
extend(THREE as unknown as Parameters<typeof extend>[0]);

/** Stands in for WebGL: the scene graph is what is looked at, nothing is drawn. */
const renderer = () =>
  ({
    render: () => undefined,
    setSize: () => undefined,
    setPixelRatio: () => undefined,
    shadowMap: {},
    xr: {addEventListener: () => undefined, removeEventListener: () => undefined},
    dispose: () => undefined,
  }) as unknown as THREE.WebGLRenderer;

const mount = async (element: React.ReactNode) => {
  const store = createSceneStore();
  const root = createRoot(document.createElement('canvas'));
  await root.configure({gl: renderer, frameloop: 'never', size: {width: 100, height: 100, top: 0, left: 0}});
  let state!: ReturnType<typeof root.render>;
  await act(async () => {
    state = root.render(
      <SceneStoreProvider value={store}>
        <BlokSceneEmbedProvider value>{element}</BlokSceneEmbedProvider>
      </SceneStoreProvider>,
    );
  });
  return {store, scene: state.getState().scene, unmount: () => root.unmount()};
};

let unmount: (() => void) | undefined;
afterEach(() => unmount?.());

describe('a scene blok in a scene that is already open', () => {
  it('adds what its Scene holds, without a canvas of its own', async () => {
    const {roots} = normalizeBlokComponentTree(tree);
    const mounted = await mount(<BlokRenderer embedded uiComponents={roots} />);
    unmount = mounted.unmount;

    // Its Model and Robot: with no model store each is a placeholder, said so beside the scene.
    const meshes: THREE.Object3D[] = [];
    mounted.scene.traverse(object => {
      if ((object as THREE.Mesh).isMesh) meshes.push(object);
    });
    expect(meshes).toHaveLength(2);
    expect(mounted.store.getState().overlays.size).toBe(2);
    expect([...mounted.store.getState().notices.values()]).toEqual([]);
  });

  it('refuses a panel, which cannot stand in a scene', async () => {
    const mounted = await mount(<BlokRenderer embedded uiComponents={[{id: 'card', component: 'Card'}]} />);
    unmount = mounted.unmount;

    expect(mounted.scene.children).toHaveLength(0);
    expect([...mounted.store.getState().notices.values()].map(notice => notice.title)).toEqual(['Not a 3D view']);
  });
});
