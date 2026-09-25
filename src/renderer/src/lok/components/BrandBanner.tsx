import { acceptsFiles } from "@/core/lib/dnd/files";
import { useCanDrop, useDropTarget } from "@/core/lib/dnd/react";
import { cn } from "@/core/lib/utils";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useRef } from "react";
import type { useLokImageUpload } from "../hooks/useLokImageUpload";

/**
 * The colour field across the top of a Team page, painted in a brand.
 *
 * `hue` / `chroma` re-scope `--brand-hue` / `--brand-chroma` to the banner
 * alone, so a member's page shows THEIR colour for this organization while the
 * rest of the app keeps the viewer's. Left out, the banner inherits the app's
 * brand — which, on the Team page, is the organization's already.
 */
export const BrandBanner = ({
  hue,
  chroma,
  className,
}: {
  hue?: number | null;
  chroma?: number | null;
  className?: string;
}) => {
  const style: Record<string, string> = {
    backgroundImage: [
      // Two soft light sources, a little apart in hue, so the field has depth
      // rather than reading as one flat swatch.
      "radial-gradient(110% 150% at 0% 0%, oklch(0.72 calc(var(--brand-chroma) * 1.1) var(--brand-hue) / 0.55), transparent 62%)",
      "radial-gradient(90% 130% at 100% 100%, oklch(0.62 var(--brand-chroma) calc(var(--brand-hue) + 45) / 0.45), transparent 60%)",
      "linear-gradient(135deg, oklch(0.6 calc(var(--brand-chroma) * 0.6) var(--brand-hue) / 0.3), oklch(0.45 calc(var(--brand-chroma) * 0.5) calc(var(--brand-hue) - 30) / 0.3))",
    ].join(", "),
  };
  if (typeof hue === "number") style["--brand-hue"] = String(hue);
  if (typeof chroma === "number") style["--brand-chroma"] = String(chroma);

  return (
    <div
      aria-hidden
      className={cn("relative h-40 w-full overflow-hidden", className)}
      style={style as React.CSSProperties}
    >
      {/* A faint dot grid, for texture. */}
      <div className="absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-[length:18px_18px] text-foreground opacity-[0.07]" />
      {/* Fades into the page, so the portrait below overlaps a soft edge. */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
};

/**
 * Banner + the identity that overlaps its lower edge: a round portrait, a
 * name, and whatever lines the page puts under it.
 */
export const BannerHeader = ({
  banner,
  portrait,
  title,
  children,
  aside,
}: {
  banner: React.ReactNode;
  portrait: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  /** Right-aligned, level with the title: counts, a status. */
  aside?: React.ReactNode;
}) => (
  <div className="relative mb-8">
    {banner}
    <div className="-mt-16 flex flex-row items-end gap-5 px-6">
      <div className="relative shrink-0">{portrait}</div>
      <div className="min-w-0 flex-1 space-y-1.5 pb-1">
        <h1 className="truncate text-3xl font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
      {aside && <div className="shrink-0 pb-2">{aside}</div>}
    </div>
  </div>
);

/** The round portrait: an image when there is one, the initial otherwise. */
export const Portrait = ({
  src,
  fallback,
  className,
  children,
}: {
  src?: string | null;
  fallback: string;
  className?: string;
  /** Overlays — the upload affordance on your own portrait. */
  children?: React.ReactNode;
}) => (
  <div
    className={cn(
      "group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-muted text-3xl font-semibold shadow-xl ring-4 ring-background select-none",
      className,
    )}
  >
    {src ? <img src={src} className="h-full w-full object-cover" alt="" /> : fallback.slice(0, 1).toUpperCase()}
    {children}
  </div>
);

/**
 * A portrait its viewer may replace: click to pick an image, or drop one on it.
 * Round for a person; pass a rounded-square `shapeClassName` for an
 * organization's logo.
 *
 * The portrait itself is the drop target — not a `DragZone`, whose file list
 * and "drag here" box do not fit inside a 7rem circle and whose overlay would
 * sit on top of the click target.
 */
export const EditablePortrait = ({
  src,
  fallback,
  upload,
  label,
  shapeClassName = "rounded-full",
}: {
  src?: string | null;
  fallback: string;
  upload: ReturnType<typeof useLokImageUpload>;
  /** What is being changed, for the button's accessible name. */
  label: string;
  shapeClassName?: string;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragging = useCanDrop(acceptsFiles);
  const { ref, isOver } = useDropTarget({
    accepts: acceptsFiles,
    onDrop: (payload) => {
      const file = payload.origin === "external" ? payload.files[0] : undefined;
      if (file) void upload.uploadFile(file, {}).then((key) => upload.createFile(file, key)).catch(() => undefined);
    },
  });

  return (
    <div ref={ref} className={cn("relative", shapeClassName)}>
      <Portrait
        src={src}
        fallback={fallback}
        className={cn(shapeClassName, isOver && "ring-primary")}
      >
        {upload.busy ? (
          <div className={cn("absolute inset-0 flex items-center justify-center bg-black/50", shapeClassName)}>
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        ) : (
          <button
            type="button"
            aria-label={label}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white transition-opacity focus-visible:opacity-100",
              dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              shapeClassName,
            )}
          >
            {dragging ? (isOver ? "Release" : "Drop here") : "Change"}
          </button>
        )}
      </Portrait>
      <input
        ref={inputRef}
        type="file"
        accept={upload.accept}
        className="hidden"
        onChange={upload.onInputChange}
      />
    </div>
  );
};
