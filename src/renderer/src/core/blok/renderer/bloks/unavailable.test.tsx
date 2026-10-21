// @vitest-environment jsdom
import {act, cleanup, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {createBlokCatalog} from '../runtime';
import {actionDependenciesOf} from '../runtime/hooks';
import {shadcnComposableComponents} from './index';
import {renderBlokDocument} from './testing';

afterEach(cleanup);

const catalog = createBlokCatalog('test', shadcnComposableComponents, []);

const button = (dependency: string) => ({
  id: 'go',
  component: 'Button',
  props: [
    {key: 'label', static_value: 'Go'},
    {key: 'onClick', agent_call: {dependency, operation: 'move'}},
  ],
});

describe('unavailable dependencies', () => {
  it('grays out a button whose action needs one, with the reason on hover', () => {
    const {store} = renderBlokDocument(catalog, [button('stage')]);
    expect(screen.getByRole('button')).not.toBeDisabled();

    act(() => store.getState().setUnavailableDependencies(new Map([['stage', 'Stage is offline']])));
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Stage is offline');

    act(() => store.getState().setUnavailableDependencies(new Map()));
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('leaves buttons on other dependencies alone', () => {
    const {store} = renderBlokDocument(catalog, [button('lamp')]);
    act(() => store.getState().setUnavailableDependencies(new Map([['stage', 'Stage is offline']])));
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('finds the dependencies nested in an action', () => {
    expect(
      actionDependenciesOf({
        key: 'onClick',
        util_call: {
          operation: 'all',
          arguments: [{key: '0', agent_call: {dependency: 'stage', operation: 'move', arguments: [{key: 'x', agent_call: {dependency: 'lamp', operation: 'read'}}]}}],
        },
      }),
    ).toEqual(['stage', 'lamp']);
  });
});
