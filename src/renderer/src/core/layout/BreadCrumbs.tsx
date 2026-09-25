import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/core/ui/breadcrumb";
import * as React from "react";
import { NavLink } from "react-router-dom";
import useReactRouterBreadcrumbs from "use-react-router-breadcrumbs";

interface IBreadCrumbsProps { }

const BreadCrumbs: React.FunctionComponent<IBreadCrumbsProps> = () => {
  const breadcrumbs = useReactRouterBreadcrumbs();

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
              {breadcrumbs[breadcrumbs.length - 1].breadcrumb}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
};

export default BreadCrumbs;
