import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterAll, describe, expect, it } from "vitest";
import {
  CompositeHasher,
  PART_FLOOR,
  SAMPLE_WINDOW,
  digestFile,
  digestOfBytes,
  partSizeFor,
  sampleFile,
  sampleOfBytes,
  sampleRanges,
} from "./fileIdentity";

/** `bytes(i % 251 for i in range(size))`, as the reference values were computed. */
const pattern = (size: number) => Uint8Array.from({ length: size }, (_, i) => i % 251);

// Computed by arkitekt-datalayer's `digest.sample_of_bytes` on `pattern(size)`: the
// server and this file must agree byte for byte, or no upload ever finds a candidate.
const REFERENCE: [number, string][] = [
  [0, "9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa"],
  [5, "a84cb7e02340233206bd24dc1f43fe33b20474c6e63622d7ad6c07898d37b114"],
  [3 * SAMPLE_WINDOW, "2034e25c2889e3e81cbbb092f77d6f673b42e876f103ddd70805a972d4ba5216"],
  [3 * SAMPLE_WINDOW + 12345, "20ce61372216786ab7f992052fc6014835a08c060541328b37abb6c11a28209d"],
];

describe("the file sample", () => {
  const dirs: string[] = [];
  afterAll(async () => Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true }))));

  it.each(REFERENCE)("of %i bytes is the server's", (size, expected) => {
    expect(sampleOfBytes(pattern(size))).toBe(expected);
  });

  it("reads three windows of a large file", () => {
    const size = 10 * SAMPLE_WINDOW + 3;
    expect(sampleRanges(size)).toEqual([
      [0, SAMPLE_WINDOW],
      [Math.floor((size - SAMPLE_WINDOW) / 2), SAMPLE_WINDOW],
      [size - SAMPLE_WINDOW, SAMPLE_WINDOW],
    ]);
  });

  it("reads a file on disk to the same value", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sample-"));
    dirs.push(dir);
    const [size, expected] = REFERENCE[3];
    const path = join(dir, "pattern.bin");
    await writeFile(path, pattern(size));
    expect(await sampleFile(path)).toEqual({ size, sample: expected });
  });
});

// `digest.composite_of_bytes(pattern(size))`, from arkitekt-datalayer.
const DIGESTS: [number, string][] = [
  [0, "5df6e0e2761359d30a8275058e299fcc0381534545f55cf43e41983f5d4c9456"],
  [5, "768a07c1dee8e668bcf5982658abf8ee1fdaa6378c342192a51dcfae2a672ac3"],
  [2 * PART_FLOOR + 5, "dbf2a8c8bd6508f8836f45a0d5bb280759bae513eba547a4e947270a227d1844"],
];

describe("the file digest", () => {
  const dirs: string[] = [];
  afterAll(async () => Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true }))));

  it.each(DIGESTS)("of %i bytes is the server's", (size, expected) => {
    expect(digestOfBytes(pattern(size))).toBe(expected);
  });

  it("is the same in any chunks", () => {
    const [size, expected] = DIGESTS[2];
    const data = pattern(size);
    const hasher = new CompositeHasher(size);
    for (let start = 0; start < size; start += 3 * 1024 * 1024 + 7) {
      hasher.update(data.subarray(start, start + 3 * 1024 * 1024 + 7));
    }
    expect(hasher.hexdigest()).toBe(expected);
  });

  it("cuts larger parts once the floor would need more than 10,000", () => {
    expect(partSizeFor(PART_FLOOR * 10_000)).toBe(PART_FLOOR);
    expect(partSizeFor(PART_FLOOR * 10_000 + 1)).toBe(2 * PART_FLOOR);
  });

  it("reads a file on disk to the same value", async () => {
    const dir = await mkdtemp(join(tmpdir(), "digest-"));
    dirs.push(dir);
    const [size, expected] = DIGESTS[2];
    const path = join(dir, "pattern.bin");
    await writeFile(path, pattern(size));
    expect(await digestFile(path)).toEqual({ size, digest: expected });
  });
});
