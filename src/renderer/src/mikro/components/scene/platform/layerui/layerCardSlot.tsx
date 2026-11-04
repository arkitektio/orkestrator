import { createContext, useContext, type ComponentType, type ReactNode } from "react";

export type LayerCardSlotProps = {
  layerId: string;
  /** The card's remove: what removing means here (a staged layer is discarded). */
  onRemove: (id: string) => void;
  /** Open on mount. Default true: where it is drawn, it is what you came for. */
  defaultExpanded?: boolean;
  /** Extra buttons for the card's title bar (a staged layer's Keep). */
  headerActions?: ReactNode;
};

/**
 * A layer's ordinary card, for a feature that shows one outside the layer
 * panel (a float's staged layers). The cards are the shell's
 * (`shell/layerPanel`), and a feature may not import the shell, so the
 * viewport provides the component here. Null where nobody did: the feature
 * then draws its own, plainer row.
 */
export const LayerCardSlotContext = createContext<ComponentType<LayerCardSlotProps> | null>(null);
LayerCardSlotContext.displayName = "LayerCardSlotContext";

export const useLayerCardSlot = () => useContext(LayerCardSlotContext);

/**
 * Extra buttons a host puts in a layer card's title bar, first among its
 * actions — a staged layer's Keep. Every card's title bar reads it
 * (`LayerCardActions`, `LayerRow`); nothing provides it in the layer panel.
 */
export const LayerCardHeaderActionsContext = createContext<ReactNode>(null);
LayerCardHeaderActionsContext.displayName = "LayerCardHeaderActionsContext";

export const useLayerCardHeaderActions = () => useContext(LayerCardHeaderActionsContext);
