// @vitest-environment jsdom
import {act, cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import BlokRenderer from '../BlokRenderer';
import {parseBsx} from '../../bsx/parse';
import {mergePage, pendingReads, queryProblem, readsThen, subscriptionProblem, type BlokQuery, type BlokReadExecutor, type BlokReadSink, type BlokSubscription} from './reads';

/**
 * The read side of a blok: declared queries and subscriptions, run by the
 * renderer, their records written as `queries.<name>` and
 * `subscriptions.<name>`; their values suspend until the first answer.
 */

afterEach(cleanup);

const flush = () => act(async () => undefined);

type Deferred = {resolve: (data: Record<string, unknown>) => void; reject: (error: Error) => void};

const executor = () => {
  const calls: Array<{service: string; document: string; variables: Record<string, unknown>; deferred: Deferred}> = [];
  const sinks: BlokReadSink[] = [];
  const closed: BlokReadSink[] = [];
  const run: BlokReadExecutor = {
    query: (service, document, variables) =>
      new Promise((resolve, reject) => {
        calls.push({service, document, variables, deferred: {resolve, reject}});
      }),
    subscribe: (_service, _document, _variables, sink) => {
      sinks.push(sink);
      return () => void closed.push(sink);
    },
  };
  return {calls, sinks, closed, run};
};

const positions: BlokQuery = {
  key: 'positions',
  service: 'mikro',
  document: 'query($slide: ID!) { positions(slide: $slide) { name } }',
  variables: [{key: 'slide', value_path: 'args.slide'}],
};

/** The same query, passing the viewed moment as an ordinary variable (`variables={at: then}`). */
const positionsAt: BlokQuery = {...positions, variables: [...(positions.variables ?? []), {key: 'at', value_path: 'then'}]};

const tree = (source: string) => [parseBsx(source).tree];

const blok = (props: Partial<React.ComponentProps<typeof BlokRenderer>> & {source: string}) => {
  const {source, ...rest} = props;
  const {data, statuses} = pendingReads(rest.queries ?? [], rest.subscriptions ?? []);
  return (
    <BlokRenderer
      uiComponents={tree(source)}
      statuses={statuses}
      {...rest}
      initialState={{...data, ...(rest.initialState as Record<string, unknown> | undefined)}}
    />
  );
};

const PANEL =
  '<Card><suspense><fallback><Text>Loading</Text></fallback><error><Text>Failed: {error.message}</Text></error><Text>{list.join(list.pluck(queries.positions.value.positions, "name"))}</Text></suspense><Text>{queries.positions.refetching ? "refetching" : "settled"}</Text><Button onClick={queries.positions.refetch()}>Reload</Button></Card>';

describe('declared queries', () => {
  it('suspend until the first answer, with their variables from the data model', async () => {
    const {calls, run} = executor();
    render(blok({source: PANEL, queries: [positions], readExecutor: run, initialState: {args: {slide: 's1'}}}));
    await flush();
    expect(screen.queryByText('Loading')).not.toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({service: 'mikro', variables: {slide: 's1'}});

    await act(async () => calls[0].deferred.resolve({positions: [{name: 'Home'}, {name: 'Dock'}]}));
    expect(screen.queryByText('Loading')).toBeNull();
    expect(screen.queryByText('Home, Dock')).not.toBeNull();
  });

  it('refetch keeps showing the last answer while it runs (stale-while-revalidate)', async () => {
    const {calls, run} = executor();
    render(blok({source: PANEL, queries: [positions], readExecutor: run, initialState: {args: {slide: 's1'}}}));
    await flush();
    await act(async () => calls[0].deferred.resolve({positions: [{name: 'Home'}]}));

    await act(async () => screen.getByRole('button').click());
    expect(calls).toHaveLength(2);
    expect(screen.queryByText('Loading')).toBeNull();
    expect(screen.queryByText('Home')).not.toBeNull();
    expect(screen.queryByText('refetching')).not.toBeNull();

    await act(async () => calls[1].deferred.resolve({positions: [{name: 'Lab'}]}));
    expect(screen.queryByText('Lab')).not.toBeNull();
    expect(screen.queryByText('settled')).not.toBeNull();
  });

  it('shows the error boundary when a query fails', async () => {
    const {calls, run} = executor();
    render(blok({source: PANEL, queries: [positions], readExecutor: run, initialState: {args: {slide: 's1'}}}));
    await flush();
    await act(async () => calls[0].deferred.reject(new Error('no access')));
    expect(screen.queryByText('Failed: no access')).not.toBeNull();
  });

  it('never sends a mutation', async () => {
    const {calls, run} = executor();
    const mutation: BlokQuery = {key: 'positions', service: 'mikro', document: 'mutation { deleteEverything }'};
    render(blok({source: PANEL, queries: [mutation], readExecutor: run}));
    await flush();
    expect(calls).toHaveLength(0);
    expect(screen.queryByText(/Failed: A blok reads, it never runs a mutation/)).not.toBeNull();
    expect(queryProblem('mutation { x }')).toContain('mutation');
    expect(queryProblem('query { x }')).toBeNull();
    expect(subscriptionProblem('query { x }')).toContain('subscription');
  });

  it('re-run when a variable changes', async () => {
    const {calls, run} = executor();
    const view = render(blok({source: PANEL, queries: [positions], readExecutor: run, initialState: {args: {slide: 's1'}}}));
    await flush();
    await act(async () => calls[0].deferred.resolve({positions: []}));
    view.rerender(blok({source: PANEL, queries: [positions], readExecutor: run, initialState: {args: {slide: 's2'}}}));
    await flush();
    expect(calls.at(-1)?.variables).toEqual({slide: 's2'});
  });

  it('get then only through their variables: null live, the moment while travelling, re-run as it moves', async () => {
    const {calls, run} = executor();
    const view = render(blok({source: PANEL, queries: [positionsAt], readExecutor: run, initialState: {args: {slide: 's1'}}}));
    await flush();
    expect(calls[0].variables).toEqual({slide: 's1', at: null});

    view.rerender(blok({source: PANEL, queries: [positionsAt], readExecutor: run, travelAt: '2026-10-25T09:00:00.000Z', initialState: {args: {slide: 's1'}}}));
    await flush();
    expect(calls.at(-1)?.variables).toEqual({slide: 's1', at: '2026-10-25T09:00:00.000Z'});
    await act(async () => calls.at(-1)?.deferred.resolve({positions: [{name: 'Then'}]}));
    expect(screen.queryByText('Then')).not.toBeNull();
  });

  it('that do not read then show current data while travelling, stale; no $at is ever added', async () => {
    const {calls, run} = executor();
    render(
      blok({
        source: '<Text className="q">{queries.positions.status}</Text>',
        queries: [positions],
        readExecutor: run,
        travelAt: '2026-10-25T09:00:00.000Z',
        initialState: {args: {slide: 's1'}},
      }),
    );
    await flush();
    expect(calls[0].variables).toEqual({slide: 's1'});
    await act(async () => calls[0].deferred.resolve({positions: []}));
    expect(screen.queryByText('stale')).not.toBeNull();
    expect(readsThen(positions.variables)).toBe(false);
    expect(readsThen(positionsAt.variables)).toBe(true);
    expect(readsThen([{key: 'at', util_call: {operation: 'val.to_string', arguments: [{key: 'value', value_path: 'then'}]}}])).toBe(true);
  });
});

describe('query.fetch_more', () => {
  const paged: BlokQuery = {
    key: 'positions',
    service: 'mikro',
    document: 'query($slide: ID!, $after: String) { positions(slide: $slide, after: $after) { items { name } cursor } }',
    variables: [{key: 'slide', value_path: 'args.slide'}],
    more: 'positions.items',
  };
  const PAGED =
    '<Card><Text>{list.join(list.pluck(queries.positions.value.positions.items, "name"))}</Text><Text>{queries.positions.fetching_more ? "fetching" : "idle"}</Text><Button onClick={queries.positions.fetch_more(after: queries.positions.value.positions.cursor)}>More</Button></Card>';

  it('reads the next page with its variables overridden, and appends it at the more path', async () => {
    const {calls, run} = executor();
    render(blok({source: PAGED, queries: [paged], readExecutor: run, initialState: {args: {slide: 's1'}}}));
    await flush();
    await act(async () => calls[0].deferred.resolve({positions: {items: [{name: 'Home'}], cursor: 'c1'}}));
    expect(screen.queryByText('Home')).not.toBeNull();

    await act(async () => screen.getByRole('button').click());
    expect(calls).toHaveLength(2);
    expect(calls[1].variables).toEqual({slide: 's1', after: 'c1'});
    expect(screen.queryByText('fetching')).not.toBeNull();
    // The pages already shown stay.
    expect(screen.queryByText('Home')).not.toBeNull();

    await act(async () => calls[1].deferred.resolve({positions: {items: [{name: 'Dock'}], cursor: 'c2'}}));
    expect(screen.queryByText('Home, Dock')).not.toBeNull();
    expect(screen.queryByText('idle')).not.toBeNull();

    // The next page reads on from the new cursor.
    await act(async () => screen.getByRole('button').click());
    expect(calls[2].variables).toEqual({slide: 's1', after: 'c2'});
    await act(async () => calls[2].deferred.reject(new Error('gone')));
    expect(screen.queryByText('Home, Dock')).not.toBeNull();
    expect(screen.queryByText('idle')).not.toBeNull();
  });

  it('merges a page into the shown answer at a dotted path', () => {
    const shown = {positions: {items: [1, 2], cursor: 'a', total: 4}};
    expect(mergePage(shown, {positions: {items: [3], cursor: 'b', total: 4}}, 'positions.items')).toEqual({
      positions: {items: [1, 2, 3], cursor: 'b', total: 4},
    });
    expect(mergePage({rows: [1]}, {rows: [2]}, 'rows')).toEqual({rows: [1, 2]});
    expect(mergePage(shown, {positions: {items: null}}, 'positions.items')).toBeNull();
  });
});

describe('declared subscriptions', () => {
  const events: BlokSubscription = {key: 'events', service: 'rekuest', document: 'subscription { agentEvents { kind } }', keep: 2};

  it('keep the last `keep` payloads, and turn stale when the stream drops', async () => {
    vi.useFakeTimers();
    const {sinks, run} = executor();
    render(
      blok({
        source: '<Card><Text>{list.join(list.pluck(subscriptions.events.value, "kind"))}</Text><Text>{subscriptions.events.status}</Text></Card>',
        subscriptions: [events],
        readExecutor: run,
      }),
    );
    await flush();
    expect(sinks).toHaveLength(1);
    await act(async () => {
      sinks[0].next({kind: 'a'});
      sinks[0].next({kind: 'b'});
      sinks[0].next({kind: 'c'});
    });
    expect(screen.queryByText('b, c')).not.toBeNull();
    await act(async () => sinks[0].error(new Error('dropped')));
    expect(screen.queryByText('stale')).not.toBeNull();
    // It is resumed by itself.
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(sinks).toHaveLength(2);
    vi.useRealTimers();
  });

  const LATEST = '<Card><Text>{subscriptions.latest.value.kind}</Text><Text>{subscriptions.latest.status}</Text></Card>';
  const latest: BlokSubscription = {key: 'latest', service: 'rekuest', document: 'subscription { agentEvents { kind } }'};

  it('pause while travelling, showing the value at travel start, stale; resume back live', async () => {
    const {sinks, closed, run} = executor();
    const view = render(blok({source: LATEST, subscriptions: [latest], readExecutor: run}));
    await flush();
    await act(async () => sinks[0].next({kind: 'moved'}));
    expect(screen.queryByText('ready')).not.toBeNull();

    view.rerender(blok({source: LATEST, subscriptions: [latest], readExecutor: run, travelAt: '2026-10-25T09:00:00.000Z'}));
    await flush();
    expect(closed).toContain(sinks[0]);
    expect(screen.queryByText('moved')).not.toBeNull();
    expect(screen.queryByText('stale')).not.toBeNull();

    view.rerender(blok({source: LATEST, subscriptions: [latest], readExecutor: run, travelAt: null}));
    await flush();
    expect(sinks).toHaveLength(2);
    await act(async () => sinks[1].next({kind: 'arrived'}));
    expect(screen.queryByText('arrived')).not.toBeNull();
    expect(screen.queryByText('ready')).not.toBeNull();
  });

  it('show their history query while travelling, which reads then itself', async () => {
    const {calls, sinks, run} = executor();
    const past: BlokQuery = {
      key: 'past',
      service: 'rekuest',
      document: 'query($at: DateTime) { agentEventAt(at: $at) { kind } }',
      variables: [{key: 'at', value_path: 'then'}],
    };
    const replayed: BlokSubscription = {...latest, history: 'past'};
    render(blok({source: LATEST, queries: [past], subscriptions: [replayed], readExecutor: run, travelAt: '2026-10-25T09:00:00.000Z'}));
    await flush();
    expect(sinks).toHaveLength(0);
    expect(calls[0].variables).toEqual({at: '2026-10-25T09:00:00.000Z'});
    await act(async () => calls[0].deferred.resolve({kind: 'docked'}));
    expect(screen.queryByText('docked')).not.toBeNull();
    expect(screen.queryByText('ready')).not.toBeNull();
  });
});
