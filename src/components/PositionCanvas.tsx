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
import { createInterpolator } from "range-interpolator";
import { Point } from "slate";

interface StageCanvasProps {
  positions: ListPositionFragment[];
  highlight?: string[];
}

const linkbuilder = Position.linkBuilder;

export const PositionCanvas = ({
  positions,
  highlight,
  height,
  width,
}: StageCanvasProps & { height: number; width: number }) => {
  const bgref = React.useRef<HTMLCanvasElement>(null);
  const blurhashref = React.useRef<HTMLCanvasElement>(null);
  const roiref = React.useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  const { s3resolve } = useMikro();

  let calculateXSize = (pos: ListPositionFragment) => {
    return (
      (pos?.omeros?.at(0)?.representation?.shape?.at(4) || 0) *
      (pos?.omeros?.at(0)?.physicalSize?.x || 0)
    );
  };

  let calculateYSize = (pos: ListPositionFragment) => {
    return (
      (pos?.omeros?.at(0)?.representation?.shape?.at(3) || 0) *
      (pos?.omeros?.at(0)?.physicalSize?.y || 0)
    );
  };

  let imgminx = Math.min(
    ...positions.map((pos) => pos.x - calculateXSize(pos) / 2)
  );
  let imgmaxx = Math.max(
    ...positions.map((pos) => pos.x + calculateXSize(pos) / 2)
  );

  let imgminy = Math.min(
    ...positions.map((pos) => pos.y - calculateYSize(pos) / 2)
  );
  let imgmaxy = Math.max(
    ...positions.map((pos) => pos.y + calculateYSize(pos) / 2)
  );

  let imgwidth = imgmaxx - imgminx;
  let imgheight = imgmaxy - imgminy;

  console.log(imgmaxx, imgminx, imgmaxy, imgminy);
  console.log(imgwidth, imgheight);
  console.log(width, width);

  const Xinterpolate = createInterpolator({
    inputRange: [imgminx, imgmaxx],
    outputRange: [0, width],
  });

  const Yinterpolate = createInterpolator({
    inputRange: [imgminy, imgmaxy],
    outputRange: [0, height],
  });

  const translateToImageCoords = (x: number, y: number) => {
    // normalize to 0-1

    console.log(x, y, Xinterpolate(x), Yinterpolate(y));

    return [Xinterpolate(x), Yinterpolate(y)];
  };

  const calculateVectors = (pos: ListPositionFragment) => {
    let x = pos.x;
    let width = calculateXSize(pos);
    let y = pos.y;
    let height = calculateYSize(pos);
    let vectors = [
      translateToImageCoords(x - width / 2, y - height / 2),
      translateToImageCoords(x - width / 2, y + height / 2),
      translateToImageCoords(x + width / 2, y + height / 2),
      translateToImageCoords(x + width / 2, y - height / 2),
    ].flat();
    console.log(pos, vectors);
    return vectors;
  };

  const calulcatePosition = (pos: ListPositionFragment) => {
    let x = pos.x;
    let y = pos.y;
    let vectors = [translateToImageCoords(x, y)].flat();
    return vectors;
  };

  return (
    <div className="relative " style={{ height: height, width: width }}>
      <canvas
        className="absolute top-0 left-0"
        width={width}
        height={height}
        ref={bgref}
      />
      <Stage width={width} height={height}>
        <Layer>
          {positions
            .filter((pos) => pos.omeros)
            .map((pos) => (
              <Line
                points={calculateVectors(pos)}
                closed={true}
                stroke={
                  highlight && highlight.includes(pos.id) ? "red" : "white"
                }
                strokeWidth={2}
                onClick={() => {
                  navigate(linkbuilder(pos.id));
                }}
              />
            ))}
          {positions.map((pos) => (
            <Circle
              radius={1}
              x={Xinterpolate(pos.x)}
              y={Yinterpolate(pos.y)}
              closed={true}
              stroke="red"
              strokeWidth={2}
              onClick={() => {
                navigate(linkbuilder(pos.id));
              }}
              onMouseEnter={() => {
                console.log("enter");
              }}
            />
          ))}
          <Circle
            radius={1}
            x={Xinterpolate(0)}
            y={Yinterpolate(0)}
            closed={true}
            stroke="green"
          />
        </Layer>
      </Stage>
    </div>
  );
};
