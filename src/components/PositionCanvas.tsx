import { KonvaEventObject } from "konva/lib/Node";
import { createInterpolator } from "range-interpolator";
import React, { useState } from "react";
import { Circle, Layer, Line, Rect, Stage } from "react-konva";
import { useNavigate } from "react-router";
import { Position } from "../linker";
import { ListPositionFragment } from "../mikro/api/graphql";
import { useModelSelector } from "../rekuest/selection/context";

interface StageCanvasProps {
  positions: ListPositionFragment[];
  highlight?: string[];
  onSelectPositions?: (ids: ListPositionFragment[]) => void;
}

const linkbuilder = Position.linkBuilder;

export const PositionCanvas = ({
  positions,
  highlight,
  onSelectPositions,
  height,
  width,
}: StageCanvasProps & { height: number; width: number }) => {
  if (positions.length === 0) return null;
  const bgref = React.useRef<HTMLCanvasElement>(null);
  const blurhashref = React.useRef<HTMLCanvasElement>(null);
  const roiref = React.useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const {
    selection: modelSelection,
    setSelection: setModelSelection,
    setIsMultiSelecting,
  } = useModelSelector();

  const { s3resolve } = useDatalayer();

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
      translateToImageCoords(x - width / 2, y - height / 2),
    ].flat();
    return vectors;
  };

  const calulcatePosition = (pos: ListPositionFragment) => {
    let x = pos.x;
    let y = pos.y;
    let vectors = [translateToImageCoords(x, y)].flat();
    return vectors;
  };

  const [selection, setSelection] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  function handleMouseDown(e: KonvaEventObject<MouseEvent>) {
    e.evt.preventDefault();
    setModelSelection([]);
    setIsMultiSelecting(false);

    if (selection === null) {
      const stage = e.target.getStage();
      if (!stage) return;
      const { x: pointerX, y: pointerY } = stage.getPointerPosition() || {
        x: 0,
        y: 0,
      };
      const pos = {
        x: pointerX - stage.x(),
        y: pointerY - stage.y(),
      };
      setSelection({
        startX: pos.x,
        startY: pos.y,
        endX: pos.x,
        endY: pos.y,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
      });
    }
  }

  function handleMouseMove(e: KonvaEventObject<MouseEvent>) {
    if (selection !== null) {
      const stage = e.target.getStage();
      if (!stage) return;
      const { x: pointerX, y: pointerY } = stage.getPointerPosition() || {
        x: 0,
        y: 0,
      };
      const pos = {
        x: pointerX - stage.x(),
        y: pointerY - stage.y(),
      };
      setSelection({
        ...selection,
        endX: pos.x,
        endY: pos.y,
        x: Math.min(selection.startX, pos.x),
        y: Math.min(selection.startY, pos.y),
        width: Math.abs(selection.startX - pos.x),
        height: Math.abs(selection.startY - pos.y),
      });
    }
  }

  function handleMouseUp(e: KonvaEventObject<MouseEvent>) {
    e.evt.preventDefault();
    if (selection !== null) {
      // Calculate the selection and update app state

      let selected_positions: ListPositionFragment[] = [];

      positions.forEach((pos) => {
        let [x, y] = calulcatePosition(pos);
        if (
          x > selection.x &&
          x < selection.x + selection.width &&
          y > selection.y &&
          y < selection.y + selection.height
        ) {
          selected_positions.push(pos);
        }
      });
      setModelSelection(
        selected_positions.map((pos) => ({
          object: pos.id,
          identifier: "@mikro/position",
        }))
      );
      setIsMultiSelecting(true);
      setSelection(null);
    }
  }

  const selectionPreview =
    selection !== null ? (
      <Rect
        fill="rgba(86, 204, 242, 0.1)"
        stroke="#2d9cdb"
        x={selection.x}
        y={selection.y}
        width={selection.width}
        height={selection.height}
      />
    ) : null;

  return (
    <div className="relative " style={{ height: height, width: width }}>
      <canvas
        className="absolute top-0 left-0"
        width={width}
        height={height}
        ref={bgref}
      />
      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          {selectionPreview}
          {positions
            .filter((pos) => pos.omeros)
            .map((pos) => (
              <Line
                points={calculateVectors(pos)}
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
              stroke={
                (highlight && highlight.includes(pos.id)) ||
                modelSelection.find(
                  (v) => v.identifier == "@mikro/position" && v.object == pos.id
                )
                  ? "red"
                  : "white"
              }
              strokeWidth={2}
              onClick={() => {
                navigate(linkbuilder(pos.id));
              }}
              onMouseEnter={(e) => {
                // style stage container:
                const container = e?.target?.getStage()?.container();
                if (container) {
                  container.style.cursor = "pointer";
                }
              }}
              onMouseLeave={(e) => {
                const container = e?.target?.getStage()?.container();
                if (container) {
                  container.style.cursor = "default";
                }
              }}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};
