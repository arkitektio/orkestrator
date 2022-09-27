import { useEffect, useState } from "react";
import { PortKind } from "../api/graphql";
import { WardRegistry } from "../ward_registry";
import { ChoiceWidget } from "./inputs/additionals/ChoiceWidget";
import { SearchWidget } from "./inputs/additionals/SearchWidget";
import { SliderWidget } from "./inputs/additionals/SliderWidget";
import { BoolWidget } from "./inputs/fallbacks/BoolWidget";
import { IntWidget } from "./inputs/fallbacks/IntWidget";
import { ListWidget } from "./inputs/fallbacks/ListWidget";
import { StringWidget } from "./inputs/fallbacks/StringWidget";
import { StructureWidget } from "./inputs/fallbacks/StructureWidget";
import { WidgetRegistry } from "./registry";
import { CustomReturnWidget } from "./returns/additionals/CustomReturnWidget";
import { ImageReturnWidget } from "./returns/additionals/ImageReturnWidget";
import { BoolReturnWidget } from "./returns/fallbacks/BoolReturnWidget";
import { IntReturnWidget } from "./returns/fallbacks/IntReturnWidget";
import { ListReturnWidget } from "./returns/fallbacks/ListReturnWidget";
import { StringReturnWidget } from "./returns/fallbacks/StringReturnWidget";
import { StructureReturnWidget } from "./returns/fallbacks/StructureReturnWidget";
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
    x.registerInputWidgetFallback(PortKind.Bool, BoolWidget);
    x.registerInputWidgetFallback(PortKind.Structure, StructureWidget);
    x.registerInputWidgetFallback(PortKind.List, ListWidget);

    x.registerInputWidget("SearchWidget", SearchWidget);
    x.registerInputWidget("StringWidget", StringWidget);
    x.registerInputWidget("SliderWidget", SliderWidget);
    x.registerInputWidget("ChoiceWidget", ChoiceWidget);

    x.registerReturnWidgetFallback(PortKind.String, StringReturnWidget);
    x.registerReturnWidgetFallback(PortKind.Int, IntReturnWidget);
    x.registerReturnWidgetFallback(PortKind.Bool, BoolReturnWidget);
    x.registerReturnWidgetFallback(PortKind.Structure, StructureReturnWidget);
    x.registerReturnWidgetFallback(PortKind.List, ListReturnWidget);

    x.registerReturnWidget("ImageReturnWidget", ImageReturnWidget);
    x.registerReturnWidget("CustomReturnWidget", CustomReturnWidget);

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
