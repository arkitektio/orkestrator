// @vitest-environment jsdom
import {cleanup} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {defaultBlokCatalog} from '../../catalog';
import {normalizeBlokComponentTree, preflightBlokDocument} from '../../runtime';
import {serializeDrawing} from '@/core/blok/logo/logoCache';
import {parseBsx} from '../../../bsx/parse';
import {printBsx} from '../../../bsx/print';
import type {BlokComponentNode} from '../../runtime';
import {renderBlokDocument} from '../testing';
import tree from './logo.fixture.json';

/**
 * `logo.fixture.json` is a v2 logo blok as it is stored: a gradient and a clip
 * path referenced by id, every shape, text, and a keyed `foreach` over state
 * drawing one lamp per item, all painted with the viewer's pens.
 */
/** `self` reads `deps.self`: the agent the logo belongs to. */
const DEMO_STATE = {deps: {self: {status: {lamps: [{name: 'a', pen: 'success'}, {name: 'b', pen: 'warning'}]}}}};

afterEach(cleanup);

const roots = () => normalizeBlokComponentTree(tree).roots;

describe('a v2 logo blok', () => {
  it('reads back from its BSX unchanged', () => {
    const [root] = tree as BlokComponentNode[];
    expect(parseBsx(printBsx(root)).tree).toEqual(root);
  });

  it('is a tree this catalog knows', () => {
    const preflight = preflightBlokDocument(roots(), defaultBlokCatalog);
    expect(preflight.errors).toEqual([]);
    expect(preflight.invalidNodes.size).toBe(0);
    const used = new Set([...preflight.nodes.values()].map(node => node.component));
    expect([...used].sort()).toEqual(
      [
        'Circle',
        'ClipPath',
        'Defs',
        'Ellipse',
        'G',
        'Line',
        'LinearGradient',
        'Path',
        'Polygon',
        'Polyline',
        'AgentLogo',
        'Rect',
        'Stop',
        'SvgText',
        'foreach',
      ].sort(),
    );
  });

  it('draws one svg whose references find their gradient and clip path', () => {
    renderBlokDocument(defaultBlokCatalog, roots(), DEMO_STATE);

    const svgs = document.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
    const svg = svgs[0];
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.querySelector('title')?.textContent).toBe('Microscope');

    const gradient = svg.querySelector('linearGradient');
    const clip = svg.querySelector('clipPath');
    expect(gradient?.id).toMatch(/-sky$/);
    expect(clip?.id).toMatch(/-round$/);
    expect(svg.querySelector('rect')?.getAttribute('fill')).toBe(`url(#${gradient?.id})`);
    expect(svg.querySelector('g')?.getAttribute('clip-path')).toBe(`url(#${clip?.id})`);
    expect(gradient?.querySelectorAll('stop')).toHaveLength(2);

    expect(svg.querySelector('path')?.getAttribute('d')).toBe('M6 18 L12 4 L18 18 Z');
    expect(svg.querySelector('path')?.getAttribute('stroke-width')).toBe('1.5');
    expect(svg.querySelector('text')?.textContent).toBe('A');
    expect(svg.querySelector('text')?.getAttribute('text-anchor')).toBe('middle');
  });

  it('serializes to an svg an image can show', () => {
    renderBlokDocument(defaultBlokCatalog, roots(), DEMO_STATE);

    const svg = serializeDrawing(document.body) ?? '';
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(parsed.querySelector('parsererror')).toBeNull();
    expect(parsed.documentElement.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(parsed.querySelectorAll('circle[fill="var(--logo-success)"], circle[fill="var(--logo-warning)"]')).toHaveLength(2);
  });

  it('draws its state from the state it is given', () => {
    renderBlokDocument(defaultBlokCatalog, roots(), DEMO_STATE);

    const lamps = [...document.querySelectorAll('circle')].filter(circle => circle.getAttribute('cx') === '20');
    expect(lamps.map(lamp => lamp.getAttribute('fill'))).toEqual(['var(--logo-success)', 'var(--logo-warning)']);
  });

  it('gives two drawings of one blok ids of their own', () => {
    renderBlokDocument(defaultBlokCatalog, roots(), DEMO_STATE);
    renderBlokDocument(defaultBlokCatalog, roots(), DEMO_STATE);

    const ids = [...document.querySelectorAll('linearGradient')].map(gradient => gradient.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('marks a node that fails inside the svg instead of drawing an html card there', () => {
    renderBlokDocument(defaultBlokCatalog, [
      {
        id: 'logo',
        component: 'AgentLogo',
        children: [
          {id: 'ok', component: 'Circle', props: [{key: 'r', static_value: '2'}]},
          {id: 'broken', component: 'Circle', props: [{key: 'r', util_call: {operation: 'no_such_function'}}]},
        ],
      },
    ]);

    const svg = document.querySelector('svg');
    expect(svg?.querySelectorAll('circle')).toHaveLength(1);
    expect(svg?.querySelector('[data-blok-error="broken"] title')?.textContent).toMatch(/no_such_function/);
    expect(svg?.querySelector('div')).toBeNull();
  });
});

const circle = (id: string, props: Record<string, string>) => ({
  id,
  component: 'Circle',
  props: [{key: 'r', static_value: '2'}, ...Object.entries(props).map(([key, value]) => ({key, static_value: value}))],
});

describe('paint', () => {
  it('draws the pens from the brand and the status roles, and anything else in ink', () => {
    const shapes = [
      circle('token', {fill: 'brand-soft', stroke: 'ink'}),
      circle('status', {fill: 'success', stroke: 'info'}),
      circle('colour', {fill: '#fbbf24'}),
      circle('empty', {fill: 'none'}),
    ];
    renderBlokDocument(defaultBlokCatalog, [{id: 'logo', component: 'AgentLogo', children: shapes}]);

    const svg = document.querySelector('svg')!;
    const fills = [...svg.querySelectorAll('circle')].map(shape => shape.getAttribute('fill'));
    expect(fills).toEqual(['var(--logo-brand-soft)', 'var(--logo-success)', 'var(--logo-ink)', 'none']);
    expect(svg.querySelectorAll('circle')[1].getAttribute('stroke')).toBe('var(--logo-info)');
    expect(svg.hasAttribute('data-logo-palette')).toBe(true);
  });

  it('draws the spectral pens, not their soft roles', () => {
    const shapes = [
      circle('green', {fill: 'spectrum-green', stroke: 'spectrum-violet'}),
      circle('soft', {fill: 'spectrum-green-soft'}),
    ];
    renderBlokDocument(defaultBlokCatalog, [{id: 'logo', component: 'AgentLogo', children: shapes}]);

    const [green, soft] = [...document.querySelectorAll('svg circle')];
    expect(green.getAttribute('fill')).toBe('var(--logo-spectrum-green)');
    expect(green.getAttribute('stroke')).toBe('var(--logo-spectrum-violet)');
    expect(soft.getAttribute('fill')).toBe('var(--logo-ink)');
  });

  it('keeps an action logo a tree this catalog knows, its shapes placed under it', () => {
    const preflight = preflightBlokDocument(
      normalizeBlokComponentTree([{id: 'action', component: 'ActionLogo', children: [circle('c', {fill: 'brand'})]}]).roots,
      defaultBlokCatalog,
    );
    expect(preflight.errors).toEqual([]);
  });
});

describe('animate', () => {
  it('marks a shape with the animation it plays and its delay, and a draw with a unit length', () => {
    renderBlokDocument(defaultBlokCatalog, [
      {
        id: 'action',
        component: 'ActionLogo',
        children: [
          circle('pulse', {animate: 'pulse', animateDelay: '0.3'}),
          {id: 'trace', component: 'Path', props: [{key: 'd', static_value: 'M0 0h4'}, {key: 'animate', static_value: 'draw'}]},
          circle('still', {}),
        ],
      },
    ]);

    const [pulse, still] = [...document.querySelectorAll('circle')];
    expect(pulse.getAttribute('class')).toBe('logo-anim logo-anim-pulse');
    expect(pulse.style.animationDelay).toBe('0.3s');
    expect(still.getAttribute('class')).toBeNull();
    const trace = document.querySelector('path');
    expect(trace?.getAttribute('class')).toBe('logo-anim logo-anim-draw');
    expect(trace?.getAttribute('pathLength')).toBe('1');
  });
});

