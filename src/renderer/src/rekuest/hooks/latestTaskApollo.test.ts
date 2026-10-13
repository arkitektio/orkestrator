import {ApolloClient, ApolloLink, InMemoryCache, Observable} from '@apollo/client';
import {describe, expect, it, vi} from 'vitest';
import {REKUEST_TYPE_POLICIES} from '@/core/connection/graphql/cachePolicies';
import rekuestResult from '../api/fragments';
import {subscribeLatestTask} from './latestTaskStore';

describe('the latest-task feed through the app\'s own Apollo client', () => {
  it('hands every message of the server on, as the cache is configured for rekuest', async () => {
    const messages = [
      {
        __typename: 'LatestTaskSnapshot',
        implementation: '92',
        latest: {__typename: 'TaskChange', id: '663', isDone: false, latestEventKind: 'STARTED'},
        events: [{__typename: 'TaskEventChange', id: '2900', task: '663', kind: 'PROGRESS', message: '5 of 14', progress: 40, returns: null}],
      },
      {__typename: 'TaskEventChange', id: '2901', task: '663', kind: 'PROGRESS', message: '6 of 14', progress: 50, returns: null},
      {__typename: 'TaskChange', id: '663', isDone: true, latestEventKind: 'COMPLETED'},
    ];
    const link = new ApolloLink(
      () =>
        new Observable(observer => {
          messages.forEach(message => observer.next({data: {latestTask: message}}));
        }),
    );
    const client = new ApolloClient({
      link,
      cache: new InMemoryCache({possibleTypes: rekuestResult.possibleTypes, typePolicies: REKUEST_TYPE_POLICIES}),
    });

    const next = vi.fn();
    const error = vi.fn();
    subscribeLatestTask(client, {agentID: '34549', interface: 'predict_flou2'}, {next, error});
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(error).not.toHaveBeenCalled();
    expect(next.mock.calls.map(([event]) => [event.value.task, event.value.record.status, event.value.record.progress])).toEqual([
      ['663', 'running', 40],
      ['663', 'running', 50],
      ['663', 'done', 100],
    ]);
  });
});
