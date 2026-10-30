import { createContext, useContext } from "react";

/** One implementation's `Fits` on a port, as a service's filter takes it. */
export type PortFit = { path: string; agent: Record<string, number> };

/**
 * What the agents that could take this form can handle, by port: a picker whose query declares
 * `$fits` then offers only objects at least one of them fits. Empty for a port some live agent
 * states no limit on, since that agent takes anything.
 */
export const PortFitsContext = createContext<Readonly<Record<string, readonly PortFit[]>>>({});

export const usePortFits = (port: string | undefined): readonly PortFit[] => {
  const fits = useContext(PortFitsContext);
  return (port && fits[port]) || [];
};

/** The port a catalog component sits on says only its structure: its `Fits` are handed down here. */
export const CurrentPortFitsContext = createContext<readonly PortFit[]>([]);
