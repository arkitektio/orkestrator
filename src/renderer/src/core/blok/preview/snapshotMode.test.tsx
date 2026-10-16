// @vitest-environment jsdom
import * as React from 'react';
import {act, render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {BlokReadyProvider, useBlokReady, type BlokReadiness} from './snapshotMode';

const Part = ({readiness}: {readiness: BlokReadiness}) => {
  useBlokReady(readiness, 'the model failed');
  return null;
};

describe('the ready signal', () => {
  it('holds the capture while pending, lets it go when ready, and gives up on failure', () => {
    const release = vi.fn();
    const signal = {hold: vi.fn(() => release), fail: vi.fn()};
    const view = render(
      <BlokReadyProvider value={signal}>
        <Part readiness="pending" />
      </BlokReadyProvider>,
    );
    expect(signal.hold).toHaveBeenCalledTimes(1);

    act(() =>
      view.rerender(
        <BlokReadyProvider value={signal}>
          <Part readiness="ready" />
        </BlokReadyProvider>,
      ),
    );
    expect(release).toHaveBeenCalledTimes(1);

    act(() =>
      view.rerender(
        <BlokReadyProvider value={signal}>
          <Part readiness="failed" />
        </BlokReadyProvider>,
      ),
    );
    expect(signal.fail).toHaveBeenCalledWith('the model failed');
  });

  it('does nothing outside a preview drawing', () => {
    expect(() => render(<Part readiness="failed" />)).not.toThrow();
  });
});
