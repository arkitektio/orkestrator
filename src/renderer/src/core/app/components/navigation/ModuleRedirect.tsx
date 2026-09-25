import { Navigate, useLocation } from "react-router-dom";

/**
 * Old module addresses and where they live now. Each module's route is its
 * namespace; these are the names it used before, kept alive for open tabs,
 * pinned tabs and pasted links.
 */
export const MODULE_ALIASES: Record<string, string> = {
  team: "lok",
  omero_ark: "omeroark",
};

/** `/<from>/<rest>` → `/<to>/<rest>`, search kept. */
export const moveModulePath = (
  pathname: string,
  from: string,
  to: string,
  search = "",
): string => pathname.replace(new RegExp(`^/${from}(?=/|$)`), `/${to}`) + search;

export const ModuleRedirect = ({ from, to }: { from: string; to: string }) => {
  const location = useLocation();
  return <Navigate replace to={moveModulePath(location.pathname, from, to, location.search)} />;
};
