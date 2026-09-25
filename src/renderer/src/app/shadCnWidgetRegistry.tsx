import { ChoicesWidget } from "@/core/components/ports/custom/ChoicesWidget";
import { CustomWidget } from "@/core/components/ports/custom/CustomWidget";
import { ProxyWidget } from "@/core/components/ports/custom/ProxyWidget";
import { SearchWidget } from "@/core/components/ports/custom/SearchWidget";
import { SliderWidget } from "@/core/components/ports/custom/SliderWidget";
import { StateChoiceWidget } from "@/rekuest/ports/StateChoiceWidget";
import { HideEffect } from "@/core/components/ports/effects/HideEffect";
import { BoolWidget } from "@/core/components/ports/fallbacks/BoolWidget";
import { DateWidget } from "@/core/components/ports/fallbacks/DateWidget";
import { DictWidget } from "@/core/components/ports/fallbacks/DictWidget";
import { EnumWidget } from "@/core/components/ports/fallbacks/EnumWidget";
import { FloatWidget } from "@/core/components/ports/fallbacks/FloatWidget";
import { IntWidget } from "@/core/components/ports/fallbacks/IntWidget";
import { ListWidget } from "@/core/components/ports/fallbacks/ListWidget";
import { MemoryStructureWidget } from "@/rekuest/ports/MemoryStructureWidget";
import { ModelWidget } from "@/core/components/ports/fallbacks/ModelWidget";
import { QuantityWidget } from "@/core/components/ports/fallbacks/QuantityWidget";
import { StringWidget } from "@/core/components/ports/fallbacks/StringWidget";
import { StructureWidget } from "@/core/components/ports/fallbacks/StructureWidget";
import { UnionWidget } from "@/core/components/ports/fallbacks/UnionWidget";
import { DelegatingStructureWidget } from "@/core/components/ports/returns/DelegatingStructureWidget";
import { BoolReturnWidget } from "@/core/components/ports/returns/fallbacks/BoolReturnWidget";
import { DateReturnWidget } from "@/core/components/ports/returns/fallbacks/DateReturnWidget";
import { EnumReturnWidget } from "@/core/components/ports/returns/fallbacks/EnumReturnWidget";
import { FloatReturnWidget } from "@/core/components/ports/returns/fallbacks/FloatReturnWidget";
import { IntReturnWidget } from "@/core/components/ports/returns/fallbacks/IntReturnWidget";
import { ListReturnWidget } from "@/core/components/ports/returns/fallbacks/ListReturnWidget";
import { MemoryStructureReturnWidget } from "@/rekuest/ports/MemoryStructureReturnWidget";
import { ModelReturnWidget } from "@/core/components/ports/returns/fallbacks/ModelReturnWidget";
import { QuantityReturnWidget } from "@/core/components/ports/returns/fallbacks/QuantityReturnWidget";
import { StringReturnWidget } from "@/core/components/ports/returns/fallbacks/StringReturnWidget";
import { UnionReturnWidget } from "@/core/components/ports/returns/fallbacks/UnionReturnWidget";
import { PortKind } from "@/rekuest/api/graphql";
import { WidgetRegistry } from "@/core/lib/ports/Registry";
import {
  EffectWidgetProps,
  InputWidgetProps,
  ReturnWidgetProps,
  WidgetRegistryType,
} from "@/core/lib/ports/types";

export const UnknownInputWidget = ({ port }: InputWidgetProps) => {
  return (
    <div className="text-xl bg-red-200">
      Registry error! No assign Widget registered for: {port.kind} and{" "}
      {port?.widget?.__typename || "unset widget"}
    </div>
  );
};

export const UnknownReturnWidget = ({ port }: ReturnWidgetProps) => {
  return (
    <div className="text-xl bg-red-200">
      Registry error! No assign Widget registered for: {port.kind} and{" "}
      {port?.widget?.__typename || "unset widget"}
    </div>

  );
};

export const UnknownEffectWidget = ({
  children,
  effect,
}: EffectWidgetProps) => {
  return (
    <div className="text-xl bg-red-200">
      Registry error! No effect registered for: {effect.kind}
      {children}
    </div>
  );
};

// HideEffect only knows how to render the "HideEffect" variant of the
// PortEffectFragment union, so narrow to that variant before delegating.
const HideEffectAdapter = ({ effect, port, path, children }: EffectWidgetProps) => {
  if (effect.__typename !== "HideEffect") {
    return null;
  }
  return (
    <HideEffect effect={effect} port={port} path={path}>
      {children}
    </HideEffect>
  );
};

// BoolReturnWidget narrows its value to boolean; the registry hands widgets
// the generic ValueKind, so coerce before delegating.
const BoolReturnWidgetAdapter = (props: ReturnWidgetProps<any>) => {
  return <BoolReturnWidget {...props} value={Boolean(props.value)} />;
};

