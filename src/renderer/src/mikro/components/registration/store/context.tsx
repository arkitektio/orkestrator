import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import { createRegistrationStore, type RegistrationState } from "./registrationStore";

const RegistrationStoreContext = createContext<StoreApi<RegistrationState> | null>(null);

/**
 * One session store per provider. It sits ABOVE the page's sidebar tabs on
 * purpose: a tab unmounts when it is not the active one (Radix `TabsContent`),
 * and a draft that died every time the user glanced at the Layers tab would
 * not be a draft.
 */
export const RegistrationStoreProvider = (props: { children: ReactNode }) => {
  const [store] = useState(createRegistrationStore);
  return <RegistrationStoreContext.Provider value={store}>{props.children}</RegistrationStoreContext.Provider>;
};

export const useRegistrationApi = (): StoreApi<RegistrationState> => {
  const store = useContext(RegistrationStoreContext);
  if (!store) throw new Error("Missing Registration.Provider");
  return store;
};

/** Null outside a provider — for pieces that must render harmlessly without one. */
export const useOptionalRegistrationApi = (): StoreApi<RegistrationState> | null =>
  useContext(RegistrationStoreContext);

export const useRegistration = <T,>(selector: (state: RegistrationState) => T): T =>
  useStore(useRegistrationApi(), selector);
