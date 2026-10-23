// @vitest-environment jsdom
import {act, cleanup, render, waitFor} from '@testing-library/react';
import * as React from 'react';
import {afterEach, describe, expect, it} from 'vitest';

import type {PreparedBlokNode} from '@/core/blok/renderer/runtime';

import {resetBlokTailwind} from './runtimeTailwind';
import {payloadClasses, useBlokTailwind} from './useBlokTailwind';

afterEach(() => {
  cleanup();
  resetBlokTailwind();
});

const node = (id: string, props: {key: string; static_value?: unknown}[]): [string, PreparedBlokNode] => [
  id,
  {id, component: 'div', node: {id, component: 'div', props}},
];

const NODES = new Map([
  node('card', [{key: 'className', static_value: 'grid grid-cols-[3fr_1fr]  gap-7'}]),
  // An overlay's content portals to body: only the payload knows its classes.
  node('sheet', [{key: 'contentClassName', static_value: 'w-[37rem]'}, {key: 'text', static_value: 'flex not a class'}]),
]);

const sheet = () => document.head.querySelector('style[data-blok-tailwind]')?.textContent ?? '';

const Host = ({extra}: {extra?: string}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  useBlokTailwind(NODES, ref);
  return (
    <div ref={ref}>
      <span className={extra} />
    </div>
  );
};

describe('useBlokTailwind', () => {
  it('reads class props off every node, and nothing else', () => {
    expect(payloadClasses(NODES)).toEqual(['gap-7', 'grid', 'grid-cols-[3fr_1fr]', 'w-[37rem]']);
  });

  it("compiles the payload's classes, and a class the blok renders later", async () => {
    const {rerender} = render(<Host />);
    await waitFor(() => expect(sheet()).toContain('37rem'));
    expect(sheet()).toMatch(/grid-template-columns:\s*3fr 1fr/);

    act(() => rerender(<Host extra="p-[13px]" />));
    await waitFor(() => expect(sheet()).toContain('13px'));
  });
});
