import * as React from 'react';
import {useLatestRef} from '@/core/util/hooks/useLatestRef';
import {
  ListTasksDetailsDocument,
  Ordering,
  type ListTasksDetailsQuery,
  type ListTasksDetailsQueryVariables,
  type PostmanTaskFragment,
} from '@/rekuest/api/graphql';
import {useRekuest} from '@/rekuest/api/hooks';
import type {TravelSource} from '@/rekuest/travel/travelSource';
import {latestTaskWindow, windowCovers, type LatestTaskWindow} from './blokLatestTask';

/** Runs asked for up to the clock: stepping back a little needs no new request. */
const BEFORE_LIMIT = 10;
/** Runs asked for after the clock: playback reads them as it gets there. */
const AFTER_LIMIT = 25;

const unwatched = () => () => {};

/**
 * The runs of an implementation around the moment a travel source stands on,
 * and that moment. `null` while there is no answer for the moment yet (or
 * nothing travels): whatever is shown stays.
 *
 * One request at a time, and none while the clock stays inside what was
 * answered, so playback and a dragged slider do not ask per frame.
 */
export const usePastLatestTasks = (
  source: TravelSource | null,
  implementationId: string | undefined,
): {at: number; tasks: ReadonlyArray<PostmanTaskFragment>} | null => {
  const client = useLatestRef(useRekuest());
  const subscribe = React.useMemo(() => (source ? source.subscribe : unwatched), [source]);
  const getClock = React.useCallback(() => (source ? source.getClock() : null), [source]);
  const at = React.useSyncExternalStore(subscribe, getClock, getClock)?.at ?? null;

  const [held, setHeld] = React.useState<LatestTaskWindow<PostmanTaskFragment> | null>(null);
  const inflight = React.useRef(false);
  const mounted = React.useRef(false);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const covered = at !== null && implementationId !== undefined && windowCovers(held, implementationId, at);

  React.useEffect(() => {
    if (at === null || implementationId === undefined || covered || inflight.current || !client.current) {
      return;
    }

    const rekuest = client.current;
    const moment = new Date(at).toISOString();
    const fetchedAt = Date.now();
    const ask = (variables: ListTasksDetailsQueryVariables) =>
      rekuest
        .query<ListTasksDetailsQuery, ListTasksDetailsQueryVariables>({
          query: ListTasksDetailsDocument,
          variables,
          // Every moment a slider passes would otherwise stay in the cache for good.
          fetchPolicy: 'no-cache',
        })
        .then(result => result.data.tasks);

    inflight.current = true;
    Promise.all([
      ask({
        filter: {implementation: implementationId, createdBefore: moment},
        ordering: [{createdAt: Ordering.Desc}],
        pagination: {limit: BEFORE_LIMIT, offset: 0},
      }),
      ask({
        filter: {implementation: implementationId, createdAfter: moment},
        ordering: [{createdAt: Ordering.Asc}],
        pagination: {limit: AFTER_LIMIT, offset: 0},
      }),
    ])
      .then(([before, after]) => {
        if (!mounted.current) return;
        setHeld(
          latestTaskWindow({
            implementationId,
            at,
            fetchedAt,
            before,
            beforeLimit: BEFORE_LIMIT,
            after,
            afterLimit: AFTER_LIMIT,
          }),
        );
      })
      // Nothing to show for this moment: what is shown stays, and the next move of the clock asks again.
      .catch(error => console.warn('Could not read the latest task at that moment', error))
      .finally(() => {
        inflight.current = false;
      });
    // `held`: an answer the clock has already left asks again, for where the clock is now.
  }, [at, client, covered, held, implementationId]);

  return React.useMemo(
    () => (covered && held && at !== null ? {at, tasks: held.tasks} : null),
    [at, covered, held],
  );
};
