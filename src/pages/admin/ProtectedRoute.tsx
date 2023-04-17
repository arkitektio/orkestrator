import React from "react";
import { Route, RouteProps } from "react-router";
import { useHerre } from "@jhnnsrs/herre";

export type IProtectedRouteProps = RouteProps & {
  roles: [string];
};

const ProtectedRoute: React.FC<IProtectedRouteProps> = ({
  roles,
  children,
  ...props
}) => {
  const { user } = useHerre();

  return (
    <Route {...props}>
      {roles?.every((val) => user?.roles?.includes(val)) ? (
        children
      ) : (
        <> You Do not have permissions for this </>
      )}
    </Route>
  );
};

export { ProtectedRoute };
