// @vitest-environment jsdom
import {act, cleanup, fireEvent, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {defaultBlokCatalog} from '../catalog';
import type {BlokResolvedAgentCall, BlokTaskObserver} from '../runtime';
import {renderBsx} from './testing';

/**
 * Callbacks, blok language v2: exactly one task call (or refetch, `ui.copy`,
 * `task.answer`), its arguments reading `event` as the component's catalog
 * shapes it, and a control busy while its call's task runs.
 */

afterEach(cleanup);

const render = (source: string, state?: unknown) => renderBsx(defaultBlokCatalog, source, state);

const dispatched = () => {
  const calls: BlokResolvedAgentCall[] = [];
  return {calls, handler: (action: BlokResolvedAgentCall) => void calls.push(action)};
};

describe('event', () => {
  it('hands a change handler the new value as event.value', () => {
    const {store} = render('<Input action={deps.stage.set(x: event.value)} />');
    const sink = dispatched();
    act(() => store.getState().setDispatchAction(sink.handler));

    fireEvent.change(screen.getByRole('textbox'), {target: {value: 'beta'}});

    expect(sink.calls.at(-1)).toEqual({dependency: 'stage', operation: 'set', arguments: {x: 'beta'}});
  });

  it('writes a bound local before the callback reads it', () => {
    const {store} = render('<Checkbox bind={enabled} onChange={self.toggle(on: enabled, value: event.value)} />', {enabled: false});
    const sink = dispatched();
    act(() => store.getState().setDispatchAction(sink.handler));

    fireEvent.click(screen.getByRole('checkbox'));

    expect(sink.calls.at(-1)?.arguments).toEqual({on: true, value: true});
    expect((store.getState().dataModel as {enabled: boolean}).enabled).toBe(true);
  });

  it('leaves a callback that reads no event working', () => {
    const {store} = render('<Button onClick={self.go(to: "dock")}>Go</Button>');
    const sink = dispatched();
    act(() => store.getState().setDispatchAction(sink.handler));

    fireEvent.click(screen.getByRole('button'));

    expect(sink.calls).toEqual([{dependency: 'self', operation: 'go', arguments: {to: 'dock'}}]);
  });
});

describe('a control is busy while its task runs', () => {
  it('sets data-busy and does not dispatch again until the task settles', async () => {
    let settle: () => void = () => undefined;
    const dispatch = vi.fn(
      (_action: BlokResolvedAgentCall, _component: unknown, observe?: BlokTaskObserver) =>
        new Promise<void>(resolve => {
          settle = () => {
            observe?.({end: 'done'});
            resolve();
          };
        }),
    );
    const {store} = render('<Button onClick={self.move(to: 1) into move}>Go</Button>');
    act(() => store.getState().setDispatchAction(dispatch));

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button.hasAttribute('data-busy')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');

    fireEvent.click(button);
    expect(dispatch).toHaveBeenCalledTimes(1);

    await act(async () => {
      settle();
    });
    expect(button.hasAttribute('data-busy')).toBe(false);
    fireEvent.click(button);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('is busy while the record its call writes says running', () => {
    const {store} = render('<Button onClick={self.move(to: 1) into move}>Go</Button>', {
      move: {status: 'running', running: true},
    });
    const button = screen.getByRole('button');
    expect(button.hasAttribute('data-busy')).toBe(true);
    act(() => store.getState().setRuntimeValue('move', {status: 'done', running: false}));
    expect(button.hasAttribute('data-busy')).toBe(false);
  });

  it('is not busy when the host follows no task', () => {
    const {store} = render('<Button onClick={self.move(to: 1)}>Go</Button>');
    act(() => store.getState().setDispatchAction(() => undefined));
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button.hasAttribute('data-busy')).toBe(false);
  });

  it('records what the call was made with on its record', () => {
    const {store} = render('<Button onClick={deps.robot.move_to(position: 3) into move}>Go</Button>');
    act(() => store.getState().setDispatchAction(() => new Promise<void>(() => undefined)));
    fireEvent.click(screen.getByRole('button'));
    expect((store.getState().dataModel as {move: {args: unknown; status: string}}).move).toMatchObject({
      status: 'queued',
      args: {position: 3},
    });
  });
});

describe('refetch and effects as a callback', () => {
  it('re-reads a declared query', () => {
    const {store} = render('<Button onClick={queries.positions.refetch()}>Reload</Button>');
    const refetch = vi.fn();
    act(() => store.getState().setRefetchQuery(refetch));
    fireEvent.click(screen.getByRole('button'));
    expect(refetch).toHaveBeenCalledWith('positions');
  });

  it('answers the open ask with task.answer', () => {
    const {store} = render('<Button onClick={task.answer(values: {pick: args.pick})}>Answer</Button>', {args: {pick: 2}});
    const answer = vi.fn();
    act(() => store.getState().setAnswerTask(answer));
    fireEvent.click(screen.getByRole('button'));
    expect(answer).toHaveBeenCalledWith({pick: 2});
  });

  it('copies with ui.copy', () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {value: {writeText}, configurable: true});
    render('<Button onClick={ui.copy(task.id)}>Copy</Button>', {task: {id: 't9'}});
    fireEvent.click(screen.getByRole('button'));
    expect(writeText).toHaveBeenCalledWith('t9');
  });
});
