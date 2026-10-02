// @vitest-environment jsdom
import {cleanup, fireEvent, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import * as z from 'zod';

const options = vi.hoisted(() => ({search: vi.fn(async () => []) as unknown}));

vi.mock('@/core/modules/hooks/useStructureOptions', () => ({
  useStructureOptions: (identifier: string) =>
    identifier === '@mikro/arraydataset' ? options.search : undefined,
}));
// The real one is a popover over cmdk; what matters here is what the blok
// does with the id it is handed.
vi.mock('@/core/forms/AsyncCombobox', () => ({
  AsyncCombobox: (props: {
    value: string | null | undefined;
    onChange: (value: string | undefined) => void;
    placeholder?: string;
  }) => (
    <div data-testid="picker" data-value={props.value ?? ''}>
      {props.placeholder}
      <button onClick={() => props.onChange('42')}>pick</button>
      <button onClick={() => props.onChange(undefined)}>clear</button>
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

  it('hands its change handler the reference as $event', () => {
    record.mockClear();
    renderBlokDocument(
      catalog,
      picker([
        {
          key: 'onChange',
          util_call: {operation: 'test.record', arguments: [{key: 'value', value_path: '$event'}]},
        },
      ]),
      {form: {image: null}},
    );

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

describe('StructureDisplay', () => {
  const display = (extra: unknown[] = []) => [
    {
      id: 'result',
      component: 'StructureDisplay',
      props: [{key: 'value', dynamic_value: {path: 'self/run/result'}}, ...extra],
    },
  ];

  it('shows the structure through its module, as a card unless told otherwise', () => {
    renderBlokDocument(catalog, display(), {self: {run: {result: DATASET}}});

    const shown = screen.getByTestId('display');
    expect(shown).toHaveTextContent('@mikro/arraydataset:42');
    expect(shown.dataset.variant).toBe('card');
  });

  it('is a placeholder while the value is unset', () => {
    renderBlokDocument(catalog, display([{key: 'emptyText', static_value: 'No result yet.'}]), {
      self: {run: {result: null}},
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
    renderBlokDocument(catalog, viewer(), {self: {run: {result: DATASET}}});

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
        {key: 'controls', static_value: 'false'},
      ]),
      {self: {run: {result: DATASET}}},
    );

    const opened = screen.getByTestId('viewer');
    expect(opened.dataset.controls).toBe('false');
    expect(opened.parentElement?.style.height).toBe('100%');
  });

  it('is a placeholder, at the same height, while the value is unset', () => {
    // What a nullable structure field of an agent state seeds the model with.
    for (const result of [null, '', {}]) {
      renderBlokDocument(catalog, viewer(), {self: {run: {result}}});

      expect(screen.getByText('Nothing to show yet.').parentElement?.style.height).toBe('24rem');
      expect(screen.queryByTestId('viewer')).toBeNull();
      cleanup();
    }
  });
});
