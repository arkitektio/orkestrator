import React, { useContext } from "react";
import { NestedArray, TypedArray, ZarrArray } from "zarr";
import { ArraySelection } from "zarr/types/core/types";
import { AvailableColormap } from "./provider";
import { S3Store } from "./store";

export type XArrayContextType = {
  getSelectionAsImageData: (
    path: string,
    selection: ArraySelection,
    colormap: AvailableColormap
  ) => Promise<ImageData>;
};

export const XArrayContext = React.createContext<XArrayContextType>({
  getSelectionAsImageData: async () => {
    return null as unknown as ImageData;
  },
});

export const useXarray = () => useContext(XArrayContext);
