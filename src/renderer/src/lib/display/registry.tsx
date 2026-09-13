import { Identifier } from "@/types";
import React, { createContext, useContext } from "react";

export type DisplayWidgetProps = {
  identifier: Identifier;
  object: string;
  small?: boolean; // Optional prop for small display
  context?: "command" | "widget"; // "command" = compact, "widget" = full display
};

export type HookWidget = (props: { value: string }) => React.ReactNode;

// --- Factory Function Following Dialog Provider Pattern ---
export function createDisplayProvider<
  TRegistry extends Record<string, React.ComponentType<DisplayWidgetProps>>,
>(registry: TRegistry) {
  type DisplayId = keyof TRegistry;

  const DisplayContext = createContext<{
    registry: TRegistry;
  }>({
    registry,
  });

  const useDisplay = () => useContext(DisplayContext);

  const useDisplayComponent = (identifier: DisplayId) => {
    const { registry } = useDisplay();
    return (
      registry[identifier] ||
      (() => <div>Display not found for {String(identifier)}</div>)
    );
  };

  // The registry is a module constant, so the context value can be too.
  const displayContextValue = { registry };

  const DisplayProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    return (
      <DisplayContext.Provider value={displayContextValue}>
        {children}
      </DisplayContext.Provider>
    );
  };

  return {
    DisplayProvider,
    useDisplay,
    useDisplayComponent,
    registry,
  };
}
