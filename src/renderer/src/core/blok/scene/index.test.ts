import {describe, expect, it} from 'vitest';
import {threeScene} from '@arkitektio/bsx/scene';
import {defaultBlokCatalog} from '../catalog';
import {SceneRender} from './Scene';
import {runRenders} from './Space';
import {withAppScene} from './index';

describe('the app scene', () => {
  it('draws the surface itself and leaves the rest to the package', () => {
    const before = new Map(threeScene.components.map(component => [component.name, component.render]));
    const after = new Map(withAppScene(threeScene).components.map(component => [component.name, component.render]));
    expect(after.get('Scene')).toBe(SceneRender);
    expect(after.get('Space')).toBe(runRenders.Space);
    expect(after.get('Placed')).toBe(runRenders.Placed);
    expect(after.get('Route')).toBe(runRenders.Route);
    expect(after.get('Model')).toBe(before.get('Model'));
    expect([...after.keys()]).toEqual([...before.keys()]);
  });

  it('is what the app catalog renders', () => {
    expect(defaultBlokCatalog.components.get('Scene')?.render).toBe(SceneRender);
    expect(defaultBlokCatalog.components.get('Space')?.render).toBe(runRenders.Space);
  });
});
