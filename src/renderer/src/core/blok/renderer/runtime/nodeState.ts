import * as React from 'react';

/**
 * A node's own state, for the data attributes it sets (Radix-style, styled
 * with plain Tailwind: `data-[stale]:grayscale`, `data-[busy]:opacity-60`):
 *
 * - `stale`: a value it shows is stale (its source stopped updating);
 * - `busy`: a task one of its callbacks started still runs (a promise the host
 *   returned, or a record its call writes says `running`): it does not
 *   dispatch again.
 */
export type BlokNodeState = {
  stale: boolean;
  busy: boolean;
  /** Follows a task a callback of this node started, until it settles. */
  track: (pending: Promise<unknown>) => void;
};

export const IDLE_NODE: BlokNodeState = Object.freeze({stale: false, busy: false, track: () => undefined});

export const BlokNodeStateContext = React.createContext<BlokNodeState>(IDLE_NODE);

export const useBlokNodeState = (): BlokNodeState => React.useContext(BlokNodeStateContext);

/**
 * The data attributes of the blok language (vocabulary `theme.data_attributes`):
 * every component sets exactly `data-busy` and `data-stale`, and a catalog
 * declares none. What a shadcn component sets internally (`data-state`) is
 * its own.
 */
export type BlokDataAttributes = {
  'data-stale'?: '';
  'data-busy'?: '';
};

/** The data attributes a component spreads on its element: `data-stale` and `data-busy`. */
export const useBlokDataAttributes = (extra: {busy?: boolean} = {}): BlokDataAttributes => {
  const {stale, busy} = React.useContext(BlokNodeStateContext);
  return {
    ...(stale ? {'data-stale': ''} : {}),
    ...(busy || extra.busy ? {'data-busy': ''} : {}),
  };
};
