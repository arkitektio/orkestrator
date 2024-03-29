import { useEffect, useState } from "react";
import { PortKind } from "../api/graphql";
import { ChoiceWidget } from "./inputs/additionals/ChoiceWidget";
import { EnhancedStringWidget } from "./inputs/additionals/EnhancedStringWidget";
import { SearchWidget } from "./inputs/additionals/SearchWidget";
import { SliderWidget } from "./inputs/additionals/SliderWidget";
import { BoolWidget } from "./inputs/fallbacks/BoolWidget";
import { DateWidget } from "./inputs/fallbacks/DateWidget";
import { FloatWidget } from "./inputs/fallbacks/FloatWidget";
import { IntWidget } from "./inputs/fallbacks/IntWidget";
import { ListWidget } from "./inputs/fallbacks/ListWidget";
import { StringWidget } from "./inputs/fallbacks/StringWidget";
import { StructureWidget } from "./inputs/fallbacks/StructureWidget";
import { UnionWidget } from "./inputs/fallbacks/UnionWidget";
import { WidgetRegistry } from "./registry";
import { ChoiceReturnWidget } from "./returns/additionals/ChoiceReturnWidget";
import { CustomReturnWidget } from "./returns/additionals/CustomReturnWidget";
import { ImageReturnWidget } from "./returns/additionals/ImageReturnWidget";
import { BoolReturnWidget } from "./returns/fallbacks/BoolReturnWidget";
import { FloatReturnWidget } from "./returns/fallbacks/FloatReturnWidget";
import { IntReturnWidget } from "./returns/fallbacks/IntReturnWidget";
import { ListReturnWidget } from "./returns/fallbacks/ListReturnWidget";
import { StringReturnWidget } from "./returns/fallbacks/StringReturnWidget";
import { StructureReturnWidget } from "./returns/fallbacks/StructureReturnWidget";
import { UnionReturnWidget } from "./returns/fallbacks/UnionReturnWidget";
import { WidgetRegistryContext } from "./widget-context";

export type WidgetRegistryProviderProps = { children: React.ReactNode };

export const WidgetRegistryProvider: React.FC<WidgetRegistryProviderProps> = ({
  children,
}) => {
  const [widgetRegistry, setWidgetRegistry] = useState<
    WidgetRegistry | undefined
  >();

  useEffect(() => {
    let x = new WidgetRegistry();

    x.registerInputWidgetFallback(PortKind.String, StringWidget);
    x.registerInputWidgetFallback(PortKind.Int, IntWidget);
    x.registerInputWidgetFallback(PortKind.Float, FloatWidget);
    x.registerInputWidgetFallback(PortKind.Bool, BoolWidget);
    x.registerInputWidgetFallback(PortKind.Structure, StructureWidget);
    x.registerInputWidgetFallback(PortKind.Union, UnionWidget);
    x.registerInputWidgetFallback(PortKind.List, ListWidget);
    x.registerInputWidgetFallback(PortKind.Date, DateWidget);

    x.registerInputWidget("SearchWidget", SearchWidget);
    x.registerInputWidget("StringWidget", EnhancedStringWidget);
    x.registerInputWidget("SliderWidget", SliderWidget);
    x.registerInputWidget("ChoiceWidget", ChoiceWidget);

    x.registerReturnWidgetFallback(PortKind.String, StringReturnWidget);
    x.registerReturnWidgetFallback(PortKind.Int, IntReturnWidget);
    x.registerReturnWidgetFallback(PortKind.Bool, BoolReturnWidget);
    x.registerReturnWidgetFallback(PortKind.Structure, StructureReturnWidget);
    x.registerReturnWidgetFallback(PortKind.List, ListReturnWidget);
    x.registerReturnWidgetFallback(PortKind.Float, FloatReturnWidget);
    x.registerReturnWidgetFallback(PortKind.Union, UnionReturnWidget);

    x.registerReturnWidget("ImageReturnWidget", ImageReturnWidget);
    x.registerReturnWidget("CustomReturnWidget", CustomReturnWidget);
    x.registerReturnWidget("ChoiceReturnWidget", ChoiceReturnWidget);

    setWidgetRegistry(x);
  }, []);

  return (
    <WidgetRegistryContext.Provider
      value={{
        registry: widgetRegistry,
      }}
    >
      {children}
    </WidgetRegistryContext.Provider>
  );
};
