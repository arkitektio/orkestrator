import { Navigate, useLocation } from "react-router-dom";

/** `/lok/<rest>` → `/team/<rest>`: the module's old address, search kept. */
export const lokToTeam = (pathname: string, search = ""): string =>
  pathname.replace(/^\/lok(?=\/|$)/, "/team") + search;

export const LokRedirect = () => {
  const location = useLocation();
  return <Navigate replace to={lokToTeam(location.pathname, location.search)} />;
};
