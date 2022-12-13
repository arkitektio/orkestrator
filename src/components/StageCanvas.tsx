import React from "react";
import {
  StageFragment,
  DetailRoiFragment,
  RepRoiFragment,
  RoiType,
  ListPositionFragment,
} from "../mikro/api/graphql";
import { useMikro } from "../mikro/MikroContext";
import { decode } from "blurhash";
import { Stage, Layer, RegularPolygon, Circle, Line, Text } from "react-konva";
import { notEmpty } from "../floating/utils";
import { useMan } from "../lok/context";
import { useUserQuery } from "../lok/api/graphql";
import { withMan } from "../lok/man";
import { useNavigate } from "react-router";
import { Position, Roi } from "../linker";

interface StageCanvasProps {
  stage: StageFragment;
}

const linkbuilder = Position.linkBuilder;

export const StageCanvas = ({
  stage,
  height,
  width,
}: StageCanvasProps & { height: number; width: number }) => {
  const bgref = React.useRef<HTMLCanvasElement>(null);
  const blurhashref = React.useRef<HTMLCanvasElement>(null);
  const roiref = React.useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  const [highlight, setHighlight] = React.useState<RepRoiFragment | undefined>(
    undefined
  );
  const { s3resolve } = useMikro();

  let calculateXSize = (pos: ListPositionFragment) => {
    return (
      (pos?.omeros?.at(0)?.representation?.shape.at(4) || 0) *
      (pos?.omeros?.at(0)?.physicalSize.x || 0)
    );
  };

  const translateX = (x: number | null | undefined) => {
    return (x || 0) * stage.physicalSize[1];
  };

  const translateY = (y: number | null | undefined) => {
    return (y || 0) * stage.physicalSize[0];
  };

  console.log(width, height);

  let calculateYSize = (pos: ListPositionFragment) => {
    return (
      (pos?.omeros?.at(0)?.representation?.shape?.at(3) || 0) *
      (pos?.omeros?.at(0)?.physicalSize?.y || 0)
    );
  };

  let imgheight = Math.max(
    ...stage.positions.map((pos) => translateY(pos.y) + calculateYSize(pos))
  );
  let imgwidth = Math.max(
    ...stage.positions.map((pos) => translateX(pos.x) + calculateXSize(pos))
  );
  console.log(imgheight, imgwidth);

  const translateToImageCoords = (
    x: number | null | undefined,
    y: number | null | undefined
  ) => {
    return [
      ((x || 0) / (imgwidth || 1)) * width,
      ((y || 0) / (imgheight || 1)) * height,
    ];
  };

  const calculateVectors = (pos: ListPositionFragment) => {
    let x = translateX(pos.x);
    let width = calculateXSize(pos);
    let y = translateY(pos.y);
    let height = calculateYSize(pos);
    console.log(x, width, y, height);
    let vectors = [
      translateToImageCoords(x, y),
      translateToImageCoords(x + width, y),
      translateToImageCoords(x + width, y + height),
      translateToImageCoords(x, y + height),
    ].flat();
    console.log(pos, vectors);
    return vectors;
  };

  return (
    <div className="relative" style={{ height: height, width: width }}>
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
          {stage.positions.map((pos) => (
            <Line
              points={calculateVectors(pos)}
              closed={true}
              stroke="white"
              strokeWidth={2}
              onClick={() => {
                navigate(linkbuilder(pos.id));
              }}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};
