import { LinearGradient } from "@visx/gradient";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { Form, Formik } from "formik";
import React, { useEffect, useRef } from "react";
import { ChangeSubmitHelper } from "../../../rekuest/ui/helpers/ChangeSubmitter";
import { SwitchInputField } from "../../../components/forms/fields/switch_input";
import { PopMenu } from "../../../layout/PopMenu";
import { Datum, Group, ValueAccesor } from "../plot/types";
import { buildChartTheme } from "@visx/xychart";
import { timeFormat } from "d3-time-format";
import { Smart } from "./generic/Smart";
import { SmartProps } from "./generic/types";
import { Zoom } from "@visx/zoom";
import { scaleBand, scaleLinear, scaleTime } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { AreaClosed, Line, Bar } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import {
  Annotation,
  Connector,
  CircleSubject,
  HtmlLabel,
  Label,
} from "@visx/annotation";
import { GridRows, GridColumns } from "@visx/grid";
import { localPoint } from "@visx/event";
import { scaleBandInvert } from "../plot/helpers";
import { guardValueNumber } from "../plot/parser";
import {
  ListSearchInput,
  SearchInput,
} from "../../../components/forms/fields/SearchInput";
export interface ChartProps {
  group: Group;
}

export type MultiChartState = {
  xAxis: string;
  yAxis: string[];
  grid: boolean;
};

const initialTransform = {
  scaleX: 0.8,
  scaleY: 0.8,
  translateX: 0,
  translateY: 0,
  skewX: 0,
  skewY: 0,
};

const calculateInitialTransform = (width: number, height: number) => {
  return {
    scaleX: 0.8,
    scaleY: 0.8,
    translateX: 20,
    translateY: 20,
    skewX: 0,
    skewY: 0,
  };
};

export type ChartState = {
  xScale: any;
  yScale: any;
  xTickFormat: (v: any, i: number) => string;
  yTickFormat: (v: any, i: number) => string;
  lowestValue: number;
  highestValue: number;
};

export const MultiChart: React.FC<ChartProps> = (props: ChartProps) => {
  return (
    <ParentSize>
      {({ width, height }) => (
        <InnerMultiChart width={width} height={height} {...props} />
      )}
    </ParentSize>
  );
};

export const background = "#3b6978";
export const background2 = "#204051";
export const accentColor = "#edffea";

export const InnerMultiChart: React.FC<
  ChartProps & { width: number; height: number }
