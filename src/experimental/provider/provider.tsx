import { AwsClient } from "aws4fetch";
import React, { useEffect, useState } from "react";
import { Pool, spawn } from "threads";
import { NestedArray, openGroup, ZarrArray } from "zarr";
import { ArraySelection, ChunkProjection } from "zarr/types/core/types";
import { BasicIndexer, isContiguousSelection, isTotalSlice } from "./indexing";
import { joinUrlParts, S3Store } from "./store";
import DownloadWorker from "../workers/download?worker";
import { XArrayContext } from "./context";

export const XArrayProvider: React.FC<{
  path: string;
  children: React.ReactNode;
}> = (props) => {
  const [state, setState] = useState<
    { store: S3Store; data: ZarrArray } | undefined
  >();
  const [pool, setPool] = useState(() =>
    Pool(() => spawn(new DownloadWorker()), 8 /* optional size */)
  );

  const getChunk = async (chunkCoords: number[]) => {
    const url = joinUrlParts(
      props.path,
      state?.data.keyPrefix +
        chunkCoords.join(state?.data.meta.dimension_separator ?? ".")
    );

    const x = await pool.queue(async ({ download }) => {
      const multiplied = await download(
        url,
        state?.data.meta,
        state?.data.dtype
      );
      return multiplied;
    });

    return x;
  };

  const getChunkItem = async (proj: ChunkProjection) => {
    if (!state?.data) {
      throw Error("No data loaded");
    }

    const rawChunk = await getChunk(proj.chunkCoords);
    const decodedChunk = new NestedArray(
      rawChunk,
      state?.data.meta.chunks,
      state?.data.dtype
    );

    if (
      isContiguousSelection(proj.outSelection) &&
      isTotalSlice(proj.chunkCoords, state.data.chunks) &&
      !state.data.meta.filters
    ) {
      return { decodedChunk, proj };
    }

    return { decodedChunk: decodedChunk.get(proj.chunkSelection), proj };
  };

  const getSelection = async (selection: ArraySelection) => {
    if (!state?.data) {
      throw Error("No data loaded");
    }
    let indexer = new BasicIndexer(selection, state?.data);
    const outShape = indexer.shape;
    const outDtype = state.data.dtype;
    const outSize = indexer.shape.reduce((x, y) => x * y, 1);
    console.log(outShape, outSize);

    const out = new NestedArray(null, outShape, outDtype);
    if (outSize === 0) {
      return out;
    }

    let promises = [];

    for (const proj of indexer.iter()) {
      promises.push(getChunkItem(proj));
    }

    let chunkPairs = await Promise.all(promises);

    for (const { decodedChunk, proj } of chunkPairs) {
      out.set(proj.outSelection, decodedChunk);
    }

    return out;
  };

  const getAsRGBA = async (selection: ArraySelection) => {
    return new ArrayBuffer(56);
  };

  const getSelectionAsImageData = async (selection: ArraySelection) => {
    const x = await pool.queue(async ({ renderSelection }) => {
      const multiplied = await renderSelection(props.path, selection);
      return multiplied;
    });
    return x;
  };

  useEffect(() => {
    let aws = new AwsClient({
      accessKeyId: "kBcG6sCIlQvOWPOpzJhu",
      secretAccessKey: "FjiprDl3qHwIMR7azM2M",
      service: "s3",
    });
    let store = new S3Store(props.path, aws);

    openGroup(store, "", "r")
      .then(async (grp) => {
        console.log("Loading group again");
        setState({ store, data: (await grp.getItem("data")) as ZarrArray });
      })
      .catch((err) => {
        console.error(err);
      });
  }, [props.path]);

  if (!state) {
    return <></>;
  }

  return (
    <XArrayContext.Provider
      value={{
        ...state,
        getChunk,
        getSelection,
        getAsRGBA,
        getSelectionAsImageData,
      }}
    >
      {props.children}
    </XArrayContext.Provider>
  );
};
