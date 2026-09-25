import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';

const identity = <T,>(value: T) => value;

export function createScopedStoreHooks<
  TState,
  TStore extends StoreApi<TState> = StoreApi<TState>,
>(storeName: string) {
  const StoreContext = createContext<TStore | null>(null);
  StoreContext.displayName = `${storeName}Context`;

  const useStoreApi = (): TStore => {
    const store = useContext(StoreContext);

    if (!store) {
      throw new Error(`Missing ${storeName}Provider`);
    }

    return store;
  };

  function useScopedStore(): TState;
  function useScopedStore<TSelected>(
    selector: (state: TState) => TSelected,
  ): TSelected;
  function useScopedStore<TSelected>(
    selector?: (state: TState) => TSelected,
  ) {
    const store = useStoreApi();

    return useStore(
      store,
      (selector ?? identity) as (state: TState) => TSelected,
    );
  }

  return {
    StoreContext,
    useScopedStore,
    useStoreApi,
  };
}
