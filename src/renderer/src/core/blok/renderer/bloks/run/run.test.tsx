// @vitest-environment jsdom
import * as THREE from 'three';
import {act, createRoot, extend} from '@react-three/fiber';
import {afterEach, describe, expect, it} from 'vitest';
import {fromMatrix4} from '@/core/model/affine';
import BlokRenderer from '../../BlokRenderer';
import {createSceneStore, SceneStoreProvider, type ModelContextValue} from '../scene/context';
import {BlokSceneEmbedProvider} from '../scene/host';
import {BlokRunHostProvider, BlokSpaceHostProvider, type BlokRunAgent, type BlokRunHost, type BlokSpaceHost} from './host';

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

const arm: BlokRunAgent = {id: 'a1', name: 'Arm'};
const scope: BlokRunAgent = {id: 'a3', name: 'Scope'};
const binding: Record<string, BlokRunAgent[]> = {robot: [arm], frame: [scope]};
const run: BlokRunHost = {agentsFor: key => binding[key] ?? [], renderAsk: () => null};
/** The arm stands 1 m along x; the scope is not placed in this space, or 3 m along x. */
const spaceOf = (scopePlaced: boolean): BlokSpaceHost => ({
  placementOf: id =>
    id === 'a1'
      ? fromMatrix4(new THREE.Matrix4().setPosition(1, 0, 2))
      : id === 'a3' && scopePlaced
        ? fromMatrix4(new THREE.Matrix4().setPosition(3, 0, 0))
        : null,
});

/** The arm's model, as its own scene blok would have loaded it: one mesh. */
const armModel = (): ModelContextValue => {
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
  const model: ModelContextValue = {
    instance: {
      root,
      nodes: new Map(),
      rest: new Map(),
      clips: [],
      report: {ref: '', size: 0, nodes: [], stats: {nodes: 0, triangles: 0, textures: 0, animations: 0}, joints: [], animations: [], warnings: []},
    },
    addClickable: () => () => undefined,
  };
  return model;
};

const prop = (key: string, value: unknown) => ({key, static_value: value});

const overlay = [
  {
    id: 'root',
    component: 'Overlay',
    children: [
      {
        id: 'robot',
        component: 'Anchor',
        props: [prop('dep', 'robot')],
        children: [
          {id: 'glow', component: 'Glow', props: [prop('on', true), prop('color', '#ff0000')]},
          {id: 'card', component: 'Popout', props: [prop('open', true), prop('title', 'Arm card')]},
        ],
      },
      {
        id: 'frame',
        component: 'Anchor',
        props: [prop('dep', 'frame')],
        children: [{id: 'ask', component: 'Popout', props: [prop('open', true), prop('title', 'Scope card')]}],
      },
      {id: 'route', component: 'Route', props: [prop('through', ['robot', 'frame']), {key: 'progress', dynamic_value: {path: 'task.progress'}}]},
    ],
  },
];

const mount = async (owned?: ModelContextValue, scopePlaced = false) => {
  const store = createSceneStore();
  if (owned) store.getState().setOwnedModel('a1', 'device', owned);
  const root = createRoot(document.createElement('canvas'));
  await root.configure({gl: renderer, frameloop: 'never', size: {width: 100, height: 100, top: 0, left: 0}});
  let state!: ReturnType<typeof root.render>;
  await act(async () => {
    state = root.render(
      <BlokRunHostProvider value={run}>
        <BlokSpaceHostProvider value={spaceOf(scopePlaced)}>
          <SceneStoreProvider value={store}>
            <BlokSceneEmbedProvider value>
              <BlokRenderer embedded uiComponents={overlay} initialState={{task: {progress: 50}}} />
            </BlokSceneEmbedProvider>
          </SceneStoreProvider>
        </BlokSpaceHostProvider>
      </BlokRunHostProvider>,
    );
  });
  return {store, scene: state.getState().scene, unmount: () => root.unmount()};
};

let unmount: (() => void) | undefined;
afterEach(() => unmount?.());

describe('an overlay drawn into a space', () => {
  it('stands an Anchor where its agent is placed, and a Glow without a node lights the device it anchors', async () => {
    const model = armModel();
    const mounted = await mount(model);
    unmount = mounted.unmount;

    const anchor = mounted.scene.getObjectByName('at:a1');
    expect(anchor?.position.toArray()).toEqual([1, 0, 2]);
    // The glow works on the model the device's scene blok loaded, not on a copy.
    const mesh = model.instance.root.children[0] as THREE.Mesh;
    const lit = mesh.material as THREE.MeshStandardMaterial;
    expect(lit.emissiveIntensity).toBe(1);
    expect(lit.emissive.getHexString()).toBe('ff0000');
  });

  it('sends an agent the space does not place to the side tray, its cards with it', async () => {
    const mounted = await mount();
    unmount = mounted.unmount;

    const overlays = [...mounted.store.getState().overlays.values()];
    const panels = overlays.filter(card => card.mode === 'panel').map(card => card.title);
    const popouts = overlays.filter(card => card.mode === 'popout').map(card => card.title);
    expect(panels).toEqual(expect.arrayContaining(['Scope', 'Scope card']));
    expect(popouts).toEqual(['Arm card']);
    expect(mounted.scene.getObjectByName('at:a3')).toBeUndefined();
  });

  it('anchors a card at the stand-in while the device has no model in the scene', async () => {
    const mounted = await mount();
    unmount = mounted.unmount;

    const card = [...mounted.store.getState().overlays.values()].find(overlay => overlay.title === 'Arm card');
    expect(card?.anchor()).toBe(mounted.scene.getObjectByName('at:a1'));
  });

  it('draws no route through fewer than two placed agents, and says so', async () => {
    const mounted = await mount();
    unmount = mounted.unmount;

    expect(mounted.scene.getObjectByName('route')).toBeUndefined();
    expect([...mounted.store.getState().notices.values()].map(notice => notice.title)).toContain('A route with nowhere to go');
  });

  it('draws a route through the placed agents, its head where the run is', async () => {
    const mounted = await mount(undefined, true);
    unmount = mounted.unmount;

    const route = mounted.scene.getObjectByName('route');
    expect([...mounted.store.getState().notices.values()]).toEqual([]);
    expect(route).toBeDefined();
    const head = route?.children.find(child => (child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry.type === 'SphereGeometry');
    // Half way from (1, 0, 2) to (3, 0, 0), over the floor.
    expect(head?.position.x).toBeCloseTo(2);
    expect(head?.position.z).toBeCloseTo(1);
  });
});
