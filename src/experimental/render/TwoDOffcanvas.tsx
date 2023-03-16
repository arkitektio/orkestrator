import { Dialog } from "@headlessui/react";
import { x } from "@tauri-apps/api/path-e12e0e34";
import { ParentSize } from "@visx/responsive";
import Konva from "konva";
import React, { useEffect, useRef, useState } from "react";
import { Layer, Line, Rect, Stage } from "react-konva";
import { useNavigate } from "react-router";
import { RoiLabel } from "../../components/ThumbnailCanvas";
import { notEmpty } from "../../floating/utils";
import { SaveParentSize } from "../../layout/SaveParentSize";
import { Roi } from "../../linker";
import {
  DetailRepresentationFragment,
  RepresentationVariety,
  RoiType,
} from "../../mikro/api/graphql";
import { useMikro } from "../../mikro/MikroContext";
import { useSettings } from "../../settings/settings-context";
import { useXarray } from "../provider/context";
import { AvailableColormap, XArrayProvider } from "../provider/provider";

export interface TwoDProps {
  representation: DetailRepresentationFragment;
  colormap?: AvailableColormap;
  withRois?: boolean;
  follow?: "width" | "height";
}

let canvaswidth = 700;
let canvasheight = 700;

export const Canvas: React.FC<{
  width: number;
  height: number;
  path: string;
  z: number;
  colormap: AvailableColormap;
}> = ({ width, height, z, colormap, path }) => {
  const layerRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageBitmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [currentZ, setCurrentZ] = useState(Math.floor(z / 2));

  const { getSelectionAsImageData } = useXarray();

  const renderImage = async (z: number, path: string) => {
    setLoading(true);
    try {
      let image = await getSelectionAsImageData(
        path,
        [0, 0, z, ":", ":"],
        colormap
      );

      let bitmap = await createImageBitmap(image);
      setImageData((image) => bitmap);
      setLoading(false);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    console.log(z, path);
    console.log("Loading image slice...");
    renderImage(z, path);
  }, [z, path]);

  useEffect(() => {
    if (layerRef.current && imageData) {
      let ctx = layerRef?.current?.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.drawImage(
        imageData,
        0,
        0,
        imageData.width,
        imageData.height,
        0,
        0,
        width,
        height
      );
      setLoading(false);
      setError(undefined);
    }
  }, [layerRef.current, imageData, height, width]);

  return (
    <>
      <div
        className={`absolute top-0 left-0 bg-gray-900 ${
          loading || error ? "opacity-100" : "opacity-0"
        } animate-opacity ease-in-out duration-300 z-10 flex items-center justify-center text-white `}
        style={{ width: width, height: height }}
      >
        {error ? (
          <div className="ring-2 ring-primary-300 ring-inset p-3 rounded rounded-lg">
            {error}
          </div>
        ) : (
          <div className="ring-2 ring-primary-300 ring-inset p-3 rounded rounded-lg">
            Loading
          </div>
        )}
      </div>
      <canvas
        id="c"
        width={width}
        height={height}
        ref={layerRef}
        className="absolute top-0 left-0"
      ></canvas>
    </>
  );
};

export const RoiCanvas = ({
  width,
  height,
  z,
  representation,
}: {
  width: number;
  height: number;
  z: number;
  representation: DetailRepresentationFragment;
}) => {
  let rectangles =
    representation.rois?.filter((r) => r?.type === RoiType.Rectangle) ?? [];

  const translate = (
    x: number | null | undefined,
    y: number | null | undefined
  ) => {
    // x and y are flipped in this space
    return [
      ((y || 0) / (representation.shape?.at(4) || 1)) * height,
      ((x || 0) / (representation.shape?.at(3) || 1)) * width,
    ];
  };

  const navigate = useNavigate();

  return (
    <Stage width={width} height={height} className="absolute top-0 left-0">
      <Layer>
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
              onClick={(e) => {
                navigate(Roi.linkBuilder(r.id));
              }}
              strokeWidth={2}
            />
          );
        })}
      </Layer>
    </Stage>
  );
};

export const TwoDOffcanvas = ({
  representation,
  colormap,
  withRois,
  follow = "width",
}: TwoDProps) => {
  const { s3resolve } = useMikro();
  const [z, setZ] = useState(
    representation.shape ? Math.floor(representation.shape[2] / 2) : 0
  );

  const scroll = (e: React.WheelEvent<HTMLDivElement>) => {
    setZ((curr) => {
      if (representation.shape && curr == representation.shape[2]) {
        return curr;
      } else if (curr == 0) {
        return 0;
      } else if (e.deltaY > 0) {
        return curr - 1;
      } else {
        return curr + 1;
      }
    });
  };

  const { settings } = useSettings();

  let colorm: AvailableColormap =
    colormap || representation.variety == RepresentationVariety.Mask
      ? settings.defaultMaskColormap
      : settings.defaultColormap;

  const aspectRatio =
    (representation?.shape &&
      representation?.shape[3] / representation?.shape[4]) ||
    1;

  return (
    <SaveParentSize debounceTime={800}>
      {({ width, height }) => {
        let bwidth = follow == "width" ? width : height * aspectRatio;
        let bheight = follow == "width" ? width / aspectRatio : height;

        return (
          <div className="relative" style={{ height: bheight, width: bwidth }}>
            <Canvas
              z={z}
              width={bwidth}
              height={bheight}
              colormap={colorm}
              path={s3resolve("/" + representation.store)}
            />
            {withRois && (
              <RoiCanvas
                z={z}
                width={bwidth}
                height={bheight}
                representation={representation}
              />
            )}
          </div>
        );
      }}
    </SaveParentSize>
  );
};
