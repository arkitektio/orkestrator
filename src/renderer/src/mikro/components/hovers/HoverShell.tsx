import { WithMikroMediaUrl } from "@/lib/datalayer/mikroAccess";
import { cn } from "@/lib/utils";
import React from "react";

// Re-export the generic hover chrome so the mikro hover cards can keep
// importing everything they need from a single module.
export {
  HoverRow,
  HoverSectionLabel,
  HoverShell,
  HoverSkeleton,
} from "@/components/hover/HoverShell";

/**
 * The schema hands `SceneSnapshot.majorColor` over as RGB in 0..1 — the same
 * convention as the scene background — so it needs scaling before CSS will
 * take it. Undefined for a snapshot the server never computed one for.
 */
const majorColorCss = (majorColor?: readonly number[] | null) => {
  if (!majorColor || majorColor.length < 3) return undefined;
  const [red, green, blue] = majorColor;
  return `rgb(${red * 255} ${green * 255} ${blue * 255})`;
};

/**
 * A snapshot thumbnail backed by the mikro media layer.
 *
 * `tint` is the snapshot's dominant colour, and it sits UNDER the image rather
 * than beside it: a snapshot resolves through credentials plus a signed S3
 * fetch, so there is a real window where the box is empty, and settling from
 * the picture's own dominant colour into the picture reads as loading where a
 * flash of grey reads as broken. It is also what the box keeps when a dataset
 * has no snapshot at all — the common case, since a dataset only borrows a
 * picture from the scene it nominates.
 */
export const HoverThumb = ({
  media,
  alt,
  tint,
  className,
}: {
  media: React.ComponentProps<typeof WithMikroMediaUrl>["media"];
  alt: string;
  tint?: readonly number[] | null;
  className?: string;
}) => {
  const background = majorColorCss(tint);

  if (!media) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center text-[9px] text-muted-foreground",
          className,
        )}
        style={background ? { background } : undefined}
      >
        {background ? null : "—"}
      </div>
    );
  }

  return (
    <WithMikroMediaUrl media={media}>
      {(url) => (
        <img
          src={url}
          alt={alt}
          className={cn("object-cover bg-muted", className)}
          style={background ? { background } : undefined}
        />
      )}
    </WithMikroMediaUrl>
  );
};
