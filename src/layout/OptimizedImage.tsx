import { useEffect, useState } from "react";
import {
  LazyLoadComponent,
  LazyLoadImage,
} from "react-lazy-load-image-component";
import { Blurhash } from "react-blurhash";
import { number } from "yup";
import { ParentSize } from "@visx/responsive";
import { decode } from "blurhash";

export type IOptimizedImageProps = {
  src: string;
  blurhash?: string | null;
  className?: string;
  append?: string;
  style?: React.CSSProperties;
};

export const OptimizedImage = ({
  src,
  blurhash,
  append,
  style,
  className,
}: IOptimizedImageProps) => {
  const [bgImage, setBgImage] = useState<string | undefined>();

  useEffect(() => {
    if (blurhash) {
      const decoded = decode(blurhash, 32, 32);

      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const imageData = ctx.createImageData(32, 32);
        imageData.data.set(decoded);
        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL();
        setBgImage(dataUrl);
      }
    }
  }, [blurhash]);

  return (
    <LazyLoadImage
      key={src}
      src={src}
      style={{
        ...style,
        backgroundImage: bgImage ? `url(${bgImage}) ` : undefined,
        backgroundSize: "cover",
      }}
      className={className}
      threshold={100}
    />
  );
};
