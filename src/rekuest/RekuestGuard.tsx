import React from "react";
import { useRekuest } from "./RekuestContext";

export const RekuestGuard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ key, children, fallback }) => {
  const { client } = useRekuest();

  if (client) return <>{children}</>;

  return <>{fallback || `Not yet with Rekuest`}</>;
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
