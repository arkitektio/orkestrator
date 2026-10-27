// @vitest-environment jsdom
import {act, cleanup} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {defaultBlokCatalog} from '../catalog';
import {renderBsx} from './testing';

/**
 * `<Time value relative? format?>` (ui@1): a moment, absolute or relative.
 * Relative time ticks inside the component, against the wall clock live and
 * against `then` while travelling; a blok never reads the clock itself.
 */

const render = (source: string, state?: unknown, options?: Parameters<typeof renderBsx>[3]) =>
  renderBsx(defaultBlokCatalog, source, state, options);

const NOW = new Date('2026-10-25T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']});
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const timeElement = (): HTMLTimeElement => {
  const element = document.querySelector('time');
  if (!element) throw new Error('no <time> rendered');
  return element;
};

describe('<Time>', () => {
  it('shows a moment absolute, as fmt.datetime writes it', () => {
    render('<Time value={args.at} format="iso" />', {args: {at: '2026-10-25T09:30:00Z'}});
    expect(timeElement().textContent).toBe('2026-10-25T09:30:00.000Z');
    expect(timeElement().getAttribute('dateTime')).toBe('2026-10-25T09:30:00Z');
  });

  it('renders nothing for no moment', () => {
    render('<Card><Time value={args.at} relative /></Card>', {args: {at: null}});
    expect(document.querySelector('time')).toBeNull();
  });

  it('ticks relative time by itself, live', () => {
    render('<Time value={args.at} relative />', {args: {at: '2026-10-25T11:59:50Z'}});
    expect(timeElement().textContent).toBe('10 seconds ago');
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(timeElement().textContent).toBe('15 seconds ago');
    act(() => {
      vi.advanceTimersByTime(3_600_000);
    });
    expect(timeElement().textContent).toBe('1 hour ago');
  });

  it('measures relative time from then while travelling, and does not tick', () => {
    render('<Time value={args.at} relative />', {args: {at: '2026-10-20T12:00:00Z'}}, {travelAt: '2026-10-20T15:00:00Z'});
    expect(timeElement().textContent).toBe('3 hours ago');
    act(() => {
      vi.advanceTimersByTime(3_600_000);
    });
    expect(timeElement().textContent).toBe('3 hours ago');
  });

  it('shows a moment ahead as a countdown', () => {
    render('<Time value={args.at} relative />', {args: {at: '2026-10-25T12:05:00Z'}});
    expect(timeElement().textContent).toBe('in 5 minutes');
  });

  it('sets the language data attributes and its className', () => {
    render('<Time value={args.at} className="text-muted-foreground" />', {args: {at: '2026-10-25T09:30:00Z'}}, {statuses: {args: {status: 'stale'}}});
    expect(timeElement().className).toContain('text-muted-foreground');
    expect(timeElement().hasAttribute('data-stale')).toBe(true);
    expect(timeElement().hasAttribute('data-state')).toBe(false);
  });
});
