import { installedModules, useModuleHostVersion } from "@/core/modules/host/host";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/core/ui/breadcrumb";
import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import useReactRouterBreadcrumbs from "use-react-router-breadcrumbs";
import { detailPatterns, matchIdCrumb, pathWithId, type IdCrumbMatch } from "./idCrumb";

interface IBreadCrumbsProps { }

/**
 * The current page's crumb when it is an object's id: a double-click turns it
 * into a field, Enter goes to the same page for the id typed, Escape or
 * leaving the field keeps the page.
 */
const IdCrumb = ({ match, children }: { match: IdCrumbMatch; children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [draft, setDraft] = React.useState<string | null>(null);

  if (draft === null) {
    return (
      <span
        className="cursor-text"
        title="Double-click to go to another id"
        onDoubleClick={() => setDraft(match.id)}
      >
        {children}
      </span>
    );
  }

  const go = () => {
    const id = draft.trim();
    setDraft(null);
    if (id && id !== match.id) navigate(pathWithId(match, id));
  };

  return (
    <input
      autoFocus
      aria-label="Go to id"
      value={draft}
      size={Math.max(draft.length, 2)}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          go();
        } else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setDraft(null);
        }
      }}
      onBlur={() => setDraft(null)}
      className="min-w-0 rounded-sm border-b border-primary bg-transparent px-0.5 font-mono text-foreground outline-none"
    />
  );
};

const BreadCrumbs: React.FunctionComponent<IBreadCrumbsProps> = () => {
  const breadcrumbs = useReactRouterBreadcrumbs();
  const version = useModuleHostVersion();
  const patterns = React.useMemo(
    () => detailPatterns(installedModules().map((definition) => definition.manifest)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt when a module comes or goes
    [version],
  );
  const current = breadcrumbs[breadcrumbs.length - 1];
  const idMatch = current ? matchIdCrumb(current.match.pathname, patterns) : null;

  return (
    <>
      {/* The list stays on one line: `BreadcrumbList` defaults to `flex-wrap`,
          and a wrapped second line grows the page header, which shifts the
          whole row down. Ancestors keep their width, the current page absorbs
          the overflow with an ellipsis. */}
      <Breadcrumb className="min-w-0 flex-initial text-md">
        <BreadcrumbList className="flex-nowrap">
          {breadcrumbs.slice(0, -1).map(({ match, breadcrumb }) => (
            <React.Fragment key={match.pathname}>
              <BreadcrumbItem className="shrink-0">
                <BreadcrumbLink asChild>
                  <NavLink to={match.pathname}>{breadcrumb}</NavLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="shrink-0" />
            </React.Fragment>
          ))}
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="min-w-0 truncate">
              {idMatch ? (
                // Keyed by the path: landing on another id starts unedited.
                <IdCrumb key={current.match.pathname} match={idMatch}>
                  {current.breadcrumb}
                </IdCrumb>
              ) : (
                current?.breadcrumb
              )}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
};

export default BreadCrumbs;
