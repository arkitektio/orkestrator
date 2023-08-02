import React from "react";
import { useMikroNext } from "./MikroNextContext";

export const MikroNextGuard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ key, children, fallback }) => {
  const { client } = useMikroNext();

  if (client) return <>{children}</>;

  return <>{fallback}</>;
};

export const mikroNextGuarded = (
  Child: React.ComponentClass,
  fallback?: React.ReactNode
) => {
  return (props: any) => (
    <MikroNextGuard fallback={fallback}>
      <Child {...props} />
    </MikroNextGuard>
  );
};
