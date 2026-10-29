import { Box, Layers, LayoutPanelTop, Shapes } from "lucide-react";
import { ComponentContext } from "@/rekuest/api/graphql";

/** How a blok's context is named and drawn on a card. */
export const BLOK_CONTEXTS: Record<ComponentContext, { label: string; icon: typeof Box }> = {
  [ComponentContext.Scene]: { label: "3D scene", icon: Box },
  [ComponentContext.Html]: { label: "Panel", icon: LayoutPanelTop },
  [ComponentContext.Logo]: { label: "Logo", icon: Shapes },
  [ComponentContext.ActionLogo]: { label: "Action logo", icon: Shapes },
  [ComponentContext.Overlay]: { label: "Run overlay", icon: Layers },
};

/** Whether a blok of `context` is a logo: drawn as a cached SVG (`BlokLogo`), not as a preview. */
export const isLogoContext = (context: ComponentContext): boolean =>
  context === ComponentContext.Logo || context === ComponentContext.ActionLogo;
