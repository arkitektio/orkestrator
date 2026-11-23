import {useCallback, useSyncExternalStore} from 'react';
import {useRekuestSession} from '../session/hooks';
import {EMPTY_LIVE_STATE} from './liveStateStore';
import {latestTaskStore, type LatestTaskState} from './latestTaskStore';

const unwatched = () => () => {};

/**
 * The task `agentID`'s action `name` last ran as, live. `null` until the
 * server has answered; from then on it changes only when the task does.
 *
 * Every reader of one `(agent, name)` shares one subscription, opened by the
 * first and closed by the last (`latestTaskStore`).
 */
export const useLatestTask = ({agentID, name}: {agentID?: string; name?: string}): LatestTaskState | null => {
  const session = useRekuestSession();
  const active = !!agentID && !!name;

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      active ? latestTaskStore.acquire(session, agentID as string, name as string, onStoreChange) : unwatched(),
    [active, agentID, session, name],
  );
  const getSnapshot = useCallback(
    () => (active ? latestTaskStore.getSnapshot(agentID as string, name as string) : EMPTY_LIVE_STATE),
    [active, agentID, name],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).value as LatestTaskState | null;
};
