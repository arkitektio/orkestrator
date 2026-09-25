import { Suspense, type ComponentType } from "react";

import { useDisplay } from "@/app/display";
import type { DisplayVariant, DisplayWidgetProps } from "@/lib/display/registry";
import { SmartLink } from "@/providers/smart/builder";

/**
 * Any structure, shown by the module that owns it: the host's slot for
 * cross-module UI. A kraph comment shows its author with
 * `<StructureDisplay identifier="@lok/user" id={sub} variant="chip" />` and
 * imports nothing from lok. Renders nothing when no module displays that
 * identifier (the module may not be installed).
 */
export const StructureDisplay = ({
  identifier,
  id,
  variant,
  small,
  className,
  link,
}: {
  identifier: string;
  /** Nothing to show without one (a creator that was never recorded). */
  id: string | null | undefined;
  variant?: DisplayVariant;
  small?: boolean;
  className?: string;
  /** Wrap it in a link to the structure's own page. */
  link?: boolean;
}) => {
  const { registry } = useDisplay();
  const Display = (registry as Record<string, ComponentType<DisplayWidgetProps> | undefined>)[identifier];
  if (!Display || !id) return null;
  const shown = (
    <Suspense fallback={null}>
      <Display identifier={identifier} id={id} variant={variant} small={small} className={className} />
    </Suspense>
  );
  return link ? (
    <SmartLink identifier={identifier} object={id}>
      {shown}
    </SmartLink>
  ) : (
    shown
  );
};
