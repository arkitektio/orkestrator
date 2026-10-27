// @vitest-environment jsdom
import {act, cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {parseBsx} from '../bsx/parse';
import BlokRenderer from './BlokRenderer';
import {DEPS_UNBOUND, statusAtPath, unboundDependencyStatuses} from './runtime';

/**
 * A dependency bound to no agent reads as failed with the code `deps.unbound`
 * (vocabulary `async.propagation`), never as ready with null; its tasks and
 * assets too, and a call to it renders disabled.
 */

afterEach(cleanup);

const tree = (source: string) => [parseBsx(source).tree];

describe('an unbound dependency', () => {
  it('reads as failed, its tasks and assets too', () => {
    const statuses = unboundDependencyStatuses(['robot']);
    for (const path of ['deps.robot', 'deps.robot.arm.mode', 'deps.robot.tasks.move', 'deps.robot.assets.urdf']) {
      expect(statusAtPath(statuses, path)).toMatchObject({status: 'failed', code: DEPS_UNBOUND});
    }
    expect(statusAtPath(statuses, 'deps.stage.arm').status).toBe('ready');
  });

  it('binds its error, with the code, in an <error> slot', () => {
    render(
      <BlokRenderer
        uiComponents={tree(
          '<suspense><error><Text>{error.code}</Text></error><Text>{deps.robot.arm.mode}</Text></suspense>',
        )}
        unboundDependencies={['robot']}
      />,
    );
    expect(screen.queryByText(DEPS_UNBOUND)).not.toBeNull();
  });

  it('keeps the code through a template and a task record read', () => {
    render(
      <BlokRenderer
        uiComponents={tree(
          '<suspense><error><Text>code: {error.code}</Text></error><Text>Mode: {deps.robot.arm.mode}, {deps.robot.tasks.move.status}</Text></suspense>',
        )}
        unboundDependencies={['robot']}
      />,
    );
    expect(screen.queryByText(`code: ${DEPS_UNBOUND}`)).not.toBeNull();
  });

  it('shows an inline error without a boundary, and reads its agent again once bound', () => {
    const source = '<Card><Text>{deps.robot.arm.mode}</Text></Card>';
    const {rerender} = render(
      <BlokRenderer uiComponents={tree(source)} initialState={{deps: {robot: {arm: {mode: 'idle'}}}}} unboundDependencies={['robot']} />,
    );
    expect(screen.queryByText('idle')).toBeNull();
    expect(document.body.textContent).toContain('bound to no agent');
    act(() => {
      rerender(<BlokRenderer uiComponents={tree(source)} initialState={{deps: {robot: {arm: {mode: 'idle'}}}}} unboundDependencies={[]} />);
    });
    expect(screen.queryByText('idle')).not.toBeNull();
  });

  it('renders a call to it disabled', () => {
    render(
      <BlokRenderer
        uiComponents={tree('<Button label="Go" onClick={deps.robot.go()} />')}
        unboundDependencies={['robot']}
        unavailableDependencies={new Map([['robot', 'No agent is bound to "robot", so this does nothing']])}
      />,
    );
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
