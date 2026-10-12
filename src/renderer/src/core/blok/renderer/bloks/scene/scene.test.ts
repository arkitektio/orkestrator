// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {defaultBlokCatalog} from '../../catalog';
import {normalizeBlokComponentTree, preflightBlokDocument} from '../../runtime';
import tree from './scene.fixture.json';

/**
 * `scene.fixture.json` is what arkitekt-spec emits for a scene blok written in
 * BSX (a Model with motion, visibility, a click target and a popout; a Robot
 * with a joint handler, a glow and an attachment), as the server stores it.
 */
describe('a scene blok from the Python client', () => {
  it('is a tree this catalog knows, to any depth', () => {
    const {roots, truncatedIds} = normalizeBlokComponentTree(tree);
    expect(truncatedIds).toEqual([]);

    const preflight = preflightBlokDocument(roots, defaultBlokCatalog);
    expect(preflight.errors).toEqual([]);
    expect(preflight.invalidNodes.size).toBe(0);

    const used = new Set([...preflight.nodes.values()].map(node => node.component));
    expect([...used].sort()).toEqual(
      ['Attach', 'Badge', 'Card', 'CardContent', 'Glow', 'Model', 'Move', 'OnClick', 'Popout', 'Robot', 'Scene', 'Show'].sort(),
    );
  });

  it('carries the handler arguments as event paths', () => {
    const robot = (tree[0].children ?? []).find(node => node.component === 'Robot');
    const handler = robot?.props?.find(prop => prop.key === 'onJointChange');
    expect(handler?.agent_call?.arguments?.map(argument => argument.value_path)).toEqual([
      '$event.name',
      '$event.value',
    ]);
  });
});
