import * as React from "react";
import { NavLink } from "react-router-dom";
import useReactRouterBreadcrumbs from "use-react-router-breadcrumbs";

interface IBreadCrumbsProps {}

const BreadCrumbs: React.FunctionComponent<IBreadCrumbsProps> = (props) => {
  const breadcrumbs = useReactRouterBreadcrumbs();

  return (
    <>
      <div className="flex-initial sm:px-6  sm:py-3 py-2">
        {" "}
        {breadcrumbs.map(({ match, breadcrumb }) => (
          <span key={match.pathname}>
            <NavLink
              to={match.pathname}
              className={({ isActive }) =>
                "font-semibold text-md mb-2 cursor-pointer " +
                (isActive
                  ? "text-primary-400 dark:text-primary-200 "
                  : "text-black dark:text-slate-100")
              }
            >
              {breadcrumb}
            </NavLink>
            <span className="text-black dark:text-slate-100">{" > "}</span>
          </span>
        ))}
      </div>
    </>
  );
};

export default BreadCrumbs;
