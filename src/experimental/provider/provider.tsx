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
import { RekuestGuard } from "../../rekuest/RekuestGuard";

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

export const TrueXArrayProvider: React.FC<{
  children: React.ReactNode;
}> = (props) => {
  const { data, loading, error } = withMikro(useRequestQuery)({});
  const [pool, setPool] = useState<Pool<any> | undefined>();

  useEffect(() => {
    let pool = Pool(() => spawn(new DownloadWorker()), 2 /* optional size */);
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
      try {
        const multiplied = await renderSelection(
          path,
          selection,
          data.request.accessKey,
          data.request.secretKey,
          data.request.sessionToken,
          colormap
        );

        return multiplied;
      } catch (e) {
        console.error("Error rendering selection", e);
        throw e;
      }
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

export const NoXArrayProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const failureFunc = async (...args: any[]): Promise<any> => {
    console.log("No Postman Provider", args);
    throw Error("No Postman Provider");
  };
  return (
    <XArrayContext.Provider
      value={{
        getSelectionAsImageData: failureFunc,
      }}
    >
      {children}
    </XArrayContext.Provider>
  );
};

export const XArrayProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <RekuestGuard fallback={<NoXArrayProvider>{children}</NoXArrayProvider>}>
      <TrueXArrayProvider>{children}</TrueXArrayProvider>
    </RekuestGuard>
  );
};
