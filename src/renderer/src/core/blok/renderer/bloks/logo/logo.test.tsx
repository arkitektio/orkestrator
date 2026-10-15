// @vitest-environment jsdom
import {cleanup} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {defaultBlokCatalog} from '../../catalog';
import {normalizeBlokComponentTree, preflightBlokDocument} from '../../runtime';
import {serializeDrawing} from '@/rekuest/components/logo/logoCache';
import {renderBlokDocument} from '../testing';
import tree from './logo.fixture.json';

/**
 * `logo.fixture.json` is what arkitekt-spec emits for a logo blok written in
 * BSX: a gradient and a clip path referenced by id, every shape, text, and a
 * `foreach` over state drawing one lamp per item.
 */
const DEMO_STATE = {self: {Status: {lamps: [{color: 'lime'}, {color: 'red'}]}}};

afterEach(cleanup);

const roots = () => normalizeBlokComponentTree(tree).roots;

describe('a logo blok from the Python client', () => {
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
        'Rect',
        'SVG',
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
    expect(parsed.querySelectorAll('circle[fill="lime"], circle[fill="red"]')).toHaveLength(2);
  });

  it('draws its state from the state it is given', () => {
    renderBlokDocument(defaultBlokCatalog, roots(), DEMO_STATE);

    const lamps = [...document.querySelectorAll('circle')].filter(circle => circle.getAttribute('cx') === '20');
    expect(lamps.map(lamp => lamp.getAttribute('fill'))).toEqual(['lime', 'red']);
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
        component: 'SVG',
        children: [
          {id: 'ok', component: 'Circle', props: [{key: 'r', static_value: '2'}]},
          {id: 'broken', component: 'Circle', props: [{key: 'r', util_call: {operation: 'no_such_function'}}]},
        ],
      },
    ]);

    const svg = document.querySelector('svg');
    expect(svg?.querySelectorAll('circle')).toHaveLength(1);
    expect(svg?.querySelector('[data-blok-error="broken"] title')?.textContent).toMatch(/r/);
    expect(svg?.querySelector('div')).toBeNull();
  });
});