> = ({ group, width, height }) => {
  let data = group.data || [];
  const [displayState, setDisplayState] = React.useState<MultiChartState>({
    xAxis: group.schema?.axis.at(0)?.key || "",
    yAxis: group.schema?.axis.slice(1).map((a) => a.key) || [],
    grid: true,
  });

  const [chartState, setChartState] = React.useState<ChartState | undefined>();

  const [mysmarts, setSmarts] = React.useState<SmartProps[]>([]);

  const gref = useRef(null);

  if (!data || data.length < 1) {
    return <> Not correct</>;
  }

  const onSubmit = (values: Partial<MultiChartState>) => {
    setDisplayState((x) => ({ ...x, ...values }));
  };

  useEffect(() => {
    const xAccessor: ValueAccesor = `${displayState.xAxis}_value`;

    let highestAxis: string = "";
    let highestXValue: number | string | Date | null = null;
    let lowestXValue: number | string | Date | null = null;

    let highestValue: number | string | Date | null = null;
    let lowest_axis: string = "";
    let lowestValue: number | string | Date | null = null;

    group?.data?.forEach((d) => {
      displayState.yAxis.forEach((y) => {
        let value = d[`${y}_value`];
        if (value) {
          if (highestValue == null || value > highestValue) {
            highestValue = value;
            highestAxis = y;
          }
          if (lowestValue == null || value < lowestValue) {
            lowestValue = value;
            lowest_axis = y;
          }
        }
      });
      let xvalue = d[xAccessor];
      if (xvalue) {
        if (highestXValue == null || xvalue > highestXValue) {
          highestXValue = xvalue;
        }
        if (lowestXValue == null || xvalue < lowestXValue) {
          lowestXValue = xvalue;
        }
      }
    });

    console.log("max_total", highestValue);
    console.log("max-axis", highestAxis);
    console.log("low_total", lowestValue);
    console.log("low_axis", lowest_axis);

    let xScale;
    let xTickFormat = (d: any, inx: number) => d;
    let yTickFormat = (d: any, inx: number) => d;

    if (
      group.schema?.axis.find((a) => a.key == displayState.xAxis)?.parser ==
      "DATE"
    ) {
      xScale = scaleTime({
        domain: [lowestXValue, highestXValue],
        range: [0, width],
      });

      xTickFormat = (v: any, inx: number) =>
        inx % 2 == 0 ? timeFormat("%b %d")(v) : "";
    } else {
      xScale = scaleBand({
        domain: group?.data?.map((d) => d[xAccessor] || "none"),
        range: [0, width],
        paddingOuter: 0,
        paddingInner: 1,
      });
    }

    console.log("xScale", xScale);

    const yScale = scaleLinear({
      domain: [lowestValue, highestValue],
      range: [height, 0],
    });

    setChartState({
      xScale,
      yScale,
      xTickFormat,
      yTickFormat,
      lowestValue,
      highestValue,
    });
  }, [displayState, width, height, group.data]);

  let dx = 10;
  let dy = 20;
  let smartWidth = 300;
  let smartHeight = 300;

  return (
    <Zoom<SVGSVGElement>
      width={width}
      height={height}
      scaleXMin={1 / 2}
      scaleXMax={20}
      scaleYMin={1 / 2}
      scaleYMax={20}
      initialTransformMatrix={calculateInitialTransform(width, height)}
    >
      {(zoom) => (
        <div className="relative">
          <svg
            width={width}
            height={height}
            ref={zoom.containerRef}
            style={{
              cursor: zoom.isDragging ? "grabbing" : "grab",
              touchAction: "none",
            }}
            onDoubleClick={(event) => {
              setSmarts([]);
            }}
            onClick={(event) => {
              const point = zoom.applyInverseToPoint(
                localPoint(event) || {
                  x: 0,
                  y: 0,
                }
              );
              const real_x = point.x;
              console.log(point);

              const x = chartState?.xScale.invert
                ? chartState?.xScale.invert(real_x)
                : scaleBandInvert(chartState?.xScale)(real_x);

              let datum_index = group?.data
                ?.map((d, index) => [d[`${displayState?.xAxis}_value`], index])
                .map((value) => [Math.abs(value[0] - x), value[1]])
                .sort((a, b) => a[0] - b[0])
                .at(0)
                .at(1);

              let datum = group?.data?.at(datum_index);

              if (datum) {
                console.log(datum);
                const y = chartState?.yScale.invert(point.y);
                const closest_key = Object.entries(datum)
                  .filter(
                    ([key, value]) =>
                      key.endsWith("_value") &&
                      key != `${displayState.xAxis}_value`
                  )
                  .filter(([key, value]) => typeof value == "number")
                  .map(([key, value]) => [key, Math.abs(value - y)])
                  .sort((a, b) => a[1] - b[1])
                  .map(([key, value]) => key.replace("_value", ""))
                  .at(0);

                console.log(y, closest_key, datum);

                let scaledX = chartState?.xScale(
                  datum[`${displayState.xAxis}_value`]
                );
                let type =
                  group.schema?.axis &&
                  group.schema?.axis.find((a) => a.key == closest_key)?.type;
                let value = datum[`${closest_key}_value`];
                let scaledY = chartState?.yScale(value);
                let object = datum[`${closest_key}_object`];

                console.log("sss", object, value, scaledY);

                console.log(event);
                if (scaledX != undefined && scaledY != undefined) {
                  if (event.ctrlKey) {
                    setSmarts((smarts) => [
                      ...smarts,
                      {
                        x: scaledX,
                        y: scaledY,
                        type: type,
                        object: object,
                        value: value,
                        datakey: closest_key,
                      },
                    ]);
                  } else {
                    setSmarts([
                      {
                        x: scaledX,
                        y: scaledY,
                        type: type,
                        object: object,
                        value: value,
                        datakey: closest_key,
                      },
                    ]);
                  }
                }

                console.log("smarts", {
                  x: scaledX,
                  y: scaledY,
                  type: type,
                  object: object,
                  value: value,
                  datakey: closest_key,
                });
              }
            }}
          >
            <LinearGradient
              id="statsplot"
              from="rgb(0,0,0,0)"
              toOpacity={0.1}
              to="rgb(var(--color-primary-300))"
            />
            <rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill="url(#statsplot)"
              rx={4}
              onTouchStart={zoom.dragStart}
              onTouchMove={zoom.dragMove}
              onTouchEnd={zoom.dragEnd}
              onMouseDown={zoom.dragStart}
              onMouseMove={zoom.dragMove}
              onMouseUp={zoom.dragEnd}
              onMouseLeave={() => {
                if (zoom.isDragging) zoom.dragEnd();
              }}
            />

            <g transform={zoom.toString()} ref={gref}>
              <LinearGradient
                id="area-gradient"
                from={"rgb(var(--color-primary-300))"}
                to={"rgb(var(--color-primary-300) / 0.2)"}
                toOpacity={0.1}
              />
              {chartState && (
                <>
                  <GridRows
                    scale={chartState.yScale}
                    width={width}
                    strokeDasharray="1,3"
                    strokeOpacity={0}
                    pointerEvents="none"
                  />
                  <GridColumns
                    scale={chartState.xScale}
                    height={height}
                    strokeDasharray="1,3"
                    strokeOpacity={0.2}
                    pointerEvents="none"
                  />
                  <AxisBottom
                    scale={chartState.xScale}
                    top={height}
                    axisClassName="text-white"
                    tickStroke="rgb(var(--color-primary-100))"
                    stroke="rgb(var(--color-primary-100))"
                    tickLabelProps={() => ({
                      fill: "rgb(var(--color-primary-100))",
                      transform: "translate(, -50%)",
                    })}
                    tickFormat={chartState.xTickFormat}
                  />
                  <AxisLeft
                    scale={chartState.yScale}
                    top={0}
                    axisClassName="text-white"
                    tickStroke="rgb(var(--color-primary-100))"
                    stroke="rgb(var(--color-primary-100))"
                    tickLabelProps={() => ({
                      fill: "rgb(var(--color-primary-100))",
                      transform: "translate(, -50%)",
                    })}
                    tickFormat={chartState.yTickFormat}
                  />
                  {displayState.yAxis.map((key, index) => (
                    <AreaClosed
                      key={index}
                      data={group?.data}
                      x={(d) =>
                        chartState.xScale(d[`${displayState.xAxis}_value`] || 0)
                      }
                      y={(d) =>
                        chartState.yScale(
                          d[`${key}_value`] || chartState.lowestValue
                        )
                      }
                      defined={(d) =>
                        d[`${key}_value`] != undefined &&
                        d[`${displayState.xAxis}_value`] != undefined
                      }
                      yScale={chartState.yScale}
                      strokeWidth={1}
                      stroke="url(#area-gradient)"
                      fill="url(#area-gradient)"
                    />
                  ))}
                  {mysmarts?.map((smart) => (
                    <g>
                      <CircleSubject
                        x={smart.x}
                        y={smart.y}
                        stroke="rgb(30,41,59)"
                        strokeWidth={14 / (zoom.transformMatrix.scaleX * 3)}
                        r={20 / (zoom.transformMatrix.scaleX * 3)}
                      />
                      <Connector
                        x={smart.x + 15 / (zoom.transformMatrix.scaleX * 3)}
                        y={smart.y + 15 / (zoom.transformMatrix.scaleX * 3)}
                        stroke="rgb(30,41,59)"
                        pathProps={{
                          strokeWidth: 14 / (zoom.transformMatrix.scaleX * 3),
                        }}
                        dx={(dx * 3) / (zoom.transformMatrix.scaleX * 3)}
                        dy={(dy * 3) / (zoom.transformMatrix.scaleX * 3)}
                      />
                      <foreignObject
                        x={
                          smart.x + (dx * 3) / (zoom.transformMatrix.scaleX * 3)
                        }
                        y={
                          smart.y + (dy * 3) / (zoom.transformMatrix.scaleX * 3)
                        }
                        width={(smartWidth * 1) / zoom.transformMatrix.scaleX}
                        height={(smartHeight * 1) / zoom.transformMatrix.scaleY}
                      >
                        <div
                          style={{
                            transform: `scale(${
                              1 / zoom.transformMatrix.scaleX
                            }, ${1 / zoom.transformMatrix.scaleY})`,
                            transformOrigin: "0 0",
                            width: smartWidth,
                            height: smartHeight,
                          }}
                        >
                          <Smart
                            type={smart.type}
                            object={smart.object}
                            value={smart.value}
                            datakey={smart.datakey}
                          />
                        </div>
                      </foreignObject>
                    </g>
                  ))}
                </>
              )}
            </g>
          </svg>
          <div className="absolute bottom-0 right-0 mr-2 flex flex-row gap-2">
            <PopMenu
              label={<>Axis</>}
              labelClassName="cursor-pointer"
              placement="top-end"
            >
              <div className="bg-gray-800 p-3 rounded-md">
                {group.schema?.axis && group.schema.axis.length > 1 && (
                  <Formik<Partial<MultiChartState>>
                    initialValues={{
                      xAxis: group.schema.axis.at(0)?.key,
                      yAxis: group.schema.axis.slice(1).map((ax) => ax.key),
                    }}
                    onSubmit={onSubmit}
                  >
                    {(formik) => (
                      <Form>
                        <ChangeSubmitHelper />
                        <div className="w-full text-white">
                          <SearchInput
                            name="xAxis"
                            label="X Axis"
                            searchFunction={async () =>
                              group?.schema?.axis.map((ax) => ({
                                value: ax.key,
                                label: ax.key,
                              })) || []
                            }
                          />
                        </div>
                        <div className="w-full text-white">
                          <ListSearchInput
                            name="yAxis"
                            label="Y Axis"
                            searchFunction={async () =>
                              group?.schema?.axis.map((ax) => ({
                                value: ax.key,
                                label: ax.key,
                              })) || []
                            }
                          />
                        </div>
                      </Form>
                    )}
                  </Formik>
                )}
              </div>
            </PopMenu>
            <PopMenu
              label={<>Graph</>}
              labelClassName=" cursor-pointer"
              placement="top-end"
            >
              <div className="bg-gray-800 p-3 rounded-md">
                {group.schema?.axis && group.schema.axis.length > 1 && (
                  <Formik<Partial<MultiChartState>>
                    initialValues={{
                      grid: true,
                    }}
                    onSubmit={onSubmit}
                  >
                    {(formik) => (
                      <Form>
                        <ChangeSubmitHelper formik={formik} />
                        <div className="w-full text-white">
                          <SwitchInputField name="grid" label="Grid" />
                        </div>
                      </Form>
                    )}
                  </Formik>
                )}
              </div>
            </PopMenu>

            <PopMenu label={<>Debug</>} labelClassName=" cursor-pointer">
              <div className="bg-gray-800 p-3 rounded-md overflow-y-scroll h-[60rem] h-[60rem] text-white">
                <pre>{JSON.stringify(group, null, 2)}</pre>
              </div>
            </PopMenu>
          </div>
        </div>
      )}
    </Zoom>
  );
};
