import { CircleSubject, Connector } from "@visx/annotation";
import { GlyphCircle } from "@visx/glyph";
import { LinearGradient } from "@visx/gradient";
import { PatternLines } from "@visx/pattern";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { scaleBand, scaleLinear } from "@visx/scale";
import { BoxPlot, ViolinPlot } from "@visx/stats";
import { Zoom } from "@visx/zoom";
import { bin } from "d3-array";
import { Form, Formik } from "formik";
import React, { useEffect } from "react";
import * as s from "simple-statistics";
import { ChangeSubmitHelper } from "../../../arkitekt/ui/helpers/ChangeSubmitter";
import { SelectInputField } from "../../../components/forms/fields/select_input";
import { PopMenu } from "../../../layout/PopMenu";
import { Group } from "../plot/types";
import { Smart } from "./generic/Smart";
import { SmartProps } from "./generic/types";
import { ChartProps } from "./types";
export type ViolinChartProps = ChartProps;
type BoxStats = {
  min: number;
  max: number;
  mean: number;
  median: number;
  firstQuartile: number;
  thirdQuartile: number;
  outliers: BoxOutlier[];
};

export type BoxOutlier = {
  value: number;
  object: string;
  type: string;
  datakey: string;
};

type BinDatum = {
  value: number;
  count: number;
};

const min = (d: BoxStats) => d.min;
const max = (d: BoxStats) => d.max;
const x = (d: BoxStats) => d.mean;
const median = (d: BoxStats) => d.median;
const firstQuartile = (d: BoxStats) => d.firstQuartile;
const thirdQuartile = (d: BoxStats) => d.thirdQuartile;
const outliers = (d: BoxStats) => d.outliers;

const calculateBoxStats = (group: Group, key: string): BoxStats => {
  let values = group.data?.map((g) => g[`${key}_value`]) || [];

  console.log(values);

  let adjusted_iqr = s.interquartileRange(values as number[]) * 1.5;
  let outlier_threshold = adjusted_iqr + s.quantile(values as number[], 0.75);
  let under_threshold = s.quantile(values as number[], 0.25) - adjusted_iqr;

  console.log(outlier_threshold, under_threshold);

  let outliers = group.data?.filter(
    (v) =>
      v &&
      v[`${key}_value`] &&
      (v[`${key}_value`] > outlier_threshold ||
        v[`${key}_value`] < under_threshold)
  );

  let outlie_values =
    outliers?.map((o) => ({
      value: o[`${key}_value`],
      object: o[`${key}_object`],
      type: o[`${key}_type`],
      datakey: key,
    })) || [];

  console.log(outliers);

  return {
    min: s.min(values as number[]),
    max: s.max(values as number[]),
    mean: s.mean(values as number[]),
    median: s.median(values as number[]),
    firstQuartile: s.quantile(values as number[], 0.25),
    thirdQuartile: s.quantile(values as number[], 0.75),
    outliers: outlie_values,
  };
};

const biner = bin();

const calculateBinStats = (group: Group, key: string): BinDatum[] => {
  let values = group.data?.map((g) => g[`${key}_value`]) || [];

  console.log(values);

  console.log(biner(values));

  const binned = biner(values as number[]).map((bin) => ({
    value: bin.x0 + (bin.x1 - bin.x0) / 2 || 0,
    count: bin.length,
  }));
  console.log(binned);

  return binned;
};

type ViolinState = {
  boxStats: BoxStats;
  binStats: BinDatum[];
};

const initialTransform = {
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
  skewX: 0,
  skewY: 0,
};

