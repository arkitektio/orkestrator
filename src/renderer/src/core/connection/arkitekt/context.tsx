import { createContext } from "react";
import { StoreApi } from "zustand/vanilla";

import { AppContext, AppFunctions, ServiceBuilder, ServiceBuilderMap } from "./types";

export type ArkitektContextValue<
  T extends ServiceBuilderMap = ServiceBuilderMap,
  S extends ServiceBuilder = ServiceBuilder,
> = {
  store: StoreApi<AppContext<T, S>>;
  actions: AppFunctions;
};

export const ArkitektContext = createContext<ArkitektContextValue<any, any> | null>(null);
