import React from "react";
import type { SmartPrefetcher } from "./prefetch";

/** Provided by `SmartSurface`; null where no surface is mounted (tests). */
export const SmartPrefetchContext = React.createContext<SmartPrefetcher | null>(null);

export const useSmartPrefetcher = () => React.useContext(SmartPrefetchContext);
