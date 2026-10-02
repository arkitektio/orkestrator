import type React from "react";
import { Suspense, type ComponentType } from "react";

import { useModuleHostVersion } from "@/core/modules/host/host";
import { MODULE_VIEWERS } from "@/core/modules/registries";
import type { ViewerWidgetProps } from "@/core/smart/display/registry";

/**
 * Any structure, opened in the viewer of the module that owns it: the host's
 * slot for looking at another module's object (a mikro image in a blok) without
 * importing that module. The viewer fills its parent, which must have a height.
 * Renders `fallback` when no module has a viewer for that identifier.
 */
export const StructureViewer = ({
  identifier,
  id,
  controls,
  className,
  fallback = null,
}: {
  identifier: string;
  /** Nothing to open without one. */
  id: string | null | undefined;
  controls?: boolean;
  className?: string;
  /**
   * Shown when nothing can open it: no module has a viewer for this
   * identifier, or the owning module's service is not ready.
   */
  fallback?: React.ReactNode;
}) => {
  useModuleHostVersion();
  const Viewer = (MODULE_VIEWERS as Record<string, ComponentType<ViewerWidgetProps> | undefined>)[identifier];
  if (!id) return null;
  if (!Viewer) return <>{fallback}</>;
  return (
    <Suspense fallback={fallback}>
      <Viewer identifier={identifier} id={id} controls={controls} className={className} fallback={fallback} />
    </Suspense>
  );
};
