// @vitest-environment jsdom
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import BlokRenderer from './BlokRenderer';

afterEach(cleanup);

describe('BlokRenderer', () => {
  it('resolves a catalog function on the first render', () => {
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
                  operation: 'eq',
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
