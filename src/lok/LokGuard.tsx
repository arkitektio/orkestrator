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

export const lokGuarded = <T extends (props: any) => JSX.Element>(
  Child: T,
  fallback?: React.ReactNode
): T => {
  return ((props: any) => (
    <LokGuard fallback={fallback}>
      <Child {...props} />
    </LokGuard>
  )) as unknown as T;
};
