// @vitest-environment jsdom
import {act, cleanup, fireEvent, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import * as z from 'zod';

const loaded = vi.hoisted(() => vi.fn());
const options = vi.hoisted(() => ({
  search: vi.fn(async (_request: Record<string, unknown>) => [] as {value: string; label: string}[]),
  honoursRequires: false,
}));
// The action input the picker fills, when a test gives it one.
const port = vi.hoisted(() => ({value: undefined as unknown}));
const service = vi.hoisted(() => ({
  run: vi.fn(async (_query: string, _variables: Record<string, unknown>) => ({
    options: [{value: 7, label: 'cells.zarr', description: 'c[0:1]'}, {value: null}],
  })),
}));

vi.mock('@/core/modules/hooks/useStructureOptions', () => ({
  useStructureOptions: (identifier: string) =>
    identifier === '@mikro/arraydataset' ? options.search : undefined,
  useOptionSourceHonoursRequires: (identifier: string) =>
    identifier === '@mikro/arraydataset' && options.honoursRequires,
}));
vi.mock('../../runtime', async importOriginal => ({
  ...(await importOriginal<typeof import('../../runtime')>()),
  useBlokPort: () => port.value,
}));
vi.mock('@/core/modules/hooks/useServiceQuery', () => ({
  useServiceQuery: (ward: string | undefined) => (query: string, variables: Record<string, unknown>) =>
    service.run(`${ward}:${query}`, variables),
}));
// The real one is a popover over cmdk; what matters here is what the blok
// hands it and does with the id it is handed back.
vi.mock('@/core/forms/StructurePickerControl', () => ({
  StructurePickerControl: (props: {
    value: string | undefined;
    onChange: (value: string | undefined) => void;
    load: (request: {search?: string; ids?: string[]; limit: number; offset: number}) => Promise<unknown>;
    placeholder?: string;
    paged?: boolean;
    requires?: unknown[];
    scope?: {label: string; active: boolean; onToggle: () => void};
  }) => (
    <div
      data-testid="picker"
      data-value={props.value ?? ''}
      data-paged={String(props.paged)}
      data-requires={JSON.stringify(props.requires ?? null)}
      data-scope={props.scope ? `${props.scope.label}|${props.scope.active}` : ''}
    >
      {props.placeholder}
      <button onClick={() => props.onChange('42')}>pick</button>
      <button onClick={() => props.onChange(undefined)}>clear</button>
      <button onClick={() => void props.load({search: 'cells', limit: 25, offset: 0}).then(found => loaded(found))}>
        list
      </button>
      <button onClick={() => void props.load({ids: ['42'], limit: 1, offset: 0})}>resolve</button>
      {props.scope && <button onClick={props.scope.onToggle}>toggle scope</button>}
    </div>
  ),
}));
vi.mock('@/core/smart/display/StructureDisplay', () => ({
  StructureDisplay: (props: {identifier: string; id: string; variant?: string}) => (
    <span data-testid="display" data-variant={props.variant}>
      {props.identifier}:{props.id}
    </span>
  ),
}));
vi.mock('@/core/smart/display/StructureViewer', () => ({
  StructureViewer: (props: {identifier: string; id: string; controls?: boolean}) => (
    <span data-testid="viewer" data-controls={String(props.controls)}>
      {props.identifier}:{props.id}
    </span>
  ),
}));

import {createBlokCatalog, createBlokFunction} from '../../runtime';
import {renderBlokDocument} from '../testing';
import {structureBlokComponents} from './index';

afterEach(cleanup);

const record = vi.fn();
const catalog = createBlokCatalog('structure-test-catalog', structureBlokComponents, [
  createBlokFunction(
    {
      name: 'test.record',
      description: 'Records its arguments.',
      schema: z.object({value: z.unknown()}),
    },
    args => {
      record(args.value);
      return null;
    },
  ),
]);

const DATASET = {object: '42', __identifier: '@mikro/arraydataset'};

const picker = (extra: unknown[] = []) => [
  {
    id: 'image',
    component: 'StructurePicker',
    props: [
      {key: 'identifier', static_value: '@mikro/arraydataset'},
      {key: 'bind', static_value: 'form/image'},
      ...extra,
    ],
  },
];

describe('StructurePicker', () => {
  it('writes a structure reference to its binding', () => {
    const {store, errors} = renderBlokDocument(catalog, picker(), {form: {image: null}});
    expect(errors).toEqual([]);

    fireEvent.click(screen.getByText('pick'));

    expect(store.getState().dataModel).toMatchObject({form: {image: DATASET}});
    expect(screen.getByTestId('picker').dataset.value).toBe('42');
  });

  it('shows what the binding already holds', () => {
    renderBlokDocument(catalog, picker(), {form: {image: DATASET}});

    expect(screen.getByTestId('picker').dataset.value).toBe('42');
  });

  it('clears to null, so a call reading the path sees "nothing selected"', () => {
    const {store} = renderBlokDocument(catalog, picker(), {form: {image: DATASET}});

    fireEvent.click(screen.getByText('clear'));

    const form = (store.getState().dataModel as {form: Record<string, unknown>}).form;
    expect(form).toHaveProperty('image', null);
  });

  it('hands its change handler the reference as event.value', () => {
    record.mockClear();
    const {store} = renderBlokDocument(
      catalog,
      picker([
        {
          key: 'onChange',
          agent_call: {dependency: 'self', operation: 'open', arguments: [{key: 'image', value_path: 'event.value'}]},
        },
      ]),
      {form: {image: null}},
    );
    act(() => store.getState().setDispatchAction(action => void record(action.arguments?.image)));

    fireEvent.click(screen.getByText('pick'));

    expect(record).toHaveBeenCalledWith(DATASET);
  });

  it('says so when no module answers for the identifier', () => {
    renderBlokDocument(catalog, [
      {
        id: 'thing',
        component: 'StructurePicker',
        props: [{key: 'identifier', static_value: '@nobody/thing'}],
      },
    ]);

    expect(screen.getByText(/No picker available for @nobody\/thing/)).toBeInTheDocument();
    expect(screen.queryByTestId('picker')).toBeNull();
  });
});

describe('StructurePicker answered by the owning module', () => {
  const REQUIRES = [{key: '@mikro/n_channels', operator: 'GTE', value: 2}];
  afterEach(() => {
    port.value = undefined;
    options.honoursRequires = false;
  });

  it("hands a source that honours them the input's constraints, and shows them", async () => {
    options.search.mockClear();
    options.honoursRequires = true;
    port.value = {identifier: '@mikro/arraydataset', requires: REQUIRES};
    renderBlokDocument(catalog, picker(), {form: {image: null}});

    fireEvent.click(screen.getByText('list'));
    await vi.waitFor(() => expect(options.search).toHaveBeenCalled());

    expect(options.search).toHaveBeenLastCalledWith({search: 'cells', requires: REQUIRES});
    expect(JSON.parse(screen.getByTestId('picker').dataset.requires ?? 'null')).toEqual(REQUIRES);
  });

  it('resolves a held value by its id alone', () => {
    options.search.mockClear();
    options.honoursRequires = true;
    port.value = {identifier: '@mikro/arraydataset', requires: REQUIRES};
    renderBlokDocument(catalog, picker(), {form: {image: null}});

    fireEvent.click(screen.getByText('resolve'));

    expect(options.search).toHaveBeenLastCalledWith({values: ['42']});
  });

  it('shows no constraints for a source that cannot narrow by them', () => {
    port.value = {identifier: '@mikro/arraydataset', requires: REQUIRES};
    renderBlokDocument(catalog, picker(), {form: {image: null}});

    expect(screen.getByTestId('picker').dataset.requires).toBe('null');
  });
});

describe('StructurePicker with a query of its own', () => {
  const QUERY =
    'query Lenses($search: String, $values: [ID!], $requires: [DescriptorConstraintInput!], $path: ID, $limit: Int, $offset: Int = 0) { options: lenses(filters: {search: $search, ids: $values, requires: $requires, reachableFrom: $path}, pagination: {limit: $limit, offset: $offset}) { value: id label } }';
  const PATH = {object: 'a1', __identifier: '@mikro/annotation'};
  const lensPicker = (query = QUERY, extra: unknown[] = []) => [
    {
      id: 'lens',
      component: 'StructurePicker',
      props: [
        {key: 'identifier', static_value: '@mikro/arraylens'},
        {key: 'bind', static_value: 'value'},
        {key: 'query', static_value: query},
        {key: 'schema', static_value: 'mikro'},
        ...extra,
      ],
    },
  ];
  const lastRun = () => service.run.mock.calls.at(-1) as [string, Record<string, unknown>];

  it('runs its query on its schema service, and reads the candidates off `options`', async () => {
    service.run.mockClear();
    loaded.mockClear();
    renderBlokDocument(catalog, lensPicker(), {value: null, path: null});

    fireEvent.click(screen.getByText('list'));
    await vi.waitFor(() => expect(loaded).toHaveBeenCalled());

    expect(lastRun()[0]).toBe(`mikro:${QUERY}`);
    expect(lastRun()[1]).toEqual({search: 'cells', limit: 25, offset: 0, requires: [], path: null});
    // An entry without a value is no candidate; a number is an id like any other.
    expect(loaded).toHaveBeenCalledWith([{value: '7', label: 'cells.zarr', description: 'c[0:1]'}]);
    expect(screen.getByTestId('picker').dataset.paged).toBe('true');
  });

  it('hands a variable of the query the data of the same name, a structure as its id', () => {
    service.run.mockClear();
    renderBlokDocument(catalog, lensPicker(), {value: null, path: PATH});

    fireEvent.click(screen.getByText('list'));

    expect(lastRun()[1]).toMatchObject({path: 'a1'});
    expect(screen.getByTestId('picker').dataset.scope).toBe('Narrowed by path|true');
  });

  it('lets the user lift what the variable narrows the list to, and put it back', () => {
    service.run.mockClear();
    renderBlokDocument(catalog, lensPicker(), {value: null, path: PATH});

    fireEvent.click(screen.getByText('toggle scope'));
    fireEvent.click(screen.getByText('list'));
    expect(lastRun()[1]).toMatchObject({path: null});
    expect(screen.getByTestId('picker').dataset.scope).toBe('Narrowed by path|false');

    fireEvent.click(screen.getByText('toggle scope'));
    fireEvent.click(screen.getByText('list'));
    expect(lastRun()[1]).toMatchObject({path: 'a1'});
  });

  it('prefers a value given in `variables` over the data of that name', () => {
    service.run.mockClear();
    renderBlokDocument(
      catalog,
      lensPicker(QUERY, [{key: 'variables', dynamic_value: {path: 'form'}}]),
      {value: null, path: PATH, form: {path: {object: 'b2', __identifier: '@mikro/annotation'}}},
    );

    fireEvent.click(screen.getByText('list'));

    expect(lastRun()[1]).toMatchObject({path: 'b2'});
  });

  it('resolves a held value by its id alone, whatever narrows the list', () => {
    service.run.mockClear();
    renderBlokDocument(catalog, lensPicker(), {value: null, path: PATH});

    fireEvent.click(screen.getByText('resolve'));

    expect(lastRun()[1]).toEqual({values: ['42'], limit: 1, offset: 0, path: null});
  });

  it('waits for a variable the query declares non-null, and never lifts it', () => {
    service.run.mockClear();
    const strict = QUERY.replace('$path: ID,', '$path: ID!,');
    const {store} = renderBlokDocument(catalog, lensPicker(strict), {value: null, path: null});

    expect(screen.getByText('Waiting for: path')).toBeInTheDocument();
    expect(screen.queryByTestId('picker')).toBeNull();

    act(() => store.getState().setInitialDataModel({value: null, path: PATH}));
    fireEvent.click(screen.getByText('list'));
    expect(lastRun()[1]).toMatchObject({path: 'a1'});
    expect(screen.getByTestId('picker').dataset.scope).toBe('');

    fireEvent.click(screen.getByText('resolve'));
    expect(lastRun()[1]).toMatchObject({values: ['42'], path: 'a1'});
  });

  it('sends only what the query declares, and does not page a query that cannot', () => {
    service.run.mockClear();
    const plain = 'query S($search: String, $values: [ID!]) { options: things(search: $search, ids: $values) { value: id label: name } }';
    renderBlokDocument(catalog, lensPicker(plain), {value: null});

    fireEvent.click(screen.getByText('list'));

    expect(lastRun()[1]).toEqual({search: 'cells'});
    expect(screen.getByTestId('picker').dataset.paged).toBe('false');
    expect(screen.getByTestId('picker').dataset.scope).toBe('');
  });
});

describe('StructureDisplay', () => {
  const display = (extra: unknown[] = []) => [
    {
      id: 'result',
      component: 'StructureDisplay',
      props: [{key: 'value', dynamic_value: {path: 'self/run/result'}}, ...extra],
    },
  ];

  it('shows the structure through its module, as a card unless told otherwise', () => {
    renderBlokDocument(catalog, display(), {deps: {self: {run: {result: DATASET}}}});

    const shown = screen.getByTestId('display');
    expect(shown).toHaveTextContent('@mikro/arraydataset:42');
    expect(shown.dataset.variant).toBe('card');
  });

  it('is a placeholder while the value is unset', () => {
    renderBlokDocument(catalog, display([{key: 'emptyText', static_value: 'No result yet.'}]), {
      deps: {self: {run: {result: null}}},
    });

    expect(screen.getByText('No result yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('display')).toBeNull();
  });
});

describe('StructureViewer', () => {
  const viewer = (extra: unknown[] = []) => [
    {
      id: 'result',
      component: 'StructureViewer',
      props: [{key: 'value', dynamic_value: {path: 'self/run/result'}}, ...extra],
    },
  ];

  it('opens the structure in a box with a height of its own', () => {
    renderBlokDocument(catalog, viewer(), {deps: {self: {run: {result: DATASET}}}});

    const opened = screen.getByTestId('viewer');
    expect(opened).toHaveTextContent('@mikro/arraydataset:42');
    expect(opened.dataset.controls).toBe('true');
    expect(opened.parentElement?.style.height).toBe('24rem');
  });

  it('takes its height and controls from the blok', () => {
    renderBlokDocument(
      catalog,
      viewer([
        {key: 'height', static_value: '100%'},
        {key: 'controls', static_value: false},
      ]),
      {deps: {self: {run: {result: DATASET}}}},
    );

    const opened = screen.getByTestId('viewer');
    expect(opened.dataset.controls).toBe('false');
    expect(opened.parentElement?.style.height).toBe('100%');
  });

  it('is a placeholder, at the same height, while the value is unset', () => {
    // What a nullable structure field of an agent state seeds the model with.
    for (const result of [null, '', {}]) {
      renderBlokDocument(catalog, viewer(), {deps: {self: {run: {result}}}});

      expect(screen.getByText('Nothing to show yet.').parentElement?.style.height).toBe('24rem');
      expect(screen.queryByTestId('viewer')).toBeNull();
      cleanup();
    }
  });
});