export const ViolinChart = ({ group }: ViolinChartProps) => {
  const [key, setKey] = React.useState<string>(
    group.schema?.axis.at(0)?.key || ""
  );
  const [stats, setStats] = React.useState<ViolinState | null>(null);

  const [smarts, setSmarts] = React.useState<SmartProps[]>([]);

  useEffect(() => {
    try {
      const d = calculateBoxStats(group, key);
      const b = calculateBinStats(group, key);

      console.log(b);

      setStats({
        boxStats: d,
        binStats: b,
      });
    } catch (e) {
      console.log(e);
    }
  }, [key, group]);

  const onSubmit = (values: { axis: string }) => {
    setKey(values.axis);
  };

  let dx = 3;
  let dy = 3;

  return (
    <ParentSize>
      {({ width, height }) => {
        if (!stats) return <></>;

        const xScale = scaleBand<string>({
          range: [0, width],
          round: true,
          padding: 0.4,
        });

        const yScale = scaleLinear<number>({
          range: [height * 0.9, height * 0.1],
          round: true,
          domain: [min(stats?.boxStats), max(stats?.boxStats)],
        });

        return (
          <Zoom<SVGSVGElement>
            width={width}
            height={height}
            scaleXMin={1 / 2}
            scaleXMax={20}
            scaleYMin={1 / 2}
            scaleYMax={20}
            initialTransformMatrix={initialTransform}
          >
            {(zoom) => (
              <div className="relative">
                {stats && (
                  <svg
                    width={width}
                    height={height}
                    ref={zoom.containerRef}
                    style={{
                      cursor: zoom.isDragging ? "grabbing" : "grab",
                      touchAction: "none",
                    }}
                  >
                    <LinearGradient
                      id="statsplot"
                      from="rgb(0,0,0,0)"
                      toOpacity={0.1}
                      to="#87f2d4"
                    />
                    <rect
                      x={0}
                      y={0}
                      width={width}
                      height={height}
                      fill="url(#statsplot)"
                      rx={14}
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
                    <PatternLines
                      id="hViolinLines"
                      height={3}
                      width={3}
                      stroke="#ced4da"
                      strokeWidth={2 / (zoom.transformMatrix.scaleX * 3)}
                      // fill="rgba(0,0,0,0.3)"
                      orientation={["horizontal"]}
                    />
                    <g transform={zoom.toString()}>
                      <BoxPlot
                        min={min(stats.boxStats)}
                        max={max(stats.boxStats)}
                        firstQuartile={firstQuartile(stats.boxStats)}
                        thirdQuartile={thirdQuartile(stats.boxStats)}
                        minProps={{
                          children: <text>min</text>,
                        }}
                        left={width * 0.3}
                        median={median(stats.boxStats)}
                        boxWidth={width * 0.4}
                        fill="#FFFFFF"
                        fillOpacity={0.3}
                        stroke="#FFFFFF"
                        strokeWidth={2 / (zoom.transformMatrix.scaleX * 3)}
                        valueScale={yScale}
                      />
                      <ViolinPlot
                        data={stats.binStats}
                        left={width / 2 - width * 0.15}
                        stroke="#dee2e6"
                        strokeWidth={2 / (zoom.transformMatrix.scaleX * 3)}
                        width={width * 0.3}
                        valueScale={yScale}
                        fill="url(#hViolinLines)"
                      />
                      {stats.boxStats.outliers.map((o, i) => {
                        let x = width / 2 - width * 0.15 + (width * 0.3) / 2;
                        let y = yScale(o.value);

                        return (
                          <g>
                            <GlyphCircle
                              left={x}
                              top={y}
                              stroke="#ffffff"
                              size={10 / (zoom.transformMatrix.scaleX * 3)}
                              key={i}
                              onClick={(e) => {
                                console.log(e);
                                if (e.ctrlKey) {
                                  setSmarts((smarts) => [
                                    ...smarts,
                                    {
                                      x: x,
                                      y: y,
                                      type: o.type,
                                      object: o.object,
                                      value: o.value,
                                      datakey: o.datakey,
                                    },
                                  ]);
                                } else {
                                  setSmarts([
                                    {
                                      x: x,
                                      y: y,
                                      type: o.type,
                                      object: o.object,
                                      value: o.value,
                                      datakey: o.datakey,
                                    },
                                  ]);
                                }
                                e.preventDefault();
                              }}
                            />
                          </g>
                        );
                      })}

                      {smarts?.map((smart) => (
                        <g>
                          <CircleSubject
                            x={smart.x}
                            y={smart.y}
                            stroke="var(--color-primary-300)"
                            strokeWidth={2 / (zoom.transformMatrix.scaleX * 3)}
                            r={60 / (zoom.transformMatrix.scaleX * 3)}
                          />
                          <Connector
                            x={smart.x}
                            y={smart.y}
                            stroke="var(--color-primary-300)"
                            pathProps={{
                              strokeWidth:
                                2 / (zoom.transformMatrix.scaleX * 3),
                            }}
                            dx={dx}
                            dy={dy}
                          />
                          <foreignObject
                            x={smart.x + dx}
                            y={smart.y + dy}
                            width={(200 * 1) / zoom.transformMatrix.scaleX}
                            height={(200 * 1) / zoom.transformMatrix.scaleY}
                          >
                            <div
                              style={{
                                transform: `scale(${
                                  1 / zoom.transformMatrix.scaleX
                                }, ${1 / zoom.transformMatrix.scaleY})`,
                                transformOrigin: "0 0",
                                width: 200,
                                height: 200,
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
                    </g>
                  </svg>
                )}
                <PopMenu
                  label={<>Axis</>}
                  labelClassName="absolute bottom-0 right-0 mr-2 cursor-pointer"
                  placement="top-end"
                >
                  <div className="bg-gray-800 p-3 rounded-md">
                    {group.schema?.axis && group.schema.axis.length > 1 && (
                      <Formik
                        initialValues={{
                          axis: group.schema.axis[0].key,
                        }}
                        onSubmit={onSubmit}
                      >
                        {(formik) => (
                          <Form>
                            <ChangeSubmitHelper formik={formik} />
                            <div className="w-full text-white">
                              <SelectInputField
                                name="axis"
                                label="Axis"
                                options={
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
              </div>
            )}
          </Zoom>
        );
      }}
    </ParentSize>
  );
};
