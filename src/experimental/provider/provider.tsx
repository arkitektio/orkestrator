import { AwsClient } from "aws4fetch";
import React, { useEffect, useState } from "react";
import { Pool, spawn } from "threads";
import { NestedArray, openGroup, ZarrArray } from "zarr";
import { ArraySelection, ChunkProjection } from "zarr/types/core/types";
import { BasicIndexer, isContiguousSelection, isTotalSlice } from "./indexing";
import { joinUrlParts, S3Store } from "./store";
import DownloadWorker from "../workers/download?worker";
import { XArrayContext } from "./context";
import { useRequestQuery } from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";

export const available_color_maps = [
  "jet",
  "hot",
  "cool",
  "spring",
  "summer",
  "autumn",
  "winter",
  "bone",
  "copper",
  "greys",
  "YIGnBu",
  "greens",
  "YIOrRd",
  "bluered",
  "RdBu",
  "picnic",
  "rainbow",
  "portland",
  "blackbody",
  "earth",
  "electric",
  "viridis",
  "inferno",
  "magma",
  "plasma",
  "warm",
  "rainbow-soft",
  "bathymetry",
  "cdom",
  "chlorophyll",
  "density",
  "freesurface-blue",
  "freesurface-red",
  "oxygen",
  "par",
  "phase",
  "salinity",
  "temperature",
  "turbidity",
  "velocity-blue",
  "velocity-green",
  "cubehelix",
] as const;

export type AvailableColormap = typeof available_color_maps[number];

export const XArrayProvider: React.FC<{
  children: React.ReactNode;
}> = (props) => {
  const { data, loading, error } = withMikro(useRequestQuery)({});
  const [pool, setPool] = useState<Pool<any> | undefined>();

  useEffect(() => {
    let pool = Pool(() => spawn(new DownloadWorker()), 1 /* optional size */);
    setPool(pool);

    return () => {
      pool.terminate();
    };
  }, []);

  const getSelectionAsImageData = async (
    path: string,
    selection: ArraySelection,
    colormap: AvailableColormap
  ) => {
    if (!pool) {
      throw Error("No pool");
    }
    if (!data?.request) {
      throw Error("No credentials loaded");
    }

    const x = await pool.queue(async ({ renderSelection }) => {
      if (!data?.request) {
        throw Error("No credentials loaded");
      }

      let aws = new AwsClient({
        accessKeyId: data.request.accessKey,
        secretAccessKey: data.request.secretKey,
        sessionToken: data.request.sessionToken,
        service: "s3",
      });

      console.log(await aws.fetch(path + "/.zattrs"));

      console.log(
        "Rendering selection",
        selection,
        path,
        selection,
        data?.request
      );
      const multiplied = await renderSelection(
        path,
        selection,
        data.request.accessKey,
        data.request.secretKey,
        data.request.sessionToken,
        colormap
      );
      return multiplied;
    });
    return x;
  };

  return (
    <XArrayContext.Provider
      value={{
        getSelectionAsImageData,
      }}
    >
      {props.children}
    </XArrayContext.Provider>
  );
};
