import { AppMark, MarkCanvas } from "@/lib/marks";
import { cn } from "@/lib/utils";
import { useTabVisible } from "@/command/tabs/TabVisibilityContext";
import type { AppIdentity } from "../appIdentity";

/**
 * An app's mark, drawn live rather than rasterised.
 *
 * At most ONE of these per page. Lists go through `AppIcon`/`useMarkImage`
 * instead — browsers cap live WebGL contexts at roughly 8-16 and silently drop
 * the oldest past that, so a grid of these would lose most of its icons.
 *
 * Always lazy-loaded by its page, so a kabinet route only pulls three and the
 * mark data when an app actually lands on it without a logo.
 */
export const AppMarkCanvas = ({
  app,
  className,
}: {
  app: Pick<AppIdentity, "name" | "identifier" | "embedding">;
  className?: string;
}) => {
  // Mounted but off-screen must not schedule frames. At rest a demand loop
  // already draws nothing; "never" also stops the stray frame a resize would
  // otherwise trigger.
  const visible = useTabVisible();

  return (
    <div className={cn("relative size-24 shrink-0", className)}>
      <MarkCanvas frameloop={visible ? "demand" : "never"} className="!absolute inset-0">
        <AppMark name={app.name} identifier={app.identifier} embedding={app.embedding} />
      </MarkCanvas>
    </div>
  );
};

export default AppMarkCanvas;
