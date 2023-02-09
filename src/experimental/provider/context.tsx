import React, { useContext } from "react";
import { NestedArray, TypedArray, ZarrArray } from "zarr";
import { ArraySelection } from "zarr/types/core/types";
import { S3Store } from "./store";

export type XArrayContextType = {
  store: S3Store;
  data: ZarrArray;
  getChunk: (key: number[]) => Promise<NestedArray<TypedArray>>;
  getSelection: (selection: ArraySelection) => Promise<NestedArray<TypedArray>>;
  getAsRGBA: (selection: ArraySelection) => Promise<ArrayBuffer>;
  getSelectionAsImageData: (selection: ArraySelection) => Promise<ImageData>;
};

export const XArrayContext = React.createContext<XArrayContextType>({
  store: null as any,
  data: null as any,
  getChunk: () => {
    return null as unknown as Promise<NestedArray<TypedArray>>;
  },
  getSelection: () => {
    return null as unknown as Promise<NestedArray<TypedArray>>;
  },
  getAsRGBA: () => {
    return null as unknown as Promise<ArrayBuffer>;
  },
  getSelectionAsImageData: async () => {
    return null as unknown as ImageData;
  },
});

export const useXarray = () => useContext(XArrayContext);
