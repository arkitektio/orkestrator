import { AwsClient } from "aws4fetch";
import { HTTPStore, openGroup, ZarrArray } from "zarr";

enum HTTPMethod {
  Get = "GET",
  Head = "HEAD",
  Put = "PUT",
}

export class HTTPError extends Error {
  __zarr__: string;
  constructor(code: any) {
    super(code);
    this.__zarr__ = "HTTPError";
    Object.setPrototypeOf(this, HTTPError.prototype);
  }
}

export class KeyError extends Error {
  __zarr__: string;

  constructor(key: any) {
    super(`key ${key} not present`);
    this.__zarr__ = "KeyError";
    Object.setPrototypeOf(this, KeyError.prototype);
  }
}

export function joinUrlParts(...args: string[]) {
  return args
    .map((part, i) => {
      if (i === 0) {
        return part.trim().replace(/[\/]*$/g, "");
      } else {
        return part.trim().replace(/(^[\/]*|[\/]*$)/g, "");
      }
    })
    .filter((x) => x.length)
    .join("/");
}

export class S3Store extends HTTPStore {
  aws: AwsClient;

  constructor(url: string, aws: AwsClient, options: any = {}) {
    super(url, options);
    this.aws = aws;
  }

  async getItem(item: any, opts: any) {
    const url = joinUrlParts(this.url, item);
    console.warn("Getting item", url);
    let value: any;
    try {
      value = await this.aws.fetch(url, { ...this.fetchOptions, ...opts });
    } catch (e) {
      console.log(e);
      throw new HTTPError("present");
    }
    if (value.status === 404) {
      // Item is not found
      throw new KeyError(item);
    } else if (value.status !== 200) {
      throw new HTTPError(String(value.status));
    }
    return value.arrayBuffer(); // Browser
    // only decode if 200
  }
  async setItem(item: any, value: any) {
    const url = joinUrlParts(this.url, item);
    if (typeof value === "string") {
      value = new TextEncoder().encode(value).buffer;
    }
    const set = await this.aws.fetch(url, {
      ...this.fetchOptions,
      method: HTTPMethod.Put,
      body: value,
    });
    return set.status.toString()[0] === "2";
  }

  async containsItem(item: any) {
    const url = joinUrlParts(this.url, item);
    try {
      const value = await this.aws.fetch(url, {
        ...this.fetchOptions,
      });

      return value.status === 200;
    } catch (e) {
      console.error(url, e);
      return false;
    }
  }
}

export interface Zattrs {
  fileversion: string;
}

export interface Zgroup {
  zarr_format: number;
}

export interface Compressor {
  blocksize: number;
  clevel: number;
  cname: string;
  id: string;
  shuffle: number;
}

export interface DataZarray {
  chunks: number[];
  compressor: Compressor;
  dtype: string;
  fill_value: string;
  filters?: any;
  order: string;
  shape: number[];
  zarr_format: number;
}

export interface DataZattrs {
  _ARRAY_DIMENSIONS: string[];
}

export interface Metadata {
  ".zattrs": Zattrs;
  ".zgroup": Zgroup;
  "data/.zarray": DataZarray;
  "data/.zattrs": DataZattrs;
}

export interface XArrayMetadata {
  metadata: Metadata;
  zarr_consolidated_format: number;
}

type Labels = [...string[], "y", "x"];
function getAxisLabelsAndChannelAxis(
  xarray_metadata: XArrayMetadata,
  arr: ZarrArray
): { labels: Labels; channel_axis: number } {
  // type cast string[] to Labels
  let labels = xarray_metadata.metadata["data/.zattrs"]
    ._ARRAY_DIMENSIONS as Labels;

  const channel_axis = labels.indexOf("c");
  return { labels, channel_axis };
}

export async function openZarrArray(
  url: string
): Promise<{ data: ZarrArray; metadata: XArrayMetadata }> {
  // If the loader fails to load, handle the error (show an error snackbar).
  // Otherwise load.
  try {
    console.log(url);

    let aws = new AwsClient({
      accessKeyId: "kBcG6sCIlQvOWPOpzJhu",
      secretAccessKey: "FjiprDl3qHwIMR7azM2M",
      service: "s3",
    });

    let x = await aws.fetch(url + "/.zmetadata");
    let xarray_metadata = (await x.json()) as XArrayMetadata;

    const store = new S3Store(url, aws);
    console.log(store);
    const grp = await openGroup(store, "", "r");
    const rootAttrs = await grp.attrs.asObject();

    console.log(grp, rootAttrs, xarray_metadata);

    let data = (await grp.getItem("data")) as ZarrArray;

    return { data, metadata: xarray_metadata };
  } catch (e) {
    throw Error("Failed to load data");
  }
}

export type SelectionLoader = (s: any) => Promise<ZarrArray>;
