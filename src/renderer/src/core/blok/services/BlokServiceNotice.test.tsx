// @vitest-environment jsdom
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

const live = vi.fn<(key: string | undefined) => string | null>();
vi.mock('@/core/modules/hooks/useServiceSchemaHash', () => ({useServiceSchemaHash: (key: string | undefined) => live(key)}));

import {BlokServiceNotice} from './BlokServiceNotice';

afterEach(() => {
  cleanup();
  live.mockReset();
});

const MIKRO = {key: 'mikro', version: '8', schemaHash: 'sha256:a'};

describe('BlokServiceNotice', () => {
  it('says when the live schema differs from the frozen one', () => {
    live.mockReturnValue('sha256:b');
    render(<BlokServiceNotice services={[MIKRO]} />);
    expect(screen.getByRole('status').textContent).toMatch(/Written for mikro 8: the connected mikro serves another schema/);
  });

  it('says nothing when it matches, is unknown, or nothing was frozen', () => {
    live.mockReturnValue('sha256:a');
    render(<BlokServiceNotice services={[MIKRO]} />);
    expect(screen.queryByRole('status')).toBeNull();
    cleanup();

    live.mockReturnValue(null);
    render(<BlokServiceNotice services={[MIKRO]} />);
    expect(screen.queryByRole('status')).toBeNull();
    cleanup();

    live.mockReturnValue('sha256:b');
    render(<BlokServiceNotice services={[{key: 'mikro'}]} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(live).toHaveBeenLastCalledWith(undefined);
  });
});
