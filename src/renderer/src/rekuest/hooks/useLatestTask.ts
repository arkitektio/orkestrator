import {useCallback, useSyncExternalStore} from 'react';
import {useRekuest} from '@/rekuest/api/hooks';
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
  const client = useRekuest();
  const active = !!agentID && !!name && !!client;

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      active ? latestTaskStore.acquire(client, agentID as string, name as string, onStoreChange) : unwatched(),
    [active, agentID, client, name],
  );
  const getSnapshot = useCallback(
    () => (active ? latestTaskStore.getSnapshot(agentID as string, name as string) : EMPTY_LIVE_STATE),
    [active, agentID, name],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).value as LatestTaskState | null;
};
