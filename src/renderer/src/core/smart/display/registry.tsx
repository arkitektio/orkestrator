import { Identifier } from "@/core/types";
import React, { createContext, useContext } from "react";

/**
 * What a display surface is handed (module spec: `display` gets
 * `{ identifier, id, small }`). The display fetches the rest itself from its
 * own service; nothing else about the object crosses the border.
 */
export type DisplayWidgetProps = {
  identifier: Identifier;
  id: string;
  small?: boolean; // Optional prop for small display
  /**
   * SPEC ADDITION: how much of the object to show where it is embedded in
   * someone else's UI. "inline": its name, as text; "avatar": its picture;
   * "chip": picture and name; "card" (default): the full display. A display
   * that knows no variant renders its default.
   */
  variant?: DisplayVariant;
  /**
   * SPEC ADDITION: which of the model's keys `id` is, when the caller holds a
   * foreign key rather than the model's own id (lok clients by their OAuth
   * `clientId`, devices by `nodeId`). Absent: the model's own id.
   */
  by?: string;
  className?: string;
  /** Shown instead while the owning module's service is not ready. */
  fallback?: React.ReactNode;
  context?: "command" | "widget"; // "command" = compact, "widget" = full display
};

export type DisplayVariant = "inline" | "avatar" | "chip" | "card";

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
