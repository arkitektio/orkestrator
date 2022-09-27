import React from "react";
import { useHealthz } from "./context";

export const HealthzGuard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ key, children, fallback }) => {
  const { errors } = useHealthz();

  if (!errors) return <>{children}</>;

  return <>{fallback || `No user login`}</>;
};

export const healthzGuarded = (
  Child: React.ComponentClass,
  fallback?: React.ReactNode
) => {
  return (props: any) => (
    <HealthzGuard fallback={fallback}>
      <Child {...props} />
    </HealthzGuard>
  );
};
