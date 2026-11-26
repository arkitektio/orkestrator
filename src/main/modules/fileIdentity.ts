import { createHash, type Hash } from "crypto";
import { createReadStream } from "fs";
import { open } from "fs/promises";

/**
 * What a file's bytes are, computed the way mikro's datalayer computes them
 * (`arkitekt_datalayer.digest`): the sample asks "might this already be
 * stored?", the digest settles it. Both definitions must stay byte for byte the
 * server's; `fileIdentity.test.ts` pins them to its values.
 *
 * The sample of a file: what mikro compares before an upload, to say whether the
 * file may already be stored. The definition is arkitekt-datalayer's
 * (`arkitekt_datalayer.digest.sample_of`), and must stay byte for byte the same:
 * the SHA-256 of the size (ASCII decimal and a newline) followed by the first,
 * middle and last `SAMPLE_WINDOW` bytes — or the whole file when it is no larger
 * than three windows. A match is a candidate, not a proof.
 */
export const SAMPLE_WINDOW = 4 * 1024 * 1024;

/** The `[start, length]` windows the sample reads, in order. */
export const sampleRanges = (size: number): [number, number][] => {
  if (size <= 3 * SAMPLE_WINDOW) return size > 0 ? [[0, size]] : [];
  return [
    [0, SAMPLE_WINDOW],
    [Math.floor((size - SAMPLE_WINDOW) / 2), SAMPLE_WINDOW],
    [size - SAMPLE_WINDOW, SAMPLE_WINDOW],
  ];
};

/** The sample of bytes held in memory: a reference for tests. */
export const sampleOfBytes = (data: Uint8Array): string => {
  const hash = createHash("sha256").update(`${data.length}\n`);
  for (const [start, length] of sampleRanges(data.length)) {
    hash.update(data.subarray(start, start + length));
  }
  return hash.digest("hex");
};

/** Reads at most three windows of the file at `path`: 12 MiB, whatever its size. */
export const sampleFile = async (path: string): Promise<{ size: number; sample: string }> => {
  const handle = await open(path, "r");
  try {
    const { size } = await handle.stat();
    const hash = createHash("sha256").update(`${size}\n`);
    for (const [start, length] of sampleRanges(size)) {
      const buffer = Buffer.alloc(length);
      let read = 0;
      while (read < length) {
        const { bytesRead } = await handle.read(buffer, read, length - read, start + read);
        if (bytesRead === 0) {
          throw new Error(`The file at ${path} ended before ${start + length} bytes: it changed while it was read.`);
        }
        read += bytesRead;
      }
      hash.update(buffer);
    }
    return { size, sample: hash.digest("hex") };
  } finally {
    await handle.close();
  }
};

/** The smallest part a digest is cut into, and S3's ceiling on the parts of one upload. */
export const PART_FLOOR = 8 * 1024 * 1024;
export const MAX_PARTS = 10_000;

/** The part size a digest of `size` bytes is cut at: the floor, doubled until the parts fit the ceiling. */
export const partSizeFor = (size: number): number => {
  let part = PART_FLOOR;
  while (size > part * MAX_PARTS) part *= 2;
  return part;
};

/**
 * The digest: the SHA-256 of the SHA-256s of the file's parts, cut at
 * `partSizeFor(size)` — what S3 reports for an upload in those parts with
 * SHA-256 checksums. Hex, without S3's `-N`.
 */
export class CompositeHasher {
  private readonly parts: Buffer[] = [];
  private current: Hash = createHash("sha256");
  private filled = 0;
  private seen = 0;
  readonly partSize: number;

  constructor(readonly size: number) {
    this.partSize = partSizeFor(size);
  }

  update(chunk: Uint8Array): void {
    let offset = 0;
    while (offset < chunk.length) {
      const take = Math.min(this.partSize - this.filled, chunk.length - offset);
      this.current.update(chunk.subarray(offset, offset + take));
      this.filled += take;
      this.seen += take;
      offset += take;
      if (this.filled === this.partSize) {
        this.parts.push(this.current.digest());
        this.current = createHash("sha256");
        this.filled = 0;
      }
    }
  }

  hexdigest(): string {
    if (this.seen !== this.size) {
      throw new Error(`The file was ${this.seen} bytes, not the ${this.size} it was measured at: it changed while it was read.`);
    }
    const parts = [...this.parts];
    if (this.filled > 0 || parts.length === 0) parts.push(this.current.digest());
    return createHash("sha256").update(Buffer.concat(parts)).digest("hex");
  }
}

/** The digest of bytes held in memory: a reference for tests. */
export const digestOfBytes = (data: Uint8Array): string => {
  const hasher = new CompositeHasher(data.length);
  hasher.update(data);
  return hasher.hexdigest();
};

/** The digest of the file at `path`, read once as a stream. */
export const digestFile = async (path: string): Promise<{ size: number; digest: string }> => {
  const handle = await open(path, "r");
  const { size } = await handle.stat();
  await handle.close();
  const hasher = new CompositeHasher(size);
  for await (const chunk of createReadStream(path, { highWaterMark: 1024 * 1024 })) {
    hasher.update(chunk as Buffer);
  }
  return { size, digest: hasher.hexdigest() };
};
