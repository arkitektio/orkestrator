import { describe, expect, it } from "vitest";
import {
  atlasBytesPerVoxel,
  atlasKindForDtype,
  atlasKindForGeometry,
} from "./atlasFormat";
import type { LayerLevelGeometry } from "../../../platform/coords/levelGeometry";

/**
 * The atlas format MUST match the codec worker's default-fidelity promotion
 * (`lib/zarr/runner/codec-worker.ts`): only unsigned 8-bit stays a Uint8Array
 * (R8); everything else is promoted to Float32Array (R32F).
 */
describe("atlasKindForDtype", () => {
  it("maps unsigned 8-bit to R8", () => {
    expect(atlasKindForDtype("uint8")).toBe("r8");
    expect(atlasKindForDtype("|u1")).toBe("r8");
    expect(atlasKindForDtype("uint8clamped")).toBe("r8");
  });

  it("maps every non-uint8 dtype to R32F (matches float32 promotion)", () => {
    for (const dtype of ["float32", "float64", "uint16", "uint32", "int16", "int32"]) {
      expect(atlasKindForDtype(dtype)).toBe("r32f");
    }
  });

  it("regression: int8 is R32F, not R8 (worker promotes it to a signed Float32Array)", () => {
    // The old `includes("8")` test wrongly routed int8 into a Uint8 R8 atlas,
    // wrapping/truncating its negative values.
    expect(atlasKindForDtype("int8")).toBe("r32f");
    expect(atlasKindForDtype("|i1")).toBe("r32f");
  });
});

describe("atlasKindForGeometry (planner ↔ pool slot-byte agreement)", () => {
  const geo = (dtype: string, phasor: boolean): LayerLevelGeometry =>
    ({
      phasorBins: phasor ? 16 : 0,
      slabs: phasor ? [{ kind: "phasor" }] : [{ kind: "channel" }],
      levels: [{ dtype }],
    }) as unknown as LayerLevelGeometry;

  it("keys off the base dtype for plain layers — uint16 intensities take R16F", () => {
    expect(atlasKindForGeometry(geo("uint8", false))).toBe("r8");
    // Roadmap R3: unsigned-16 intensity data stores raw/65535 half floats.
    expect(atlasKindForGeometry(geo("uint16", false))).toBe("r16f");
    expect(atlasKindForGeometry(geo("float32", false))).toBe("r32f");
  });

  it("EXACT-value (label) geometries never take R16F — ids above 2048 would corrupt", () => {
    const labelGeo = {
      ...geo("uint16", false),
      exactValues: true,
    } as unknown as LayerLevelGeometry;
    expect(atlasKindForGeometry(labelGeo)).toBe("r32f");
  });

  it("r16f is 2 bytes per voxel (planner and pool must agree)", () => {
    expect(atlasBytesPerVoxel("r16f")).toBe(2);
  });

  it("regression: a uint8 PHASOR layer is r32f — the planner sizing it at " +
    "1 B/voxel requested ~4× the slots the pool allocated", () => {
    expect(atlasKindForGeometry(geo("uint8", true))).toBe("r32f");
    expect(atlasBytesPerVoxel("r32f")).toBe(4);
    expect(atlasBytesPerVoxel("r8")).toBe(1);
  });
});

describe("rgba8 atlases (3/4-channel uint8 pools)", () => {
  const rgbGeo = (dtype: string, slabs: number, exact = false): LayerLevelGeometry =>
    ({
      phasorBins: 0,
      slabs: Array.from({ length: slabs }, (_, channel) => ({ kind: "channel", channel })),
      channelCount: slabs,
      channelSlabCount: slabs,
      exactValues: exact,
      levels: [{ dtype }],
    }) as unknown as LayerLevelGeometry;

  it("picks rgba8 for 3- and 4-channel uint8 intensity geometries only", async () => {
    const { atlasChannelsPerTexel, atlasSlotBytes, atlasSlotDepth } = await import("./atlasFormat");
    expect(atlasKindForGeometry(rgbGeo("uint8", 3))).toBe("rgba8");
    expect(atlasKindForGeometry(rgbGeo("uint8", 4))).toBe("rgba8");
    expect(atlasKindForGeometry(rgbGeo("uint8", 1))).toBe("r8");
    expect(atlasKindForGeometry(rgbGeo("uint8", 2))).toBe("r8"); // would double bytes
    expect(atlasKindForGeometry(rgbGeo("uint8", 5))).toBe("r8");
    expect(atlasKindForGeometry(rgbGeo("uint16", 3))).toBe("r16f");
    expect(atlasKindForGeometry(rgbGeo("uint8", 3, true))).toBe("r8"); // labels
    expect(atlasChannelsPerTexel("rgba8")).toBe(4);
    expect(atlasChannelsPerTexel("r8")).toBe(1);
    const spec = { payload: [64, 64, 64], border: 1, stored: [66, 66, 66], channelCount: 3 } as const;
    // Three slabs in one 4-byte texel: slot depth = stored.z, bytes = 4/3 of r8.
    expect(atlasSlotDepth(spec, "rgba8")).toBe(66);
    expect(atlasSlotDepth(spec, "r8")).toBe(66 * 3);
    expect(atlasSlotBytes(spec, "rgba8")).toBe(66 * 66 * 66 * 4);
    expect(atlasSlotBytes(spec, "r8")).toBe(66 * 66 * 66 * 3);
    expect(atlasSlotBytes(spec, "r16f")).toBe(66 * 66 * 66 * 3 * 2);
  });

});

/**
 * raw16 (C3): the chunk REPRESENTATION and the planner's decode-byte currency
 * must move together — a fidelity that halves uint16 chunk bytes without the
 * planner charging 2 B/voxel (or vice versa) breaks the P5/P24 budget
 * accounting.
 */
describe("raw16 chunk fidelity + decode currency", () => {
  it("uint16 stays raw (2 B/voxel); other dtypes are untouched", async () => {
    const { chunkFidelityForDtype, decodedBytesPerVoxel } = await import("./atlasFormat");
    expect(chunkFidelityForDtype("uint16")).toBe("raw16");
    expect(chunkFidelityForDtype("|u2")).toBe("raw16");
    expect(decodedBytesPerVoxel("uint16")).toBe(2);
    // uint8 stays 1 B, signed/float widths stay at the promoted 4 B.
    expect(chunkFidelityForDtype("uint8")).toBe("default");
    expect(decodedBytesPerVoxel("uint8")).toBe(1);
    expect(decodedBytesPerVoxel("|u1")).toBe(1);
    expect(decodedBytesPerVoxel("int8")).toBe(1);
    for (const dtype of ["int16", "uint32", "int32", "float32", "float64"]) {
      expect(chunkFidelityForDtype(dtype)).toBe("default");
      expect(decodedBytesPerVoxel(dtype)).toBe(4);
    }
  });
});
