import { createContext, useContext } from "react";

/**
 * The react-hook-form path of the object holding the top-level ports (`[]` on
 * the plain assign form, `["args"]` on the implementation form). Effects and
 * validators resolve absolute dependency names (`/foo`) against it.
 */
export const PortsRootContext = createContext<readonly string[]>([]);

export const usePortsRoot = () => useContext(PortsRootContext);
