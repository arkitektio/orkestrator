import * as THREE from "three";

import { buildFabriksCellIndex, cellsForObject, fabriksCellKey, type FabriksObjectEntry } from "../../meshes/fabriks/fabriksCatalogs";
import type { FabriksCollection } from "../../meshes/fabriks/fabriksCollection";
import type { DecodedCell, MeshoptDecoderLike } from "../../meshes/fabriks/fabriksDecode";
import { groupByRowGroup } from "../../meshes/fabriks/fabriksPlanner";
import type { DesignGeometry } from "../store/meshDesignStore";
import { weldIndexed } from "../ops/weld";

/**
 * Pull objects OUT of a fabriks collection as editable geometry — the
 * edit-existing path. Fabriks is append-hostile (row groups, manifest byte
 * lengths, ordinals, LOD ancestors), so editing never touches the prefix:
 * an object is extracted at its finest level, edited as a plain mesh, and
 * committed as a NEW collection derived from this one.
 *
 * Per object: every level-0 cell the object catalog names → fetch by row
 * group → keep the vertices carrying the object's ordinal, remap the
 * triangles → concatenate the cells → weld the LOCKED-boundary duplicates
 * back together → transform into scene world space.
 */

export type LoadedObject = { objectId: number; entry: FabriksObjectEntry; geometry: DesignGeometry };

export async function loadObjectsFromCollection(
  collection: FabriksCollection,
  voxelToWorld: THREE.Matrix4,
  options: {
    /** Objects to load; every object in the catalog when omitted. */
    objectIds?: readonly number[];
    decoder?: MeshoptDecoderLike | null;
    /** Refuse above this many indices across the request (a segmentation is not a design). */
    maxIndices?: number;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<LoadedObject[]> {
  const catalog = await collection.loadObjectCatalog();
  const wanted = (options.objectIds ?? [...catalog.keys()]).map((id) => {
    const entry = catalog.get(id);
    if (!entry) throw new Error(`Object ${id} is not in this collection's catalog.`);
    return entry;
  });
  const totalIndices = wanted.reduce((sum, entry) => sum + entry.indexCount, 0);
  if (options.maxIndices !== undefined && totalIndices > options.maxIndices) {
    throw new Error(
      `Loading ${wanted.length} object(s) means ${totalIndices.toLocaleString()} indices, over the ${options.maxIndices.toLocaleString()} the designer accepts.`,
    );
  }

  const rows = await collection.loadCellCatalog();
  const index = buildFabriksCellIndex(rows, collection.manifest, new THREE.Matrix4());
  const finest = Math.min(...index.levels);

  // One fetch per row group across every wanted object, decoded once.
  const neededKeys = new Set<string>();
  for (const entry of wanted) {
    for (const ref of cellsForObject(entry, finest)) neededKeys.add(fabriksCellKey(ref.level, ref.cell));
  }
  const cells = [...neededKeys].map((key) => index.byKey.get(key)).filter((cell) => cell !== undefined);
  const decoded = new Map<string, DecodedCell>();
  const groups = groupByRowGroup(cells);
  let done = 0;
  for (const group of groups) {
    for (const [key, cell] of await collection.readFetchGroup(group, options.decoder ?? null)) decoded.set(key, cell);
    options.onProgress?.(++done, groups.length);
  }

  const out: LoadedObject[] = [];
  for (const entry of wanted) {
    const positions: number[] = [];
    const indices: number[] = [];
    for (const ref of cellsForObject(entry, finest)) {
      const cell = decoded.get(fabriksCellKey(ref.level, ref.cell));
      if (!cell) continue;
      const base = positions.length / 3;
      const remap = new Int32Array(cell.positions.length / 3).fill(-1);
      let next = 0;
      for (let v = 0; v < remap.length; v++) {
        if (cell.objectOrdinals[v] !== entry.ordinal) continue;
        remap[v] = next++;
        positions.push(cell.positions[v * 3], cell.positions[v * 3 + 1], cell.positions[v * 3 + 2]);
      }
      for (let t = 0; t + 2 < cell.indices.length; t += 3) {
        const a = remap[cell.indices[t]];
        const b = remap[cell.indices[t + 1]];
        const c = remap[cell.indices[t + 2]];
        if (a === -1 || b === -1 || c === -1) continue;
        indices.push(base + a, base + b, base + c);
      }
    }
    const welded = weldIndexed({ positions: Float32Array.from(positions), indices: Uint32Array.from(indices) });
    const world = new Float32Array(welded.positions.length);
    const p = new THREE.Vector3();
    for (let v = 0; v < welded.positions.length; v += 3) {
      p.set(welded.positions[v], welded.positions[v + 1], welded.positions[v + 2]).applyMatrix4(voxelToWorld);
      world[v] = p.x;
      world[v + 1] = p.y;
      world[v + 2] = p.z;
    }
    out.push({ objectId: entry.objectId, entry, geometry: { positions: world, indices: welded.indices } });
  }
  return out;
}
