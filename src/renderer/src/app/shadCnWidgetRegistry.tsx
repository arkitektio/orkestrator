import { ChoicesWidget } from "@/components/widgets/custom/ChoicesWidget";
import { CustomWidget } from "@/components/widgets/custom/CustomWidget";
import { ProxyWidget } from "@/components/widgets/custom/ProxyWidget";
import { SearchWidget } from "@/components/widgets/custom/SearchWidget";
import { SliderWidget } from "@/components/widgets/custom/SliderWidget";
import { StateChoiceWidget } from "@/components/widgets/custom/StateChoiceWidget";
import { HideEffect } from "@/components/widgets/effects/HideEffect";
import { BoolWidget } from "@/components/widgets/fallbacks/BoolWidget";
import { DateWidget } from "@/components/widgets/fallbacks/DateWidget";
import { DictWidget } from "@/components/widgets/fallbacks/DictWidget";
import { EnumWidget } from "@/components/widgets/fallbacks/EnumWidget";
import { FloatWidget } from "@/components/widgets/fallbacks/FloatWidget";
import { IntWidget } from "@/components/widgets/fallbacks/IntWidget";
import { ListWidget } from "@/components/widgets/fallbacks/ListWidget";
import { MemoryStructureWidget } from "@/components/widgets/fallbacks/MemoryStructureWidget";
import { ModelWidget } from "@/components/widgets/fallbacks/ModelWidget";
import { QuantityWidget } from "@/components/widgets/fallbacks/QuantityWidget";
import { StringWidget } from "@/components/widgets/fallbacks/StringWidget";
import { StructureWidget } from "@/components/widgets/fallbacks/StructureWidget";
import { UnionWidget } from "@/components/widgets/fallbacks/UnionWidget";
import { DelegatingStructureWidget } from "@/components/widgets/returns/DelegatingStructureWidget";
import { BoolReturnWidget } from "@/components/widgets/returns/fallbacks/BoolReturnWidget";
import { DateReturnWidget } from "@/components/widgets/returns/fallbacks/DateReturnWidget";
import { EnumReturnWidget } from "@/components/widgets/returns/fallbacks/EnumReturnWidget";
import { FloatReturnWidget } from "@/components/widgets/returns/fallbacks/FloatReturnWidget";
import { IntReturnWidget } from "@/components/widgets/returns/fallbacks/IntReturnWidget";
import { ListReturnWidget } from "@/components/widgets/returns/fallbacks/ListReturnWidget";
import { MemoryStructureReturnWidget } from "@/components/widgets/returns/fallbacks/MemoryStructureReturnWidget";
import { ModelReturnWidget } from "@/components/widgets/returns/fallbacks/ModelReturnWidget";
import { QuantityReturnWidget } from "@/components/widgets/returns/fallbacks/QuantityReturnWidget";
import { StringReturnWidget } from "@/components/widgets/returns/fallbacks/StringReturnWidget";
import { UnionReturnWidget } from "@/components/widgets/returns/fallbacks/UnionReturnWidget";
import { PortKind } from "@/rekuest/api/graphql";
import { WidgetRegistry } from "@/rekuest/widgets/Registry";
import {
  EffectWidgetProps,
  InputWidgetProps,
  ReturnWidgetProps,
  WidgetRegistryType,
} from "@/rekuest/widgets/types";

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
