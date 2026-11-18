import type { PortBlokRendererProps } from "@arkitektio/bsx/ports/widgets/custom/PortBlokWidget";
import type { ComponentType } from "react";

/**
 * How a port's own blok is drawn, given by the module that knows the run it is
 * drawn for. The host asks for it (`core/blok/portHost.tsx`) and may not import
 * a module; rekuest, whose agents and states such a blok reads, provides it
 * when it is installed (`rekuest/module.tsx`). Until then a port blok is drawn
 * by bsx's own renderer: its port and its sibling arguments, no agents.
 */
let given: ComponentType<PortBlokRendererProps> | null = null;

export const providePortBlokRenderer = (renderer: ComponentType<PortBlokRendererProps>): void => {
  given = renderer;
};

export const providedPortBlokRenderer = (): ComponentType<PortBlokRendererProps> | null => given;
