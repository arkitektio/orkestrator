import React from "react";
import {
  DetailRepresentationFragment,
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
  rep: DetailRepresentationFragment;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const RoiLabel = ({
  roi,
  translate,
}: {
  roi: RepRoiFragment;
  translate: any;
}) => {
  const { data, error } = withMan(useUserQuery)({
    variables: { id: roi.creator?.sub },
  });

  let text =
    "Marked by " +
    (data?.user?.username || roi.creator?.sub || "unknown") +
    " on " +
    (formatDate(roi.createdAt) || "unknown");

  let [x, y] = translate(roi?.vectors?.at(0)?.x, roi?.vectors?.at(0)?.y);

  console.log("roi", roi, x, y);

  return <Text x={x} y={y - 15} text={text} fontSize={14} fill="white" />;
};

const linkbuilder = Roi.linkBuilder;

export const ThumbnailCanvas = ({
  rep,
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

  const translate = (
    x: number | null | undefined,
    y: number | null | undefined
  ) => {
    return [
      ((x || 0) / (rep.shape?.at(3) || 1)) * width,
      ((y || 0) / (rep.shape?.at(4) || 1)) * height,
    ];
  };

  let rectangles = rep.rois?.filter((r) => r?.type === RoiType.Rectangle) ?? [];
  let thumbnail = rep.latestThumbnail?.image;
  let blurhash = rep.latestThumbnail?.blurhash;

  let imgheight = rep.shape?.at(3) || 0;
  let imgwidth = rep.shape?.at(4) || 0;

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
  }, [rep, bgref, width, height, s3resolve]);

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
  }, [rep, blurhashref, width, height, s3resolve]);

  return (
    <div
      className="relative"
      style={{ height: height, width: width }}
      onDoubleClick={() => {
        window.open(s3resolve(thumbnail), "_blank");
      }}
    >
      <canvas
        className="absolute top-0 left-0"
        width={width}
        height={height}
        ref={blurhashref}
      />
      <canvas
        className="absolute top-0 left-0"
        width={width}
        height={height}
        ref={bgref}
      />
      <Stage width={width} height={height}>
        <Layer>
          {highlight && <RoiLabel roi={highlight} translate={translate} />}

          {rectangles.filter(notEmpty).map((r, index) => {
            let vectors = r?.vectors?.map((v) => translate(v?.x, v?.y)) ?? [
              [0, 0],
            ];
            return (
              <Line
                points={vectors.flat()}
                closed={true}
                key={index}
                stroke="white"
                strokeWidth={2}
                onClick={() => navigate(linkbuilder(r.id))}
                onMouseEnter={() => setHighlight(r)}
                onMouseLeave={() => setHighlight(undefined)}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};
