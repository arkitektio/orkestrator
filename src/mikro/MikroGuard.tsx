import React from "react";
import { useMikro } from "./MikroContext";

export const MikroGuard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ key, children, fallback }) => {
  const { client } = useMikro();

  if (client) return <>{children}</>;

  return <>{fallback}</>;
};

export const mikroGuarded = (
  Child: React.ComponentClass,
  fallback?: React.ReactNode
) => {
  return (props: any) => (
    <MikroGuard fallback={fallback}>
      <Child {...props} />
    </MikroGuard>
  );
};
