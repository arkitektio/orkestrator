import { AwsClient } from "aws4fetch";
import { Blosc } from "numcodecs";
import {
  NestedArray,
  TypedArray,
  TypedArrayConstructor,
  ZarrArray,
  addCodec,
  getCodec,
} from "zarr";
import { ChunkProjection } from "zarr/types/core/types";
import { DtypeString } from "zarr/types/types";
import { isContiguousSelection, isTotalSlice } from "./indexing";
import { joinUrlParts } from "./store";

addCodec(Blosc.codecId, () => Blosc);

export function ensureByteArray(chunkData: ArrayBuffer): Uint8Array {
  if (typeof chunkData === "string") {
    return new Uint8Array(chunkData);
  }
  return new Uint8Array(chunkData);
}
export function byteSwapInplace(src: TypedArray): void {
  const b = src.BYTES_PER_ELEMENT;
  if (b === 1) return; // no swapping needed
  // In browser, need to flip manually
  // Adapted from https://github.com/zbjornson/node-bswap/blob/master/bswap.js
  const flipper = new Uint8Array(src.buffer, src.byteOffset, src.length * b);
  const numFlips = b / 2;
  const endByteIndex = b - 1;
  let t: number;
  for (let i = 0; i < flipper.length; i += b) {
    for (let j = 0; j < numFlips; j++) {
      t = flipper[i + j];
      flipper[i + j] = flipper[i + endByteIndex - j];
      flipper[i + endByteIndex - j] = t;
    }
  }
}

export const dtypeToMinMax = (dtype: DtypeString): [number, number] => {
  switch (dtype) {
    case "|b":
      return [0, 127];
    case "|B":
      return [0, 255];
    case "|u1":
      return [0, 255];
    case "|i1":
      return [0, 127];
    case "<i8":
      return [0, 127];
    case "<b":
      return [0, 127];
    case "<B":
      return [0, 255];
    case "<u1":
      return [0, 255];
    case "<i1":
      return [0, 127];
    case "<u2":
      return [0, 65535];
    case "<i2":
      return [0, 32767];
    case "<u4":
      return [0, 4294967295];
    case "<i4":
      return [0, 2147483647];
    case "<f4":
      return [0, 1];
    case "<f8":
      return [0, 1];
    case ">b":
      return [0, 127];
    case ">B":
      return [0, 255];
    case ">u1":
      return [0, 255];
    case ">i1":
      return [0, 127];
    case ">u2":
      return [0, 65535];
    case ">i2":
      return [0, 32767];
    case ">u4":
      return [0, 4294967295];
    case ">i4":
      return [0, 2147483647];
    case ">f4":
      return [0, 1];
    case ">f8":
      return [0, 1];
    default:
      throw new Error(`Unsupported dtype: ${dtype}`);
  }
};

export const DTYPE_TYPEDARRAY_MAPPING: {
  [A in DtypeString]: TypedArrayConstructor<TypedArray>;
} = {
  "|b": Int8Array,
  "|B": Uint8Array,
  "|u1": Uint8Array,
  "|i1": Int8Array,
  "<i8": BigInt64Array,
  "<b": Int8Array,
  "<B": Uint8Array,
  "<u1": Uint8Array,
  "<i1": Int8Array,
  "<u2": Uint16Array,
  "<i2": Int16Array,
  "<u4": Uint32Array,
  "<i4": Int32Array,
  "<f4": Float32Array,
  "<f8": Float64Array,
  ">b": Int8Array,
  ">B": Uint8Array,
  ">u1": Uint8Array,
  ">i1": Int8Array,
  ">u2": Uint16Array,
  ">i2": Int16Array,
  ">u4": Uint32Array,
  ">i4": Int32Array,
  ">f4": Float32Array,
  ">f8": Float64Array,
};

export function getTypedArrayCtr(dtype: DtypeString) {
  const ctr = DTYPE_TYPEDARRAY_MAPPING[dtype];
  if (!ctr) {
    throw Error(
      `Dtype not recognized or not supported in extended zarr.js, got ${dtype}.`
    );
  }
  return ctr;
}

export const downloadChunk = async (
  client: AwsClient,
  url: string,
  array: ZarrArray
) => {
  //console.log(x);
  let data = await client.fetch(url);
  let out = ensureByteArray(await data.arrayBuffer());
  let meta = array.meta;
  let dtype = array.dtype;

  if (meta.compressor) {
    let x = await getCodec(meta.compressor);
    out = await x.decode(out);
  }

  if (dtype.includes(">")) {
    // Need to flip bytes for Javascript TypedArrays
    // We flip bytes in-place to avoid creating an extra copy of the decoded buffer.
    byteSwapInplace(new (getTypedArrayCtr(dtype))(out.buffer));
  }
  //console.log(out);
  return new (getTypedArrayCtr(dtype))(out.buffer);
};

export const getChunk = async (
  aws: AwsClient,
  chunkCoords: number[],
  array: ZarrArray,
  path: string
) => {
  const url = joinUrlParts(
    path,
    array.keyPrefix + chunkCoords.join(array.meta.dimension_separator ?? ".")
  );

  return await downloadChunk(aws, url, array);
};

export const getChunkItem = async (
  aws: AwsClient,
  proj: ChunkProjection,
  array: ZarrArray,
  path: string
) => {
  const rawChunk = await getChunk(aws, proj.chunkCoords, array, path);
  const decodedChunk = new NestedArray(
    rawChunk,
    array.meta.chunks,
    array.dtype
  );

  if (
    isContiguousSelection(proj.outSelection) &&
    isTotalSlice(proj.chunkCoords, array.chunks) &&
    !array.meta.filters
  ) {
    return { decodedChunk, proj };
  }

  return { decodedChunk: decodedChunk.get(proj.chunkSelection), proj };
};
