import React from "react";
import { useLok } from "./LokContext";

export const LokGuard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ key, children, fallback }) => {
  const { client } = useLok();

  if (client) return <>{children}</>;

  return <>{fallback}</>;
};

export const manGuarded = (
  Child: React.ComponentClass,
  fallback?: React.ReactNode
) => {
  return (props: any) => (
    <LokGuard fallback={fallback}>
      <Child {...props} />
    </LokGuard>
  );
};
