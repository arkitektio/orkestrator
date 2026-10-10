import { Navigate, useLocation, useParams } from "react-router-dom";

/**
 * What the relay opens: `orkestrator://<service>/auth/callback?…`, which
 * arrives as `/<service>/auth/callback`. A host route (it outranks the
 * module's own `<service>/*`), so it works for every module and while its
 * service is down; the query goes on to the callback page untouched.
 */
export const RelayCallbackRedirect = () => {
  const { namespace = "" } = useParams();
  const { search } = useLocation();
  return <Navigate replace to={`/auth/callback/${namespace}${search}`} />;
};
