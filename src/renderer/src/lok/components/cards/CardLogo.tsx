import type { LucideIcon } from "lucide-react";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { cn } from "@/core/util/utils";

/**
 * A lok object's logo (an app's, a client's, a service's) in a card: the
 * uploaded picture when it has one, else the kind's glyph. Small in the
 * header, large and faint as the card's watermark.
 */
export const CardLogo = ({
  url,
  icon: Icon,
  className,
}: {
  url?: string | null;
  icon: LucideIcon;
  className?: string;
}) => {
  const resolve = useLokResolve();
  const src = url ? resolve(url) : undefined;
  return src ? (
    <img src={src as string} alt="" className={cn("object-contain", className)} draggable={false} />
  ) : (
    <Icon className={className} strokeWidth={1.5} />
  );
};
