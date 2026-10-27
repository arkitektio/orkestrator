// @vitest-environment jsdom
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import BlokRenderer from './BlokRenderer';

afterEach(cleanup);

describe('BlokRenderer', () => {
  it('resolves a function of the vocabulary on the first render', () => {
    render(
      <BlokRenderer
        initialState={{step: 0}}
        uiComponents={[
          {
            id: 'back',
            component: 'Button',
            props: [
              {
                key: 'disabled',
                util_call: {
                  operation: 'cmp.eq',
                  arguments: [
                    {key: 'a', value_path: 'step'},
                    {key: 'b', value_literal: 0},
                  ],
                },
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.queryByText(/No blok function catalog/)).toBeNull();
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('BlokRenderer while travelling', () => {
  it('renders the moment: then is the travel time, and commands are refused', async () => {
    const {fireEvent} = await import('@testing-library/react');
    const dispatched: unknown[] = [];
    render(
      <BlokRenderer
        travelAt="2026-10-25T12:00:00.000Z"
        dispatchAction={action => void dispatched.push(action)}
        uiComponents={[
          {
            id: 'root',
            component: 'Card',
            children: [
              {id: 'at', component: 'Text', props: [{key: 'text', dynamic_value: {path: 'then'}}]},
              {
                id: 'go',
                component: 'Button',
                props: [
                  {key: 'label', static_value: 'Go'},
                  {key: 'onClick', agent_call: {dependency: 'self', operation: 'move'}},
                ],
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.queryByText('2026-10-25T12:00:00.000Z')).not.toBeNull();
    const button = screen.getByRole('button');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('title')).toContain('Viewing the past');
    fireEvent.click(button);
    expect(dispatched).toEqual([]);
  });
});

describe('BlokRenderer then', () => {
  const isLive = [
    {
      id: 'live',
      component: 'Text',
      props: [{key: 'text', util_call: {operation: 'val.is_null', arguments: [{key: 'value', value_path: 'then'}]}}],
    },
  ];

  it('is null while live, from the first render on: a blok never reads the wall clock', () => {
    render(<BlokRenderer uiComponents={isLive} />);
    expect(document.querySelector('[data-blok-error]')).toBeNull();
    expect(document.querySelector('[data-blok-pending]')).toBeNull();
    expect(screen.queryByText('true')).not.toBeNull();
  });

  it('follows the host: set while travelling, null again back live', () => {
    const view = render(<BlokRenderer travelAt="2026-10-25T12:00:00.000Z" uiComponents={isLive} />);
    expect(screen.queryByText('false')).not.toBeNull();
    view.rerender(<BlokRenderer travelAt={null} uiComponents={isLive} />);
    expect(screen.queryByText('true')).not.toBeNull();
  });

  it('has no now root', () => {
    render(<BlokRenderer uiComponents={[{id: 'now', component: 'Text', props: [{key: 'text', dynamic_value: {path: 'now'}}]}]} />);
    expect(screen.queryByText(/\d{4}-\d{2}-\d{2}T/)).toBeNull();
  });
});
