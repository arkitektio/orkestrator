import React from "react";
import { useRekuest } from "./RekuestContext";

export const RekuestGuard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ key, children, fallback }) => {
  const { client } = useRekuest();

  if (client && client != undefined) return <>{children}</>;

  return <>{fallback}</>;
};

export const rekuestGuarded = <T extends {}>(
  Child: React.ComponentType<T>,
  fallback?: React.ReactNode
) => {
  return (props: any) => (
    <RekuestGuard fallback={fallback}>
      <Child {...props} />
    </RekuestGuard>
  );
};
