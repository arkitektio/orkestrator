/**
 * Parquet row values → JS numbers, and the one place bigints are dealt with.
 *
 * INT64 columns (`cell`, `object_id`, konnektion's `root_node_id`) arrive as
 * `bigint`. Converting is safe here and only here: both formats' `octree.py`
 * caps Morton codes at 17 bits per axis precisely so a code stays under 2^53,
 * and both writers refuse anything larger, so `Number()` is exact rather than
 * lossy-but-probably-fine.
 */

export const toNumber = (value: unknown, what: string): number => {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  throw new Error(`${what} should be numeric; got ${typeof value} (${String(value)}).`);
};

export const toNumberOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : toNumber(value, "value");

export const toNumberArray = (value: unknown, what: string): number[] => {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${what} should be a list; got ${typeof value}.`);
  return value.map((item) => toNumber(item, `an element of ${what}`));
};

/** A BLOB column as bytes. Requires `utf8: false` upstream, or this sees a string. */
export const toBytes = (value: unknown, what: string): Uint8Array => {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === "string") {
    throw new Error(
      `${what} came back as a string, which means the Parquet reader was not given \`utf8: false\`. ` +
        `Geometry blobs are bare BYTE_ARRAYs and would be silently decoded as text.`,
    );
  }
  throw new Error(`${what} should be binary; got ${typeof value}.`);
};

export const toTriple = (
  row: Record<string, unknown>,
  prefix: string,
): [number, number, number] => [
  toNumber(row[`${prefix}_x`], `${prefix}_x`),
  toNumber(row[`${prefix}_y`], `${prefix}_y`),
  toNumber(row[`${prefix}_z`], `${prefix}_z`),
];
