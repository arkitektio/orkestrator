import * as React from 'react';

/**
 * What an action's own blok needs from the app that shows a run of it.
 *
 * The blok core draws `Anchor`, `Route` and `ask`; it does not know which
 * agents a run got, where they stand, or how an ask is answered. The host
 * answers those through these contexts: the run (rekuest, from the task or a
 * dry run) and the space it is drawn into (rekuest's space scene).
 *
 * Both are provided around the scene surface, not inside the canvas: a
 * `Popout`'s card is rendered by the scene's HTML half, outside the blok.
 */

/** An agent a run binds a dependency key to. */
export type BlokRunAgent = {id: string; name: string};

export type BlokRunHost = {
  /** The agents the run binds `key` to, in order: a key bound to several comes with each. */
  agentsFor: (key: string) => readonly BlokRunAgent[];
  /** The run's open ask, answered in place (answering resumes the run); nothing while none is open. */
  renderAsk: () => React.ReactNode;
};

const NO_AGENTS: readonly BlokRunAgent[] = Object.freeze([]);

const DETACHED_RUN: BlokRunHost = {
  agentsFor: () => NO_AGENTS,
  renderAsk: () => null,
};

const BlokRunHostContext = React.createContext<BlokRunHost>(DETACHED_RUN);

export const BlokRunHostProvider = BlokRunHostContext.Provider;

export const useBlokRunHost = (): BlokRunHost => React.useContext(BlokRunHostContext);

/**
 * The space an overlay is drawn into: where each agent stands in it, as the
 * 4x4 affine its placement keeps (rows, meters, Y up).
 */
export type BlokSpaceHost = {
  /** The stored affine of the agent's placement; null where the space does not place it. */
  placementOf: (agentId: string) => unknown;
};

const NO_SPACE: BlokSpaceHost = {placementOf: () => null};

const BlokSpaceHostContext = React.createContext<BlokSpaceHost>(NO_SPACE);

export const BlokSpaceHostProvider = BlokSpaceHostContext.Provider;

export const useBlokSpaceHost = (): BlokSpaceHost => React.useContext(BlokSpaceHostContext);

/**
 * Set below an `At` whose agent the space does not place: what would point at
 * the device (a `Popout`) shows in the side tray instead, under this title.
 */
const BlokTrayContext = React.createContext<string | null>(null);

export const BlokTrayProvider = BlokTrayContext.Provider;

export const useBlokTray = (): string | null => React.useContext(BlokTrayContext);
