import { createStore, StoreApi } from "zustand/vanilla";

import { AppContext, ServiceBuilder, ServiceBuilderMap } from "./types";

export const createArkitektStateStore = <
  T extends ServiceBuilderMap,
  S extends ServiceBuilder,
>(
  initialState: AppContext<T, S>,
): StoreApi<AppContext<T, S>> => {
  return createStore<AppContext<T, S>>(() => initialState);
};
