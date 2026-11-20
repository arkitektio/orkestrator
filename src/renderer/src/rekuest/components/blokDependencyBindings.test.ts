import {describe, expect, it} from 'vitest';
import {parseBsx} from '@arkitektio/bsx/bsx/parse';
import {declaredDependencies, dependencyUse} from './blokDependencyBindings';

const SOURCE = `
<Blok kind="agent" context="panel">
  <dependencies key="cells" like="self.analyze" />
  <Card>
    <Text>{cells.microscope.stage.position}</Text>
    <Button onClick={cells.camera.snap()}>Snap</Button>
    <foreach items={cells.options.microscope} let="o" key={o.id}>
      <Button onClick={cells.pick(microscope: o.id)}>{o.name}</Button>
    </foreach>
    <deppicker key="cells.camera" />
    <Button onClick={self.analyze() with cells into run}>Go</Button>
  </Card>
</Blok>`;

describe('the dependencies a blok declares', () => {
  it('are read off its stored tree: what it reads, lists and places a picker for', () => {
    const roots = [parseBsx(SOURCE).tree];

    expect(declaredDependencies(roots)).toEqual([{key: 'cells', action: 'analyze'}]);
    const use = dependencyUse(roots, 'cells');
    expect([...use.read].sort()).toEqual(['camera', 'microscope']);
    expect([...use.listed]).toEqual(['microscope']);
    expect([...use.placed]).toEqual(['camera']);
    expect(use.rest).toBe(false);
  });
});
