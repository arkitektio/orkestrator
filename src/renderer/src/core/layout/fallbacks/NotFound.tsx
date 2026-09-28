import { useSelf } from "@/core/connection/useSelf";
import { isInstalledModule } from "@/core/modules/registries";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";

export const NotFound = () => {
  const { username } = useSelf();

  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  // When rendered from a module's catch-all route, `*` holds the part of the
  // path that the module could not match. Outside of a module it is undefined.
  const unmatched = params["*"];
  const segment = location.pathname.split("/").filter(Boolean)[0];
  const module = isInstalledModule(segment) ? segment : undefined;

  return (
    <div className="flex flex-col w-full h-full items-center justify-center p-6">
      <div className="flex flex-col gap-6 max-w-[720px] w-full">
        <div className="space-y-3">
          <div className="text-sm uppercase tracking-widest text-muted-foreground">
            404 — Not found
          </div>
          <h1 className="text-2xl font-light tracking-tighter sm:text-3xl md:text-4xl text-foreground">
            {module
              ? `The ${module} module has no page at`
              : "There is no page at"}
          </h1>
          <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
            <div className="font-mono text-lg break-all text-foreground">
              {location.pathname}
              {location.search}
              {location.hash}
            </div>
            {unmatched && (
              <div className="mt-2 text-xs text-muted-foreground font-mono break-all">
                unmatched within /{module}: {unmatched}
              </div>
            )}
          </div>
          <p className="text-muted-foreground">
            Sorry {username || "Stranger"}, this route does not exist.
            It may have been renamed, or the object it pointed to is gone.
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
