import * as React from 'react';
import {useBlokRuntimeStoreApi} from './context';

/** `viewer` (vocabulary `records.viewer`): who is looking. */
export type BlokViewer = {
  user: {id: string; username: string | null};
  org: {id: string} | null;
  roles: string[];
};

export const VIEWER_ROOT = 'viewer';

/** Keeps `viewer` on who is looking. */
export const BlokViewerSync = ({viewer}: {viewer: BlokViewer | null}) => {
  const store = useBlokRuntimeStoreApi();
  React.useEffect(() => {
    if (viewer) store.getState().setRuntimeValue(VIEWER_ROOT, viewer);
    else store.getState().clearRuntimeValue(VIEWER_ROOT);
  }, [store, viewer]);
  return null;
};
