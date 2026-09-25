import { isModulePath } from "@/core/app/modules";
import { ApolloError } from "@apollo/client/errors";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

type ErrorEntry = { message: string; details?: string };

const graphQLEntries = (error: ApolloError): ErrorEntry[] =>
  error.graphQLErrors.map((e) => {
    const code =
      typeof e.extensions?.code === "string" ? e.extensions.code : undefined;
    const path = e.path?.length ? `path: ${e.path.join(".")}` : undefined;
    const details = [code, path].filter(Boolean).join(" | ");
    return { message: e.message, details: details || undefined };
  });

const networkEntry = (error: ApolloError): ErrorEntry | undefined => {
  const networkError = error.networkError;
  if (!networkError) return undefined;
  const statusCode =
    "statusCode" in networkError ? networkError.statusCode : undefined;
  return {
    message: networkError.message || error.message,
    details: statusCode ? `status: ${String(statusCode)}` : undefined,
  };
};

export const ErrorPage = (props: { error: ApolloError }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const segment = location.pathname.split("/").filter(Boolean)[0];
  const module = isModulePath(segment) ? segment : undefined;

  const gqlEntries = graphQLEntries(props.error);
  const netEntry = networkEntry(props.error);
  const isNetwork = gqlEntries.length === 0 && !!netEntry;
  const entries: ErrorEntry[] =
    gqlEntries.length > 0
      ? gqlEntries
      : [netEntry ?? { message: props.error.message }];

  return (
    <div className="flex flex-col w-full h-full items-center justify-center p-6">
      <div className="flex flex-col gap-6 max-w-[720px] w-full">
        <div className="space-y-3">
          <div className="text-sm uppercase tracking-widest text-muted-foreground">
            {isNetwork ? "Network error" : "GraphQL error"}
          </div>
          <h1 className="text-2xl font-light tracking-tighter sm:text-3xl md:text-4xl text-foreground">
            {module
              ? `The ${module} module could not load`
              : "This page could not load"}
          </h1>
          <div className="rounded-md border border-border bg-muted/40 px-4 py-3 space-y-3">
            <div className="text-xs text-muted-foreground font-mono break-all">
              {location.pathname}
              {location.search}
              {location.hash}
            </div>
            {entries.map((entry, i) => (
              <div key={i}>
                <div className="font-mono text-lg break-words text-foreground">
                  {entry.message}
                </div>
                {entry.details && (
                  <div className="mt-1 text-xs text-muted-foreground font-mono break-all">
                    {entry.details}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-muted-foreground">
            {isNetwork
              ? "The server could not be reached, or it rejected the request. Check that the service is running and try again."
              : "The server returned an error for this request. The object may have been deleted, or you may not have access to it."}
          </p>
        </div>

        <div className="flex flex-col gap-2 min-[400px]:flex-row">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-muted"
          >
            Go back
          </button>
          {module && (
            <NavLink
              to={`/${module}`}
              className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-muted"
            >
              {module} home
            </NavLink>
          )}
          <NavLink
            to="/"
            className="px-4 py-2 text-primary-foreground bg-primary rounded-md hover:bg-primary-dark"
          >
            Go Home
          </NavLink>
        </div>
      </div>
    </div>
  );
};
