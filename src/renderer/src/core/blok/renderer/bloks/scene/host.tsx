import * as React from 'react';
import type {ModelPolicy} from '@/core/model/glb';

/**
 * What a scene needs from the app that hosts it.
 *
 * The blok core knows how to show a model; it does not know where models are
 * stored, who may add one, or how a named blok is found. A host (rekuest, in
 * the app) answers those through this context. Without a host a scene still
 * renders, with a placeholder where each model would be.
 */

export type BlokModelSource =
  | {status: 'loading'}
  /** The model is stored: `load` returns its bytes, which the scene verifies against the reference. */
  | {status: 'ready'; load: () => Promise<Uint8Array>}
  /**
   * The organization has not stored the model. An admin can add it from its source;
   * one that names no source (`sourceHost` is `null`) is uploaded by its app.
   */
  | {
      status: 'missing';
      sourceHost: string | null;
      canAdd: boolean;
      add?: () => void;
      adding?: boolean;
      error?: string;
    }
  | {status: 'refused'; reason: string};

/** A blok another app registered for a model: shown at `node` when that node is clicked. */
export type BlokModelDecoration = {
  name: string;
  /** The node it attaches to; the model's root when `null`. */
  node: string | null;
  render: () => React.ReactNode;
};

export type BlokSceneHost = {
  /** Where the bytes of `ref` come from. A hook: called once per model, unconditionally. */
  useModelSource: (ref: string, from: string) => BlokModelSource;
  /** The bloks registered for `ref`. A hook. */
  useModelDecorations: (ref: string) => readonly BlokModelDecoration[];
  /** Render the html blok registered under `name`, for `OnClick open=`. */
  renderBlok: (name: string) => React.ReactNode;
  /** The limits models are held to; the built-in defaults when absent. */
  policy?: ModelPolicy;
};

const NO_DECORATIONS: readonly BlokModelDecoration[] = Object.freeze([]);

const DETACHED_HOST: BlokSceneHost = {
  useModelSource: () => ({status: 'refused', reason: 'This view has no model store.'}),
  useModelDecorations: () => NO_DECORATIONS,
  renderBlok: () => null,
};

const BlokSceneHostContext = React.createContext<BlokSceneHost>(DETACHED_HOST);

export const BlokSceneHostProvider = BlokSceneHostContext.Provider;

export const useBlokSceneHost = (): BlokSceneHost => React.useContext(BlokSceneHostContext);

/**
 * Whether a scene takes the whole surface it is rendered on, whatever height
 * the blok asks for: a host that shows a scene as a backdrop sets this.
 */
const BlokSceneFillContext = React.createContext(false);

export const BlokSceneFillProvider = BlokSceneFillContext.Provider;

export const useBlokSceneFill = (): boolean => React.useContext(BlokSceneFillContext);

/**
 * Whether a scene is already open around this blok. A `Scene` then adds its
 * models to that one instead of opening a canvas of its own: this is how a
 * host shows several scene bloks in one room.
 */
const BlokSceneEmbedContext = React.createContext(false);

export const BlokSceneEmbedProvider = BlokSceneEmbedContext.Provider;

export const useBlokSceneEmbedded = (): boolean => React.useContext(BlokSceneEmbedContext);

/**
 * Whether the parts of a model ignore the pointer. A host that is arranging
 * the scene sets this: a click then picks the model up, and never reaches the
 * device behind it.
 */
const BlokSceneInertContext = React.createContext(false);

export const BlokSceneInertProvider = BlokSceneInertContext.Provider;

export const useBlokSceneInert = (): boolean => React.useContext(BlokSceneInertContext);
