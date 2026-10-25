import * as React from 'react';
import type * as THREE from 'three';
import {createStore, useStore, type StoreApi} from 'zustand';
import type {ModelInstance} from './loadModel';

/**
 * What the two halves of a scene share.
 *
 * A scene is a canvas and the HTML laid over it. Components inside the canvas
 * cannot render HTML, so they hand it out: an overlay names an anchor in the
 * 3D world and the content to show there, and the DOM half of the scene
 * renders it and keeps it on its anchor. The same store carries the models of
 * the scene (for `arm:tool0` addresses) and what went wrong.
 */

export type SceneOverlay = {
  id: string;
  /** The object the overlay follows; `null` while it has none. */
  anchor: () => THREE.Object3D | null;
  /**
   * Where on the anchor the card points, in the anchor's own coordinates (the
   * spot that was clicked); its origin when unset.
   */
  point?: THREE.Vector3 | null;
  /** The card's heading; a card without one shows only its drag handle and buttons. */
  title?: string;
  description?: string;
  content: React.ReactNode;
  /** `popout` follows its anchor; `panel` sits beside the scene. */
  mode: 'popout' | 'panel';
  /** Closed by a click elsewhere, unless pinned. */
  dismissable?: boolean;
  onDismiss?: () => void;
};

export type SceneNotice = {id: string; title: string; detail?: string};

/** Where the camera looks from. Every view frames what is in the scene. */
export type SceneView = 'iso' | 'front' | 'side' | 'top';

/** What the viewer chose for this scene: how it looks, not what it shows. */
export type SceneSettings = {
  grid: boolean;
  autoRotate: boolean;
  notices: boolean;
};

export type SceneState = {
  overlays: ReadonlyMap<string, SceneOverlay>;
  models: ReadonlyMap<string, ModelInstance>;
  /** Everything placed in the scene, addressed or not: what a view frames. */
  placed: ReadonlyMap<string, THREE.Object3D>;
  settings: SceneSettings;
  /** The view last asked for; `serial` changes on every request, also for the same view. */
  view: {name: SceneView; serial: number};
  setPlaced: (key: string, object: THREE.Object3D | null) => void;
  updateSettings: (settings: Partial<SceneSettings>) => void;
  requestView: (name: SceneView) => void;
  notices: ReadonlyMap<string, SceneNotice>;
  pinned: ReadonlySet<string>;
  setOverlay: (overlay: SceneOverlay) => void;
  removeOverlay: (id: string) => void;
  togglePinned: (id: string) => void;
  dismiss: () => void;
  setModel: (id: string, model: ModelInstance | null) => void;
  /**
   * The models of the scene by who they stand for (`SceneOwnerProvider`: an
   * agent, in a space), each under the id of the model that registered it, in
   * the order they arrived. What an overlay anchored at that owner binds to.
   */
  owned: ReadonlyMap<string, ReadonlyMap<string, ModelContextValue>>;
  setOwnedModel: (owner: string, id: string, model: ModelContextValue | null) => void;
  setNotice: (notice: SceneNotice) => void;
  removeNotice: (id: string) => void;
};

const withEntry = <V,>(map: ReadonlyMap<string, V>, key: string, value: V | null): ReadonlyMap<string, V> => {
  const next = new Map(map);
  if (value === null) next.delete(key);
  else next.set(key, value);
  return next;
};

export const createSceneStore = (
  initial: {view?: SceneView; grid?: boolean} = {},
): StoreApi<SceneState> =>
  createStore<SceneState>((set, get) => ({
    overlays: new Map(),
    models: new Map(),
    placed: new Map(),
    settings: {grid: initial.grid ?? true, autoRotate: false, notices: true},
    view: {name: initial.view ?? 'iso', serial: 0},
    setPlaced: (key, object) => set(state => ({placed: withEntry(state.placed, key, object)})),
    updateSettings: settings => set(state => ({settings: {...state.settings, ...settings}})),
    requestView: name => set(state => ({view: {name, serial: state.view.serial + 1}})),
    notices: new Map(),
    pinned: new Set(),
    setOverlay: overlay => set(state => ({overlays: withEntry(state.overlays, overlay.id, overlay)})),
    removeOverlay: id =>
      set(state => {
        const pinned = new Set(state.pinned);
        pinned.delete(id);
        return {overlays: withEntry(state.overlays, id, null), pinned};
      }),
    togglePinned: id =>
      set(state => {
        const pinned = new Set(state.pinned);
        if (!pinned.delete(id)) pinned.add(id);
        return {pinned};
      }),
    dismiss: () => {
      const {overlays, pinned} = get();
      overlays.forEach(overlay => {
        if (overlay.dismissable && !pinned.has(overlay.id)) overlay.onDismiss?.();
      });
    },
    setModel: (id, model) => set(state => ({models: withEntry(state.models, id, model)})),
    owned: new Map(),
    setOwnedModel: (owner, id, model) =>
      set(state => {
        const models = withEntry(state.owned.get(owner) ?? new Map<string, ModelContextValue>(), id, model);
        return {owned: withEntry(state.owned, owner, models.size ? models : null)};
      }),
    setNotice: notice => set(state => ({notices: withEntry(state.notices, notice.id, notice)})),
    removeNotice: id => set(state => ({notices: withEntry(state.notices, id, null)})),
  }));

