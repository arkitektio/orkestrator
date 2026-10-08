import { PaneLinkProps } from "@/core/ui/sidepane";
import { NavLinkProps } from "react-router-dom";
import { Object, Identifier } from "@/core/types";



export type OmitedNavLinkProps = Omit<NavLinkProps, "to">;
export type OmittedPaneLinkProps = Omit<PaneLinkProps, "to">;
export type BaseLinkProps = OmitedNavLinkProps;
export type ModelLinkProps<T extends Object> = OmitedNavLinkProps & {
  object: T;
  subroute?: string;
  subobject?: string;
  deeproute?: string;
};


export type SmartPaneLinkProps<T extends Object> = OmittedPaneLinkProps & {
  object: T;
  subroute?: string;
  subobject?: string;
  deeproute?: string;
};

export interface SmartModelProps {
  identifier: Identifier;
  object: Object;
  children: React.ReactNode;
  containerClassName?: string;
  hover?: boolean;
  /**
   * Shows a small burger in the card's bottom-right corner while it is hovered, which
   * opens the card's right-click menu. Never shown inside the page sidebar.
   */
  menuButton?: boolean;
  className?: string;
}

/** Props of a `Smart` / `Drop` built for one model: the identifier is baked in. */
export interface CreatedSmartSmartProps<T extends Object>
  extends Omit<SmartModelProps, "identifier"> {
  object: T;
}
