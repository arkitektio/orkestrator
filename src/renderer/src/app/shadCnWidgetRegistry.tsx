import { asWidgetRegistry, createWidgetRegistry } from "@arkitektio/bsx/ports/engine/defaultRegistry";
import type { WidgetRegistryType } from "@arkitektio/bsx/ports/engine/types";
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
