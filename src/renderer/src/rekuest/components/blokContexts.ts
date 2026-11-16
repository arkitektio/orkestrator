import { Box, LayoutPanelTop, Shapes } from "lucide-react";
import { ComponentContext } from "@/rekuest/api/graphql";

/** How a blok's context is named and drawn on a card. */
export const BLOK_CONTEXTS: Record<ComponentContext, { label: string; icon: typeof Box }> = {
  [ComponentContext.Scene]: { label: "3D scene", icon: Box },
  [ComponentContext.Panel]: { label: "Panel", icon: LayoutPanelTop },
  [ComponentContext.Logo]: { label: "Logo", icon: Shapes },
};

/** Whether a blok of `context` is a logo (an agent's or an action's): drawn as a cached SVG (`BlokLogo`), not as a preview. */
export const isLogoContext = (context: ComponentContext): boolean => context === ComponentContext.Logo;
