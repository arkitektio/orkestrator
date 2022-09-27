import React from "react";
import { useHerre } from "./herre-context";

export const HerreGuard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ key, children, fallback }) => {
  const { user } = useHerre();

  if (user) return <>{children}</>;

  return <>{fallback || `No user login`}</>;
};

export const herreGuarded = (
  Child: React.ComponentClass,
  fallback?: React.ReactNode
) => {
  return (props: any) => (
    <HerreGuard fallback={fallback}>
      <Child {...props} />
    </HerreGuard>
  );
};
