import {describe, expect, it} from 'vitest';
import {createSlotQueue} from './queue';

const now = () => Promise.resolve();
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('the preview slot queue', () => {
  it('grants one slot at a time, in order, and hands it on when released', async () => {
    const queue = createSlotQueue(1, now);
    const granted: string[] = [];
    const releaseA = queue.acquire(() => granted.push('a'));
    queue.acquire(() => granted.push('b'));
    await flush();
    expect(granted).toEqual(['a']);

    releaseA();
    await flush();
    expect(granted).toEqual(['a', 'b']);
  });

  it('skips one that left while waiting, or before its idle period came', async () => {
    const queue = createSlotQueue(1, now);
    const granted: string[] = [];
    const releaseA = queue.acquire(() => granted.push('a'));
    const cancelB = queue.acquire(() => granted.push('b'));
    queue.acquire(() => granted.push('c'));
    cancelB();
    await flush();
    releaseA();
    await flush();
    expect(granted).toEqual(['a', 'c']);

    const early = createSlotQueue(1, now);
    const order: string[] = [];
    early.acquire(() => order.push('x'))(); // released before its idle period
    early.acquire(() => order.push('y'));
    await flush();
    expect(order).toEqual(['y']);
  });
});
