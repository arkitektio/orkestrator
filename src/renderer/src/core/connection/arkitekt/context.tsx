import type { Ward } from "@arkitektio/bsx/ports/engine/types";
import { createContext } from "react";
import { StoreApi } from "zustand/vanilla";

import { AppContext, AppFunctions, ServiceBuilder, ServiceBuilderMap } from "./types";

export type ArkitektContextValue<
  T extends ServiceBuilderMap = ServiceBuilderMap,
  S extends ServiceBuilder = ServiceBuilder,
> = {
  store: StoreApi<AppContext<T, S>>;
  actions: AppFunctions;
  /** One stable ward per `wardKey`, resolving the live service when called. */
  wards: Record<string, Ward>;
};

export const ArkitektContext = createContext<ArkitektContextValue<any, any> | null>(null);
