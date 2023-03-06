import React, { useContext } from "react";
import { Credentials, Presigned } from "../mikro/api/graphql";

export type DatalayerConfig = {
  endpointUrl: string;
  credentialsRetriever: () => Promise<Credentials>;
  presign: (key: string) => Promise<Presigned>;
};

export type UploadOptions = {
  signal?: AbortSignal;
  onProgress?: (ev: ProgressEvent) => void;
};

export type UploadFunc = (
  file: File,
  options?: UploadOptions
) => Promise<string>;

export type CreateFunc = (file: File, string: string) => Promise<any>;

export type DatalayerContextType = {
  configure: (config: DatalayerConfig) => void;
  upload: UploadFunc;
};

export const DatalayerContext = React.createContext<DatalayerContextType>({
  configure: () => {
    throw Error("No Provider in context not configured");
  },
  upload: () => {
    throw Error("No Provider in context not configured");
  },
});

export const useDatalayer = () => useContext(DatalayerContext);
