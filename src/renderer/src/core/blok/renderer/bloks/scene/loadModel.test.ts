// @vitest-environment jsdom
import {readFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {describe, expect, it} from 'vitest';
import {modelRef, ModelRefused} from '@/core/model/glb';
import {instantiate, loadModel, ownMaterials} from './loadModel';

/**
 * `scope.fixture.glb` is what kulisse writes for `testing/device_scene.urdf`: a
 * microscope with a prismatic XY stage and a continuous turret.
 */
const fixture = async (): Promise<Uint8Array> =>
  new Uint8Array(await readFile(resolve(dirname(fileURLToPath(import.meta.url)), 'scope.fixture.glb')));

describe('loadModel', () => {
  it('decodes a model kulisse wrote and finds every node its joint table names', async () => {
    const bytes = await fixture();
    const ref = await modelRef(bytes);
    const instance = instantiate(await loadModel(ref, async () => bytes));

    expect(instance.report.joints.map(joint => joint.name)).toEqual(['stage_x', 'stage_y', 'turret']);
    for (const joint of instance.report.joints) {
      expect(instance.nodes.get(joint.node), joint.node).toBeInstanceOf(THREE.Object3D);
    }
    // A pivot carries the joint's origin; the link beneath it starts at the pivot.
    expect(instance.nodes.get('stage_x')?.position.toArray()).toEqual([0.02, 0, 0.06]);
    expect(instance.nodes.get('stage_x_carriage')?.parent).toBe(instance.nodes.get('stage_x'));
    expect(instance.nodes.get('laser_out')).toBeDefined();
    expect(instance.rest.get(instance.nodes.get('turret')!)?.parent?.name).toBe('column');
  });

  it('gives each placed copy its own nodes, and a node its own materials on demand', async () => {
    const bytes = await fixture();
    const loaded = await loadModel(await modelRef(bytes), async () => bytes);
    const first = instantiate(loaded);
    const second = instantiate(loaded);
    expect(first.nodes.get('sample')).not.toBe(second.nodes.get('sample'));

    const meshOf = (object: THREE.Object3D): THREE.Mesh => {
      let found: THREE.Mesh | undefined;
      object.traverse(child => {
        if ((child as THREE.Mesh).isMesh) found ??= child as THREE.Mesh;
      });
      return found!;
    };
    const base = meshOf(first.nodes.get('base')!);
    const column = meshOf(first.nodes.get('column')!);
    expect(base.material).toBe(column.material);
    const [tinted] = ownMaterials(first.nodes.get('base')!);
    expect(tinted).not.toBe(column.material);
    expect(ownMaterials(first.nodes.get('base')!)[0]).toBe(tinted);
  });

  it('refuses bytes that are not the model the reference names, and tries again afterwards', async () => {
    const bytes = await fixture();
    const other = 'sha256:' + '0'.repeat(64);
    await expect(loadModel(other, async () => bytes)).rejects.toBeInstanceOf(ModelRefused);
    let calls = 0;
    await expect(
      loadModel(other, async () => {
        calls += 1;
        return bytes;
      }),
    ).rejects.toMatchObject({code: 'hash_mismatch'});
    expect(calls).toBe(1);
  });
});
