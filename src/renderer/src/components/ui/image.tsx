import { cn } from "@/lib/utils";
import { decode } from "blurhash";
import { useMemo } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";

const BLURHASH_SIZE = 32;

// Decoding a blurhash + rasterizing it through a canvas + `toDataURL` costs a
// few hundred microseconds per call; the same hash mounts many times (lists,
// grids, re-mounts on navigation). Memoize the finished data URL per hash so
// only the first mount pays. Keyed on hash + size in case a caller ever asks
// for a different raster size.
const blurhashDataUrlCache = new Map<string, string>();

export function blurhashToDataUrl(blurhash: string, size = BLURHASH_SIZE): string | undefined {
  const key = size === BLURHASH_SIZE ? blurhash : `${blurhash}@${size}`;
  const cached = blurhashDataUrlCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const decoded = decode(blurhash, size, size);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    const imageData = ctx.createImageData(size, size);
    imageData.data.set(decoded);
    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL();
    blurhashDataUrlCache.set(key, dataUrl);
    return dataUrl;
  } catch {
    // A malformed hash should degrade to "no placeholder", not crash the image.
    return undefined;
  }
}

export type ImageProps = {
  src: string;
  blurhash?: string | null;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
};

export const Image = ({ src, blurhash, style, className, alt }: ImageProps) => {
  // Synchronous + memoized: a cache hit is a Map lookup, and even a miss is
  // cheap enough to do during render so the placeholder is present on first
  // paint instead of one effect tick later.
  const bgImage = useMemo(
    () => (blurhash ? blurhashToDataUrl(blurhash) : undefined),
    [blurhash],
  );

  return (
    <LazyLoadImage
      key={src}
      src={src}
      style={{
        ...style,
        backgroundImage: bgImage ? `url(${bgImage}) ` : undefined,
        backgroundSize: "cover",
      }}
      alt={alt || "Image"}
      className={cn(className)}
      threshold={100}
    />
  );
};
