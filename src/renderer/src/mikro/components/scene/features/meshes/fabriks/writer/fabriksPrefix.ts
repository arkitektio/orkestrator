import { FABRIKS_SPEC_VERSION, MANIFEST_NAME } from "../fabriksManifest";
import { bakeFabriksCollection, type BakedCollection, type BakeMesh, type BakeOptions } from "./fabriksBake";
import { writeCellCatalog, writeGeometryPart, writeObjectCatalog } from "./parquetWrite";

/**
 * A complete fabriks PREFIX in memory: every file the manifest names, and the
 * manifest itself — built last, from the actual encoded byte lengths, because
 * `files[*].bytes` is how a reader finds a Parquet footer over a get/get-range
 * store (`fabriksManifest.ts`).
 *
 * `files` is insertion-ordered with the manifest LAST, and the uploader
 * respects that order: a prefix without a manifest is an interrupted write by
 * definition, so the manifest must land after everything it names.
 */

export const CELL_CATALOG_PATH = "catalog/cells.parquet";
export const OBJECT_CATALOG_PATH = "catalog/objects.parquet";

export type FabriksPrefix = {
  files: Map<string, Uint8Array>;
  manifest: Record<string, unknown>;
  baked: BakedCollection;
  totalBytes: number;
};

export function buildFabriksManifest(
  baked: BakedCollection,
  sizes: { cells: number; objects: number; parts: { path: string; bytes: number; rowGroups: number }[] },
): Record<string, unknown> {
  return {
    specVersion: FABRIKS_SPEC_VERSION,
    grid: { cellSize: baked.grid.cellSize, levels: baked.grid.levels, sortKey: baked.grid.sortKey },
    encoding: { ...baked.encoding },
    counts: { objects: baked.objects.length, cellsPerLevel: [baked.cells.length] },
    files: {
      cells: { path: CELL_CATALOG_PATH, bytes: sizes.cells },
      objects: { path: OBJECT_CATALOG_PATH, bytes: sizes.objects },
      levels: { "0": sizes.parts },
    },
  };
}

/** Bake and encode. The manifest is the last entry of `files`. */
export function buildFabriksPrefix(meshes: readonly BakeMesh[], options?: BakeOptions): FabriksPrefix {
  const baked = bakeFabriksCollection(meshes, options);
  const files = new Map<string, Uint8Array>();
  const parts = baked.parts.map((part) => {
    const bytes = writeGeometryPart(part);
    files.set(part.path, bytes);
    return { path: part.path, bytes: bytes.byteLength, rowGroups: part.rowGroupSizes.length };
  });
  const cells = writeCellCatalog(baked.cells);
  files.set(CELL_CATALOG_PATH, cells);
  const objects = writeObjectCatalog(baked.objects);
  files.set(OBJECT_CATALOG_PATH, objects);
  const manifest = buildFabriksManifest(baked, { cells: cells.byteLength, objects: objects.byteLength, parts });
  files.set(MANIFEST_NAME, new TextEncoder().encode(JSON.stringify(manifest, null, 2)));
  let totalBytes = 0;
  for (const bytes of files.values()) totalBytes += bytes.byteLength;
  return { files, manifest, baked, totalBytes };
}
