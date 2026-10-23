// @vitest-environment jsdom
import {act, cleanup, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

const run = vi.fn<(query: string, variables: Record<string, unknown>) => Promise<Record<string, unknown>>>();
vi.mock('@/core/modules/hooks/useServiceQuery', () => ({useServiceQuery: () => run}));

import {defaultBlokCatalog} from '../catalog';
import {checkReadOnlyQueries, checkRecordWriters} from '../../bsx/analyze';
import {parseBsxSafe} from '../../bsx/parse';
import {recordPhase} from '../runtime';
import {renderBlokDocument} from './testing';

afterEach(() => {
  cleanup();
  run.mockReset();
});

const text = (id: string, value: string) => ({id, component: 'p', props: [{key: 'text', static_value: value}]});
const render = (roots: unknown[], state?: unknown) => renderBlokDocument(defaultBlokCatalog, roots, state);

describe('when', () => {
  it('renders its children while the condition holds, and the opposite with not', () => {
    render(
      [
        {id: 'on', component: 'when', props: [{key: 'test', dynamic_value: {path: 'flag'}}], children: [text('a', 'shown')]},
        {
          id: 'off',
          component: 'when',
          props: [{key: 'test', dynamic_value: {path: 'flag'}}, {key: 'not', static_value: true}],
          children: [text('b', 'hidden')],
        },
      ],
      {flag: true},
    );

    expect(screen.queryByText('shown')).not.toBeNull();
    expect(screen.queryByText('hidden')).toBeNull();
  });
});

describe('match', () => {
  const tree = [
    {
      id: 'switch',
      component: 'match',
      props: [{key: 'value', dynamic_value: {path: 'job.status'}}],
      children: [
        {id: 'running', component: 'case', props: [{key: 'is', static_value: 'running'}], children: [text('r', 'Running')]},
        {id: 'over', component: 'case', props: [{key: 'is', static_value: ['done', 'failed']}], children: [text('o', 'Over')]},
        {id: 'default', component: 'default', children: [text('d', 'Idle')]},
      ],
    },
  ];

  it('renders the first matching case', () => {
    const {errors} = render(tree, {job: {status: 'running'}});
    expect(errors).toEqual([]);
    expect(screen.queryByText('Running')).not.toBeNull();
    expect(screen.queryByText('Idle')).toBeNull();
  });

  it('matches one of a list, and falls back to Default', () => {
    render(tree, {job: {status: 'failed'}});
    expect(screen.queryByText('Over')).not.toBeNull();
    cleanup();
    render(tree, {job: {status: 'idle'}});
    expect(screen.queryByText('Idle')).not.toBeNull();
  });

  it('matches a number written as text', () => {
    render(
      [
        {
          id: 's',
          component: 'match',
          props: [{key: 'value', dynamic_value: {path: 'n'}}],
          children: [{id: 'c', component: 'case', props: [{key: 'is', static_value: '3'}], children: [text('t', 'three')]}],
        },
      ],
      {n: 3},
    );
    expect(screen.queryByText('three')).not.toBeNull();
  });
});

describe('record slots', () => {
  it('reads either kind of record', () => {
    expect(recordPhase({loading: true, data: null})).toBe('pending');
    expect(recordPhase({loading: true, stale: true, data: {a: 1}})).toBe('ready');
    expect(recordPhase({ready: true, empty: true})).toBe('empty');
    expect(recordPhase({failed: true})).toBe('failed');
    expect(recordPhase({running: true, result: null})).toBe('pending');
    expect(recordPhase({done: true})).toBe('ready');
    expect(recordPhase(undefined)).toBe('idle');
  });

  it('follows a task record named with of', () => {
    render(
      [
        {id: 'p', component: 'pending', props: [{key: 'of', dynamic_value: {path: 'job'}}], children: [text('a', 'Working')]},
        {id: 'r', component: 'ready', props: [{key: 'of', dynamic_value: {path: 'job'}}], children: [text('b', 'Done')]},
      ],
      {job: {status: 'running', running: true, done: false, failed: false}},
    );
    expect(screen.queryByText('Working')).not.toBeNull();
    expect(screen.queryByText('Done')).toBeNull();
  });
});

describe('query', () => {
  const query = (props: unknown[] = []) => ({
    id: 'q',
    component: 'query',
    props: [
      {key: 'schema', static_value: 'mikro'},
      {key: 'query', static_value: 'query($folder: ID!) { datasets { id name } }'},
      {key: 'bind', static_value: 'cells'},
      ...props,
    ],
    children: [
      {id: 'pending', component: 'pending', children: [text('l', 'Loading')]},
      {id: 'failed', component: 'failed', children: [text('f', 'Failed')]},
      {id: 'empty', component: 'empty', children: [text('e', 'Nothing')]},
      {
        id: 'ready',
        component: 'ready',
        children: [
          {
            id: 'each',
            component: 'foreach',
            props: [
              {key: 'items', dynamic_value: {path: 'cells.data.datasets'}},
              {key: 'let', static_value: 'ds', declares_value: 'ds'},
            ],
            children: [{id: 'name', component: 'p', props: [{key: 'text', dynamic_value: {path: 'ds.name'}}]}],
          },
        ],
      },
    ],
  });

  it('waits for a required variable, then writes its record and its answer', async () => {
    let resolve!: (value: Record<string, unknown>) => void;
    run.mockReturnValue(new Promise(done => (resolve = done)));

    const {store, errors} = render([query()], {folder: null});
    expect(errors).toEqual([]);
    expect(run).not.toHaveBeenCalled();

    act(() => store.getState().setRuntimeValue('folder', {object: '7', __identifier: '@mikro/folder'}));
    await waitFor(() => expect(run).toHaveBeenCalledWith(expect.any(String), {folder: '7'}));
    expect(screen.queryByText('Loading')).not.toBeNull();

    await act(async () => resolve({datasets: [{id: '1', name: 'alpha'}]}));
    await waitFor(() => expect(screen.queryByText('alpha')).not.toBeNull());
    expect(screen.queryByText('Loading')).toBeNull();
    expect(store.getState().dataModel).toMatchObject({cells: {status: 'ready', ready: true, empty: false}});
  });

  it('says an empty answer and a failure apart', async () => {
    run.mockResolvedValueOnce({datasets: []});
    render([query([{key: 'variables', static_value: {folder: '1'}}])]);
    await waitFor(() => expect(screen.queryByText('Nothing')).not.toBeNull());
    cleanup();

    run.mockRejectedValueOnce(new Error('The mikro service is not connected.'));
    const {store} = render([query([{key: 'variables', static_value: {folder: '1'}}])]);
    await waitFor(() => expect(screen.queryByText('Failed')).not.toBeNull());
    expect((store.getState().dataModel as {cells: {error: string}}).cells.error).toMatch(/not connected/);
  });

  it('keeps a demo_state record until it has something to replace it with', () => {
    const seeded = {status: 'ready', ready: true, empty: false, data: {datasets: [{id: '1', name: 'seeded'}]}};
    run.mockReturnValue(new Promise(() => undefined));
    render([query()], {folder: null, cells: seeded});
    expect(screen.queryByText('seeded')).not.toBeNull();
  });
});

describe('read-only GraphQL', () => {
  it('never sends a mutation, and the editor marks one', async () => {
    const {store} = render([
      {
        id: 'q',
        component: 'query',
        props: [
          {key: 'schema', static_value: 'mikro'},
          {key: 'query', static_value: 'mutation { deleteEverything }'},
          {key: 'bind', static_value: 'cells'},
        ],
      },
    ]);
    await waitFor(() =>
      expect((store.getState().dataModel as {cells?: {error: string}}).cells?.error).toMatch(/never a mutation/),
    );
    expect(run).not.toHaveBeenCalled();

    const parsed = parseBsxSafe('<div><query schema="mikro" query="mutation { x }" bind="a" /><query schema="mikro" query="query { y }" bind="b" /></div>');
    if (!parsed.ok) throw parsed.error;
    expect(checkReadOnlyQueries(parsed.tree)).toHaveLength(1);
  });
});

describe('list.range', () => {
  it('counts from start by step, capped', () => {
    expect(defaultBlokCatalog.invokeFunction('list.range', {count: 3})).toEqual({ok: true, value: [0, 1, 2]});
    expect(defaultBlokCatalog.invokeFunction('list.range', {count: 3, start: 1, step: 2})).toEqual({ok: true, value: [1, 3, 5]});
    const big = defaultBlokCatalog.invokeFunction('list.range', {count: 1e9});
    expect(big.ok && (big.value as unknown[]).length).toBe(10_000);
  });
});

describe('one writer per record', () => {
  const findings = (source: string) => {
    const parsed = parseBsxSafe(source);
    if (!parsed.ok) throw parsed.error;
    return checkRecordWriters(parsed.tree, defaultBlokCatalog);
  };

  it('warns about a control bound to a query record, and about two queries on one path', () => {
    const result = findings(`<div>
      <query schema="mikro" query="query { a }" bind="cells" />
      <query schema="mikro" query="query { b }" bind="cells" />
      <Input bind="cells" />
      <Input bind="other" />
    </div>`);
    expect(result).toHaveLength(2);
    expect(result.map(finding => finding.message).join(' ')).toMatch(/race/);
    expect(result.map(finding => finding.message).join(' ')).toMatch(/overwrite/);
  });

  it('is quiet for distinct paths', () => {
    expect(findings('<div><query schema="mikro" query="query { a }" bind="a" /><Input bind="b" /></div>')).toEqual([]);
  });
});