const registry = new WidgetRegistry(
  UnknownInputWidget,
  UnknownReturnWidget,
  UnknownEffectWidget,
);

registry.registerReturnWidgetFallback(
  PortKind.Structure,
  DelegatingStructureWidget,
);

registry.registerInputWidgetFallback(PortKind.Int, IntWidget);
registry.registerInputWidgetFallback(PortKind.List, ListWidget);
registry.registerInputWidgetFallback(PortKind.Bool, BoolWidget);
registry.registerInputWidgetFallback(PortKind.Date, DateWidget);
registry.registerInputWidgetFallback(PortKind.Enum, EnumWidget);
registry.registerInputWidgetFallback(PortKind.Union, UnionWidget);
registry.registerInputWidgetFallback(PortKind.Dict, DictWidget);
registry.registerInputWidgetFallback(PortKind.Model, ModelWidget);
registry.registerInputWidgetFallback(PortKind.Float, FloatWidget);
registry.registerInputWidgetFallback(PortKind.Quantity, QuantityWidget);
registry.registerInputWidgetFallback(
  PortKind.String,
  StringWidget,
);
registry.registerInputWidgetFallback(
  PortKind.MemoryStructure,
  MemoryStructureWidget,
);
registry.registerInputWidgetFallback(
  PortKind.Structure,
  StructureWidget,
);

registry.registerEffectWidget("HideEffect", HideEffectAdapter);

registry.registerInputWidget("SearchAssignWidget", SearchWidget);
registry.registerInputWidget("SliderAssignWidget", SliderWidget);

registry.registerInputWidget(
  "ChoiceAssignWidget",
  ChoicesWidget,
);

registry.registerInputWidget(
  "StateChoiceAssignWidget",
  StateChoiceWidget,
);

registry.registerInputWidget("ProxyWidget", ProxyWidget);
registry.registerInputWidget("StringAssignWidget", StringWidget);
registry.registerInputWidget("CustomAssignWidget", CustomWidget);

registry.registerReturnWidgetFallback(
  PortKind.Int,
  IntReturnWidget,
);
registry.registerReturnWidgetFallback(
  PortKind.Float,
  FloatReturnWidget,
);
registry.registerReturnWidgetFallback(PortKind.Quantity, QuantityReturnWidget);
registry.registerReturnWidgetFallback(
  PortKind.String,
  StringReturnWidget,
);
registry.registerReturnWidgetFallback(
  PortKind.Model,
  ModelReturnWidget,
);


registry.registerReturnWidgetFallback(
  PortKind.List,
  ListReturnWidget,
);
registry.registerReturnWidgetFallback(
  PortKind.Bool,
  BoolReturnWidgetAdapter,
);
registry.registerReturnWidgetFallback(
  PortKind.Date,
  DateReturnWidget,
);

registry.registerReturnWidgetFallback(
  PortKind.Enum,
  EnumReturnWidget,
);
registry.registerReturnWidgetFallback(
  PortKind.Union,
  UnionReturnWidget,
);

registry.registerReturnWidgetFallback(
  PortKind.Structure,
  DelegatingStructureWidget,
);


registry.registerReturnWidgetFallback(
  PortKind.MemoryStructure,
  MemoryStructureReturnWidget,
);

// `WidgetRegistry.getInputWidgetForPort` / `getReturnWidgetForPort` are typed
// against the specific `ArgPort` / `ReturnPort` fragments, while
// `WidgetRegistryType` (consumed by `WidgetRegistryProvider`) works over the
// broader `MappablePort` union. Narrow on `__typename` before delegating.
export const THE_WIDGET_REGISTRY: WidgetRegistryType = {
  registerWard: (wardKey, ward) => registry.registerWard(wardKey, ward),
  getWard: (wardKey) => registry.getWard(wardKey),
  registerInputWidget: (widgetType, widget) =>
    registry.registerInputWidget(widgetType, widget),
  registerInputWidgetFallback: (portType, widget) =>
    registry.registerInputWidgetFallback(portType, widget),
  registerReturnWidget: (widgetType, widget) =>
    registry.registerReturnWidget(widgetType, widget),
  registerEffectWidget: (effectType, widget) =>
    registry.registerEffectWidget(effectType, widget),
  registerReturnWidgetFallback: (portType, widget) =>
    registry.registerReturnWidgetFallback(portType, widget),
  getReturnWidgetForPort: (port, allowFallback) => {
    if (port.__typename !== "ReturnPort") {
      return UnknownReturnWidget;
    }
    return registry.getReturnWidgetForPort(port, allowFallback);
  },
  getInputWidgetForPort: (port, allowFallback) => {
    if (port.__typename !== "ArgPort") {
      return UnknownInputWidget;
    }
    return registry.getInputWidgetForPort(port, allowFallback);
  },
  getEffectWidget: (effectType) => registry.getEffectWidget(effectType),
};
