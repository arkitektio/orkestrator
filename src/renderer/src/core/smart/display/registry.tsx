import type { Identifier, Structure } from "@/core/types";
import React, { createContext, useContext } from "react";
import { DisplayLinePlaceholder } from "./DisplayLine";

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
   * "chip": picture and name; "card" (default): the full display; "embed":
   * the object itself, live, in someone else's flow (a blok in a chat
   * message). A display that knows no variant renders its default.
   */
  variant?: DisplayVariant;
  /**
   * SPEC ADDITION: the objects shown together with this one (a message's
   * other attachments). An embed may open itself on them, e.g. a blok on the
   * image it was posted with.
   */
  alongside?: readonly Structure[];
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

export type DisplayVariant = "inline" | "avatar" | "chip" | "card" | "embed";

/**
 * Whether a display shows its full card: no variant, "card", or "embed" (an
 * object with no live embed of its own shows its card there).
 */
export const showsCard = (variant: DisplayVariant | undefined): boolean =>
  !variant || variant === "card" || variant === "embed";

/**
 * What a viewer surface is handed: like a display, but the object itself to
 * look at and move around in (an image, a scene), not a card that names it.
 * It fills the box it is mounted in, so the caller gives that box a height.
 */
export type ViewerWidgetProps = {
  identifier: Identifier;
  id: string;
  /** The viewer's own panels and tools; `false` leaves only the object. */
  controls?: boolean;
  className?: string;
  /** Shown instead while the owning module's service is not ready. */
  fallback?: React.ReactNode;
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
    // No module displays it (or none is installed): its model's name and id
    // rather than a "not found" in a task result or the Knowledge sidebar.
    return registry[identifier] || DisplayLinePlaceholder;
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
