import React from "react";
import {
  DetailRepresentationFragment,
  DetailRoiFragment,
  RepRoiFragment,
  RoiType,
} from "../mikro/api/graphql";
import { useMikro } from "../mikro/MikroContext";
import { decode } from "blurhash";
import { Stage, Layer, RegularPolygon, Circle, Line, Text } from "react-konva";
import { notEmpty } from "../floating/utils";
import { useMan } from "../lok/context";
import { useUserQuery } from "../lok/api/graphql";
import { withMan } from "../lok/man";
import { useNavigate } from "react-router";
import { Roi } from "../linker";

interface ThumbnailCanvasProps {
  roi: DetailRoiFragment;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const linkbuilder = Roi.linkBuilder;

export const RoiCanvas = ({
  roi,
  height,
  width,
}: ThumbnailCanvasProps & { height: number; width: number }) => {
  const bgref = React.useRef<HTMLCanvasElement>(null);
  const blurhashref = React.useRef<HTMLCanvasElement>(null);
  const roiref = React.useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  const [highlight, setHighlight] = React.useState<RepRoiFragment | undefined>(
    undefined
  );
  const { s3resolve } = useMikro();

  let imgheight = roi.representation?.shape?.at(4) || 0;
  let imgwidth = roi.representation?.shape?.at(3) || 0;

  const translate = (
    x: number | null | undefined,
    y: number | null | undefined
  ) => {
    // map from image coordinates to canvas coordinates ( x ,y are transposed)
    return [
      ((y || 0) / (imgheight || 1)) * height,
      ((x || 0) / (imgwidth || 1)) * width,
    ];
  };

  let isRectangle = roi.type === RoiType.Rectangle;
  let thumbnail = roi.representation?.latestThumbnail?.image;
  let blurhash = roi.representation?.latestThumbnail?.blurhash;

  let translatedVectors =
    roi.vectors?.filter(notEmpty).map((v) => translate(v.x, v.y)) || [];

  React.useEffect(() => {
    if (bgref.current) {
      const ctx = bgref.current.getContext("2d");
      if (ctx && thumbnail) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
        };
        img.src = s3resolve(thumbnail);
      }
    }
  }, [thumbnail, bgref, width, height, s3resolve]);

  React.useEffect(() => {
    if (blurhashref.current && blurhash) {
      const decoded = decode(blurhash, 32, 32);

      const ctx = blurhashref.current.getContext("2d");
      if (ctx) {
        const imageData = ctx.createImageData(imgwidth, imgheight);
        imageData.data.set(decoded);
        ctx.putImageData(imageData, 0, 0);
      }
    }
  }, [blurhash, blurhashref, width, height, s3resolve]);

  return (
    <div className="relative" style={{ height: height, width: width }}>
      <canvas
        className="absolute top-0 left-0 bg-gray-900"
        width={width}
        height={height}
        ref={blurhashref}
      />
      <canvas
        className="absolute top-0 left-0 "
        width={width}
        height={height}
        ref={bgref}
      />
      <Stage width={width} height={height}>
        <Layer>
          {isRectangle && (
            <Line
              points={translatedVectors.flat()}
              closed={true}
              stroke="white"
              strokeWidth={2}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};
