import { Dialog } from "@headlessui/react";
import { ParentSize } from "@visx/responsive";
import Konva from "konva";
import React, { useEffect, useRef, useState } from "react";
import { Rect } from "react-konva";
import { DetailRepresentationFragment } from "../../mikro/api/graphql";
import { useMikro } from "../../mikro/MikroContext";
import { useXarray } from "../provider/context";
import { XArrayProvider } from "../provider/provider";

export interface TwoDProps {
  representation: DetailRepresentationFragment;
}

let canvaswidth = 700;
let canvasheight = 700;

export const Canvas: React.FC<{ width: number; height: number; z: number }> = ({
  width,
  height,
  z,
}) => {
  const layerRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageBitmap | null>(null);
  const [currentZ, setCurrentZ] = useState(Math.floor(z / 2));

  let x = useXarray();

  useEffect(() => {
    x.getSelectionAsImageData([0, 0, currentZ, ":", ":"])
      .then(createImageBitmap)
      .then(setImageData);
  }, [currentZ]);

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
        height,
        width
      );
    }
  }, [layerRef.current, imageData, height, width]);

  const scroll = (e: React.WheelEvent<HTMLCanvasElement>) => {
    setCurrentZ((curr) => {
      if (curr == z) {
        return z;
      }
      if (curr == 0) {
        return 0;
      } else if (e.deltaY > 0) {
        return curr - 1;
      } else {
        return curr + 1;
      }
    });
  };

  return (
    <>
      <canvas id="c" width={width} height={height} ref={layerRef}></canvas>;
    </>
  );
};

export const TwoDOffcanvas = ({ representation }: TwoDProps) => {
  const { s3resolve } = useMikro();

  const aspectRatio =
    representation?.shape &&
    representation?.shape[3] / representation?.shape[4];

  return (
    <div className="w-full h-full">
      <XArrayProvider path={s3resolve("/" + representation.store)}>
        <ParentSize debounceTime={800}>
          {({ width, height }) => (
            <Canvas
              z={representation.shape ? representation.shape[2] / 2 : 0}
              width={width}
              height={width * (aspectRatio || width)}
            />
          )}
        </ParentSize>
      </XArrayProvider>
    </div>
  );
};
