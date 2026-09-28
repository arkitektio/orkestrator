import { useDndEngine } from "@/core/dnd/react";

export type SmartProviderProps = {
  children: React.ReactNode;
};

/**
 * Drag and drop for everything beneath. There is no context to provide — the
 * engine listens on the document — so this only turns it on, once per window.
 */
export const SmartProvider = (props: SmartProviderProps) => {
  useDndEngine();
  return <>{props.children}</>;
};
