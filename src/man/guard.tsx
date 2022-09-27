import React from "react";
import { useMan } from "./context";

export const ManGuard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ key, children, fallback }) => {
  const { client } = useMan();

  if (client) return <>{children}</>;

  return <>{fallback || `Not yet with Arkitekt`}</>;
};

export const manGuarded = (
  Child: React.ComponentClass,
  fallback?: React.ReactNode
) => {
  return (props: any) => (
    <ManGuard fallback={fallback}>
      <Child {...props} />
    </ManGuard>
  );
};
