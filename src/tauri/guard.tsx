import React from "react";
import { useTauri } from "./context";

export const TauriGuard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ key, children, fallback }) => {
  const { intauri } = useTauri();

  if (intauri) return <>{children}</>;

  return <>{fallback}</>;
};

export const tauriGuarded = (
  Child: React.ComponentClass,
  fallback?: React.ReactNode
) => {
  return (props: any) => (
    <TauriGuard fallback={fallback}>
      <Child {...props} />
    </TauriGuard>
  );
};
