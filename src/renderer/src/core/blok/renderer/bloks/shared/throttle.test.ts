import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {throttle} from './throttle';

describe('throttle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sends the first value at once and the latest held value when the interval ends', () => {
    const sent: number[] = [];
    const send = throttle((value: number) => sent.push(value), 150);
    [1, 2, 3, 4].forEach(send);
    expect(sent).toEqual([1]);
    vi.advanceTimersByTime(150);
    expect(sent).toEqual([1, 4]);
  });

  it('keeps one call per interval through a long drag', () => {
    const sent: number[] = [];
    const send = throttle((value: number) => sent.push(value), 150);
    for (let tick = 0; tick < 60; tick += 1) {
      send(tick);
      vi.advanceTimersByTime(16);
    }
    vi.advanceTimersByTime(150);
    expect(sent.length).toBeLessThanOrEqual(8);
    expect(sent.at(-1)).toBe(59);
  });

  it('sends nothing more after the interval when nothing was held', () => {
    const sent: number[] = [];
    const send = throttle((value: number) => sent.push(value), 150);
    send(1);
    vi.advanceTimersByTime(1000);
    send(2);
    expect(sent).toEqual([1, 2]);
  });

  it('flushes a held value now, and cancel drops it', () => {
    const sent: number[] = [];
    const send = throttle((value: number) => sent.push(value), 150);
    send(1);
    send(2);
    send.flush();
    expect(sent).toEqual([1, 2]);
    send(3);
    send.cancel();
    vi.advanceTimersByTime(1000);
    expect(sent).toEqual([1, 2]);
  });
});
