import { describe, expect, it } from "vitest";
import { parseFabriksManifest, FabriksFormatError } from "../../features/meshes/fabriks/fabriksManifest";
import {
  parseKonnektionManifest,
  KonnektionFormatError,
} from "../../features/network/konnektion/konnektionManifest";

/**
 * The shared manifest skeleton refuses through a caller-supplied factory, so
 * the thing worth pinning is that a refusal raised inside shared code still
 * arrives as the FORMAT's own error — a konnektion prefix must never report a
 * `FabriksFormatError`. Nothing else would notice if the factory were dropped:
 * both classes extend `Error`, so a `toThrow()` alone would still pass.
 */

const fabriksBase = {
  specVersion: "1",
  grid: { cellSize: [64, 64, 64], levels: 3 },
  encoding: {
    positions: "UINT16_QUANTIZED_PER_CELL",
    indices: "UINT32",
    codec: "NONE",
    compression: "NONE",
    boundary: "LOCKED",
    decimation: "HALF",
  },
  files: { cells: "catalog/cells.parquet", objects: "catalog/objects.parquet" },
};

describe("shared LOD manifest refusals keep their format's identity", () => {
  it("fabriks: a bad file entry throws FabriksFormatError", () => {
    const raw = { ...fabriksBase, files: { ...fabriksBase.files, cells: 42, levels: { 0: ["a"] } } };
    expect(() => parseFabriksManifest(raw)).toThrow(FabriksFormatError);
    expect(() => parseFabriksManifest(raw)).not.toThrow(KonnektionFormatError);
  });

  it("fabriks: a missing `files.levels` throws, and says why it cannot list", () => {
    expect(() => parseFabriksManifest({ ...fabriksBase, files: { ...fabriksBase.files } })).toThrow(
      /this reader cannot list/,
    );
  });

  it("fabriks: a non-integer level key is refused by name", () => {
    const raw = {
      ...fabriksBase,
      files: { ...fabriksBase.files, levels: { nope: ["part.parquet"] } },
    };
    expect(() => parseFabriksManifest(raw)).toThrow(FabriksFormatError);
    expect(() => parseFabriksManifest(raw)).toThrow(/keyed by level number/);
  });

  it("konnektion: a bad file entry throws KonnektionFormatError, not the fabriks one", () => {
    // Whatever else this manifest lacks, the refusal must be konnektion's.
    expect(() => parseKonnektionManifest({ files: { levels: { 0: [7] } } })).toThrow(
      KonnektionFormatError,
    );
    expect(() => parseKonnektionManifest({ files: { levels: { 0: [7] } } })).not.toThrow(
      FabriksFormatError,
    );
  });
});
