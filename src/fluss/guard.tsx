import React from "react";
import { useFluss } from "./fluss-context";

export const FlussGuard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ key, children, fallback }) => {
  const { client } = useFluss();

  if (client) return <>{children}</>;

  return <>{fallback}</>;
};

export const flussGuarded = (
  Child: React.ComponentClass,
  fallback?: React.ReactNode
) => {
  return (props: any) => (
    <FlussGuard fallback={fallback}>
      <Child {...props} />
    </FlussGuard>
  );
};
