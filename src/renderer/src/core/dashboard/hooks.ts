import { useEffect } from "react";
import {
  DashboardWidgetRegistration,
  useDashboardRegistry,
} from "./store";

/**
 * Hook for modules to register a dashboard widget.
 * Call this once in each module's top-level component.
 * The widget is unregistered on unmount.
 */
export const useRegisterDashboardWidget = (
  widget: DashboardWidgetRegistration,
) => {
  const register = useDashboardRegistry((s) => s.register);
  const unregister = useDashboardRegistry((s) => s.unregister);

  useEffect(() => {
    register(widget);
    return () => unregister(widget.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.key]);
};
