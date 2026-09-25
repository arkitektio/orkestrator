"use client";

import { Button } from "@/core/components/ui/button";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/core/components/ui/chart";
import {
  RenderGraphTableFilter,
  ScatterPlotFragment,
  useRenderGraphTableQuery
} from "@/kraph/api/graphql";
import * as React from "react";
import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import { calculateRows } from "../../renderers/utils";
import { MiniWidget } from "../MiniWidget";
import { ScatterPlotTooltip } from "./ScatterPlotTooltip";

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const ScatterPlot = (props: {
  scatterPlot: ScatterPlotFragment;
  enableMultiselect?: boolean;
}) => {
  const [pinnedItems, setPinnedItems] = React.useState<any[]>([]);
  const [isLassoMode, setIsLassoMode] = React.useState(false);
  const [lassoPath, setLassoPath] = React.useState<{ x: number; y: number }[]>(
    [],
  );
  const [isDrawing, setIsDrawing] = React.useState(false);
  const chartRef = React.useRef<any>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // No filter: the plot renders the saved query whole.
  const filters: RenderGraphTableFilter | undefined = undefined;

  const { data: tableData } = useRenderGraphTableQuery({
    variables: {
      id: props.scatterPlot.query.id,
      filters,
    },
  });

  const table = tableData?.renderGraphTable;
  const rows = calculateRows(table);

  const handleDotClick = (data: any) => {
    if (isLassoMode) return; // Don't handle clicks in lasso mode

    // Toggle pinned item - if clicking the same point, unpin it
    const existingIndex = pinnedItems.findIndex(
      (item) =>
        item[props.scatterPlot.xColumn] === data[props.scatterPlot.xColumn] &&
        item[props.scatterPlot.yColumn] === data[props.scatterPlot.yColumn],
    );

    if (existingIndex !== -1) {
      // Remove if already pinned
      setPinnedItems(pinnedItems.filter((_, i) => i !== existingIndex));
    } else {
      // Add to pinned items
      setPinnedItems([...pinnedItems, data]);
    }
  };

  const removePinnedItem = (index: number) => {
    setPinnedItems(pinnedItems.filter((_, i) => i !== index));
  };

  // Lasso drawing handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isLassoMode || !containerRef.current) return;
    setIsDrawing(true);
    const rect = containerRef.current.getBoundingClientRect();
    setLassoPath([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !isLassoMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setLassoPath([
      ...lassoPath,
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
    ]);
  };

  // Point-in-polygon algorithm (ray casting)
  const isPointInPolygon = (
    point: { x: number; y: number },
    polygon: { x: number; y: number }[],
  ) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;

      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const handleMouseUp = () => {
    if (!isDrawing || !isLassoMode || !chartRef.current) return;
    setIsDrawing(false);

    // Check which points are inside the lasso
    if (lassoPath.length > 2 && containerRef.current) {
      // Get references to the chart elements and axes through Recharts internals
      const chartInstance = chartRef.current;

      // Access the Recharts wrapper element
      const wrapperElement = chartInstance?.container;
      if (!wrapperElement) {
        setLassoPath([]);
        return;
      }

      // Find the scatter dots in the DOM
      const scatterDots = wrapperElement.querySelectorAll(
        ".recharts-scatter-symbol",
      );
      const containerRect = containerRef.current.getBoundingClientRect();

      // Filter points by checking if their rendered position is inside the lasso
      const selectedPoints = rows.filter((_row, index) => {
        // Find the corresponding dot element
        const dotElement = scatterDots[index] as SVGElement;
        if (!dotElement) return false;

        // Get the actual rendered position of the dot
        const dotRect = dotElement.getBoundingClientRect();
        const dotCenterX =
          dotRect.left + dotRect.width / 2 - containerRect.left;
        const dotCenterY = dotRect.top + dotRect.height / 2 - containerRect.top;

        // Check if this point is inside the lasso polygon
        return isPointInPolygon({ x: dotCenterX, y: dotCenterY }, lassoPath);
      });

      // Add selected points to pinned items (avoid duplicates)
      const newPinnedItems = [...pinnedItems];
      selectedPoints.forEach((point) => {
        const exists = newPinnedItems.some(
          (item) =>
            item[props.scatterPlot.xColumn] ===
              point[props.scatterPlot.xColumn] &&
            item[props.scatterPlot.yColumn] ===
              point[props.scatterPlot.yColumn],
        );
        if (!exists) {
          newPinnedItems.push(point);
        }
      });
      setPinnedItems(newPinnedItems);
    }

    setLassoPath([]);
  };

  // Create marker data for pinned items with numbers
  const markerData = pinnedItems.map((item, index) => ({
    ...item,
    isPinned: true,
    pinnedNumber: index + 1,
  }));

  return (
    <div className="flex flex-col h-full w-full gap-2">
      {/* Toolbar - only show if multiselect is enabled */}
      {props.enableMultiselect && (
        <div className="flex items-center gap-2 px-2">
          <Button
            onClick={() => setIsLassoMode(!isLassoMode)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              isLassoMode
                ? "bg-chart-3 text-white"
                : "bg-muted text-foreground hover:bg-accent"
            }`}
          >
            {isLassoMode
              ? "🎯 Lasso Mode (click to disable)"
              : "🎯 Enable Lasso Selection"}
          </Button>
          {pinnedItems.length > 0 && (
            <Button onClick={() => setPinnedItems([])} variant={"destructive"}>
              Clear All ({pinnedItems.length})
            </Button>
          )}
        </div>
      )}

      {/* Chart Container */}
      <div
        ref={containerRef}
        className="relative flex-1"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: isLassoMode ? "crosshair" : "default" }}
      >
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ScatterChart
            ref={chartRef}
            margin={{
              top: 20,
              right: 20,
              bottom: 20,
              left: 20,
            }}
          >
            <CartesianGrid />
            <XAxis
              type="number"
              dataKey={props.scatterPlot.xColumn}
              name={
                table?.query.columns.find(
                  (c) => c.key == props.scatterPlot.xColumn,
                )?.label || "No Label"
              }
              unit="µm"
            />
            <YAxis
              type="number"
              dataKey={props.scatterPlot.yColumn}
              name={
                table?.query.columns.find(
                  (c) => c.key == props.scatterPlot.yColumn,
                )?.label || " No Label"
              }
              unit="µm"
            />
            <ChartTooltip
              content={
                <ScatterPlotTooltip
                  scatterPlot={props.scatterPlot}
                  graphId={table?.query.graph.id}
                />
              }
              cursor={{ strokeDasharray: "3 3" }}
            />
            <Scatter
              name={props.scatterPlot.label}
              data={rows}
              fill="#8884d8"
              onClick={handleDotClick}
            />
            {/* Pinned markers with different color and star shape */}
            {markerData.length > 0 && (
              <Scatter
                name="Pinned"
                data={markerData}
                fill="#ef4444"
                shape="star"
                legendType="none"
              />
            )}
          </ScatterChart>
        </ChartContainer>

        {/* Lasso path overlay */}
        {isDrawing && lassoPath.length > 0 && (
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 100 }}
          >
            <polyline
              points={lassoPath.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="blue"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          </svg>
        )}
      </div>

      {/* Pinned item cards at the bottom - always show when multiselect is enabled */}
      {props.enableMultiselect && (
        <div className="flex flex-wrap gap-2 p-2 border-t bg-muted/30 max-h-64 overflow-y-auto min-h-16">
          {pinnedItems.length > 0 ? (
            pinnedItems.map((item, index) => {
              const idVal = item[props.scatterPlot.idColumn || ""];
              const xVal = item[props.scatterPlot.xColumn];
              const yVal = item[props.scatterPlot.yColumn];

              return (
                <div key={index} className="flex-shrink-0 w-64">
                  <div className="grid gap-1.5 rounded-lg border-2 border-red-500 bg-background px-3 py-2 text-xs shadow-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-red-600 flex items-center gap-1">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs">
                          {index + 1}
                        </span>
                        Pinned Point
                      </div>
                      <button
                        onClick={() => removePinnedItem(index)}
                        className="text-red-500 hover:text-red-700 font-bold"
                        title="Remove pin"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid gap-1">
                      <div className="text-muted-foreground">
                        {props.scatterPlot.xColumn}
                      </div>
                      <div className="font-mono font-medium">{xVal ?? "—"}</div>
                      <div className="text-muted-foreground">
                        {props.scatterPlot.yColumn}
                      </div>
                      <div className="font-mono font-medium">{yVal ?? "—"}</div>
                      <div className="text-muted-foreground">
                        {props.scatterPlot.idColumn}
                      </div>
                    </div>

                    <div className="border-t pt-2">
                      {idVal ? (
                        <>
                          <MiniWidget
                            id={idVal}
                            graph={table?.query.graph.id}
                          />
                        </>
                      ) : (
                        "No id"
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground">
              No points selected. Click individual points or use lasso selection
              to pin items.
            </div>
          )}
        </div>
      )}
    </div>
  );
};


export default ScatterPlot;