const SceneStoreContext = React.createContext<StoreApi<SceneState> | null>(null);

export const SceneStoreProvider = SceneStoreContext.Provider;

export const useSceneStoreApi = (): StoreApi<SceneState> => {
  const store = React.useContext(SceneStoreContext);
  if (!store) throw new Error('This component must be inside a Scene.');
  return store;
};

export const useSceneState = <T,>(selector: (state: SceneState) => T): T =>
  useStore(useSceneStoreApi(), selector);

/**
 * What a model id is addressed within. A scene that holds several bloks gives
 * each its own, so `arm` in one is not `arm` in another: two identical devices
 * in one room come from the same blok and name their models alike.
 */
const SceneModelScopeContext = React.createContext('');

export const SceneModelScopeProvider = SceneModelScopeContext.Provider;

/**
 * Who the models below stand for: an agent, where a space shows each placed
 * agent through its own scene blok. A model registers itself under it
 * (`SceneState.owned`), so an overlay can find the device by its agent.
 */
const SceneOwnerContext = React.createContext<string | null>(null);

export const SceneOwnerProvider = SceneOwnerContext.Provider;

export const useSceneOwner = (): string | null => React.useContext(SceneOwnerContext);

/** The first model registered for `owner`, the one its scene blok placed first; null while it has none. */
export const useOwnedModel = (owner: string | null): ModelContextValue | null =>
  useSceneState(state => {
    const models = owner ? state.owned.get(owner) : undefined;
    return models ? (models.values().next().value ?? null) : null;
  });

/** The key a model id is kept under in the scene, for the blok it is used in. */
export const useSceneModelKey = (): ((id: string) => string) => {
  const scope = React.useContext(SceneModelScopeContext);
  return React.useCallback((id: string) => `${scope}${id}`, [scope]);
};

/** Show `content` at `anchor` for as long as the calling component is mounted and `visible`. */
export const useSceneOverlay = (
  overlay: Omit<SceneOverlay, 'id'> & {visible: boolean},
): string => {
  const id = React.useId();
  const store = useSceneStoreApi();
  const {visible, anchor, point, title, description, content, mode, dismissable, onDismiss} = overlay;
  React.useEffect(() => {
    if (!visible) {
      store.getState().removeOverlay(id);
      return;
    }
    store.getState().setOverlay({id, anchor, point, title, description, content, mode, dismissable, onDismiss});
  }, [anchor, content, description, dismissable, id, mode, onDismiss, point, store, title, visible]);
  React.useEffect(() => () => store.getState().removeOverlay(id), [id, store]);
  return id;
};

/** Report something wrong with a node beside the scene, for as long as it is wrong. */
export const useSceneNotice = (title: string | null, detail?: string): void => {
  const id = React.useId();
  const store = useSceneStoreApi();
  React.useEffect(() => {
    if (title === null) {
      store.getState().removeNotice(id);
      return;
    }
    store.getState().setNotice({id, title, detail});
    return () => store.getState().removeNotice(id);
  }, [detail, id, store, title]);
};

/** A node of the model that can be clicked, and what a click does. */
export type Clickable = {onClick: (hit: ClickHit) => void; onHover?: (hovered: boolean) => void};

/** Where a click met the model: the point on its surface, in world coordinates. */
export type ClickHit = {point: THREE.Vector3};

export type ModelContextValue = {
  /** The id other models address this one by, if it has one. */
  id?: string;
  instance: ModelInstance;
  /** Register a node as clickable; returns how to unregister it. */
  addClickable: (node: THREE.Object3D, clickable: Clickable) => () => void;
};

const ModelContext = React.createContext<ModelContextValue | null>(null);

export const ModelProvider = ModelContext.Provider;

export const useModel = (): ModelContextValue => {
  const model = React.useContext(ModelContext);
  if (!model) throw new Error('This component must be inside a Model or Robot.');
  return model;
};
