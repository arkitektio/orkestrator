import { asWidgetRegistry, createWidgetRegistry } from "@arkitektio/bsx/ports/engine/defaultRegistry";
import type { WidgetRegistryType } from "@arkitektio/bsx/ports/engine/types";
import { WidgetRegistryProvider } from "@arkitektio/bsx/ports/engine/WidgetsProvider";
import { useMemo, type ReactNode } from "react";
import { Arkitekt } from "@/core/connection/arkitekt/host";
import { findOptionSource } from "@/core/modules/registries";
import { PortKind } from "@/rekuest/api/graphql";
import { MemoryStructureReturnWidget } from "@/rekuest/ports/MemoryStructureReturnWidget";
import { MemoryStructureWidget } from "@/rekuest/ports/MemoryStructureWidget";
import { StateChoiceWidget } from "@/rekuest/ports/StateChoiceWidget";

// A port with no widget gets the picker when its module answers a search.
const registry = createWidgetRegistry({
  canPick: (identifier) => findOptionSource(identifier) !== undefined,
});

// What only this app draws: both read rekuest through this app's own client.
registry.registerInputWidgetFallback(PortKind.MemoryStructure, MemoryStructureWidget);
registry.registerInputWidget("StateChoiceAssignWidget", StateChoiceWidget);
registry.registerReturnWidgetFallback(PortKind.MemoryStructure, MemoryStructureReturnWidget);

export const THE_WIDGET_REGISTRY: WidgetRegistryType = asWidgetRegistry(registry);

/**
 * The widget registry, with the connection's wards: a search widget asks it
 * for "mikro" and gets the Arkitekt provider's ward, which reaches the live
 * service when it runs. Nothing is registered into it, so nothing can go stale.
 */
export const AppWidgetRegistryProvider = ({ children }: { children: ReactNode }) => {
  const wards = Arkitekt.useConnectionWards();
  const withWards = useMemo<WidgetRegistryType>(
    () => ({ ...THE_WIDGET_REGISTRY, getWard: (key) => wards[key] ?? THE_WIDGET_REGISTRY.getWard(key) }),
    [wards],
  );
  return <WidgetRegistryProvider registry={withWards}>{children}</WidgetRegistryProvider>;
};
