// @vitest-environment jsdom
import {act, cleanup, fireEvent, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import * as z from 'zod';
import {createBlokCatalog, createBlokFunction} from '../runtime';
import {shadcnComposableComponents} from './index';
import {renderBlokDocument} from './testing';

afterEach(cleanup);

const record = vi.fn();

/**
 * A catalog whose one effect function records what it was called with, so a
 * change handler's resolved arguments are observable.
 */
const catalog = createBlokCatalog(
  'event-test-catalog',
  shadcnComposableComponents,
  [
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
  ],
);

describe('$event', () => {
  it('hands a change handler the new value', () => {
    record.mockClear();

    renderBlokDocument(catalog, [
      {
        id: 'name',
        component: 'Input',
        props: [
          {
            key: 'action',
            util_call: {
              operation: 'test.record',
              arguments: [{key: 'value', value_path: '$event'}],
            },
          },
        ],
      },
    ]);

    fireEvent.change(screen.getByRole('textbox'), {target: {value: 'beta'}});

    expect(record).toHaveBeenCalledWith('beta');
  });

  it('resolves into a structured event value', () => {
    record.mockClear();

    renderBlokDocument(
      catalog,
      [
        {
          id: 'flag',
          component: 'Checkbox',
          props: [
            {key: 'bind', static_value: 'settings/enabled'},
            {
              key: 'onChange',
              util_call: {
                operation: 'test.record',
                // The bound path is written before the action fires, so both
                // spellings see the new value.
                arguments: [{key: 'value', value_path: 'settings/enabled'}],
              },
            },
          ],
        },
      ],
      {settings: {enabled: false}},
    );

    fireEvent.click(screen.getByRole('checkbox'));

    expect(record).toHaveBeenCalledWith(true);
  });

  it('leaves a handler without arguments working', () => {
    record.mockClear();

    renderBlokDocument(catalog, [
      {
        id: 'go',
        component: 'Button',
        props: [
          {key: 'label', static_value: 'Go'},
          {
            key: 'onClick',
            util_call: {
              operation: 'test.record',
              arguments: [{key: 'value', value_literal: 'clicked'}],
            },
          },
        ],
      },
    ]);

    fireEvent.click(screen.getByRole('button'));

    expect(record).toHaveBeenCalledWith('clicked');
  });
});

describe('Button pending', () => {
  const agentButton = [
    {
      id: 'go',
      component: 'Button',
      props: [
        {key: 'label', static_value: 'Go'},
        {key: 'onClick', agent_call: {dependency: 'self', operation: 'move', arguments: []}},
      ],
    },
  ];

  it('pulses until the dispatched task settles', async () => {
    let settle: () => void = () => undefined;
    const {store} = renderBlokDocument(catalog, agentButton);
    act(() => {
      store.getState().setDispatchAction(
        () => new Promise<void>(resolve => {
          settle = resolve;
        }),
      );
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.className).toContain('animate-pulse');

    await act(async () => {
      settle();
    });
    expect(button.getAttribute('aria-busy')).toBeNull();
    expect(button.className).not.toContain('animate-pulse');
  });

  it('does not pulse when the host returns nothing', () => {
    const {store} = renderBlokDocument(catalog, agentButton);
    act(() => {
      store.getState().setDispatchAction(() => undefined);
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button.getAttribute('aria-busy')).toBeNull();
  });
});
