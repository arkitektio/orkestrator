// @vitest-environment jsdom
import * as React from 'react';
import * as THREE from 'three';
import {act, createRoot, extend} from '@react-three/fiber';
import {afterEach, describe, expect, it} from 'vitest';
import {BlokRuntimeProvider, createBlokRuntimeStore} from '../../runtime';
import {AnimateBlok} from './bindings';
import {createSceneStore, ModelProvider, SceneStoreProvider, type ModelContextValue} from './context';

extend(THREE as unknown as Parameters<typeof extend>[0]);

const renderer = () =>
  ({
    render: () => undefined,
    setSize: () => undefined,
    setPixelRatio: () => undefined,
    shadowMap: {},
    xr: {addEventListener: () => undefined, removeEventListener: () => undefined},
    dispose: () => undefined,
  }) as unknown as THREE.WebGLRenderer;

/** A model of one node, with a two-second clip that carries it ten units along x. */
const model = () => {
  const root = new THREE.Group();
  const star = new THREE.Object3D();
  star.name = 'star';
  root.add(star);
  const clip = new THREE.AnimationClip('spiral', 2, [new THREE.VectorKeyframeTrack('star.position', [0, 2], [0, 0, 0, 10, 0, 0])]);
  return {star, value: {instance: {root, clips: [clip], nodes: new Map([['star', star]]), rest: new Map()}} as unknown as ModelContextValue};
};

let unmount: (() => void) | undefined;
afterEach(() => unmount?.());

describe('Animate', () => {
  it('shows its clip at the progress it is given', async () => {
    const {star, value} = model();
    const root = createRoot(document.createElement('canvas'));
    await root.configure({gl: renderer, frameloop: 'never', size: {width: 100, height: 100, top: 0, left: 0}});
    unmount = () => root.unmount();
    const runtime = createBlokRuntimeStore();
    const Animate = AnimateBlok.render as React.ComponentType<{component: unknown}>;
    const at = (progress: number) => ({
      id: 'animate',
      component: 'Animate',
      props: [
        {key: 'clip', static_value: 'spiral'},
        {key: 'progress', static_value: progress},
      ],
    });
    let clock = 0;
    const show = async (progress: number) => {
      let state!: ReturnType<typeof root.render>;
      await act(async () => {
        // The app runs in strict mode, where an effect's cleanup runs once before the effect
        // counts: a clip started outside the effect that stops it would stay stopped. This
        // renderer does not replay effects, so the test holds the motion, not that.
        state = root.render(
          <React.StrictMode>
            <SceneStoreProvider value={createSceneStore()}>
              <BlokRuntimeProvider store={runtime}>
                <ModelProvider value={value}>
                  <Animate component={at(progress)} />
                </ModelProvider>
              </BlokRuntimeProvider>
            </SceneStoreProvider>
          </React.StrictMode>,
        );
      });
      // Enough frames, a tenth of a second apart, for the display to ease onto the value.
      await act(async () => {
        for (let frame = 0; frame < 60; frame += 1) state.getState().advance((clock += 0.1));
      });
    };

    await show(0.5);
    expect(star.position.x).toBeCloseTo(5, 1);
    await show(1);
    expect(star.position.x).toBeCloseTo(10, 1);
  });
});
