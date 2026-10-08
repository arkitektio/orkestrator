import { useMemo, useRef } from "react";
import { useGetSceneAnnotationsQuery, type SceneAnnotationFragment } from "@/mikro/api/graphql";
import { sceneAnnotationsVariables } from "@/mikro/lib/annotations/annotationCache";
import { useLiveSceneAnnotations } from "@/mikro/lib/annotations/useLiveSceneAnnotations";
import { chartMarksOf, type ChartMark, type MarkSpace } from "../../platform/model/chartMarks";
import { useChartLayer, useChartStore } from "../../platform/stores/chartStore";
import { useAnnotationLayerIds } from "./useAnnotationLayers";
import { useMarkTransform } from "./useMarkTransform";

/**
 * The chart's drawn marks, laid over the canvas.
 *
 * One group per annotation layer, each drawing its collection's annotations.
 * The list is fetched ONCE per collection and then followed live — the same
 * cache entry and subscription the scene uses (`mikro/lib/annotations`), so a
 * mark drawn here, in a scene, or by anyone else arrives without a poll.
 *
 * Marks are SVG, not GPU geometry: there are tens of them, they want crisp
 * screen-space strokes under a non-uniform scale (`vector-effect`), and they
 * must stay legible over any line. Their placement is one transform per group,
 * bound imperatively (`useMarkTransform`).
 */
export const ChartAnnotationOverlay = () => {
  const layerIds = useAnnotationLayerIds({ visibleOnly: true });
  if (layerIds.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-12 overflow-hidden">
      <svg className="h-full w-full">
        {layerIds.map((id) => (
          <LayerMarks key={id} layerId={id} />
        ))}
      </svg>
    </div>
  );
};

const LayerMarks = ({ layerId }: { layerId: string }) => {
  const layer = useChartLayer(layerId);
  const space = layer?.marks?.space ?? null;
  const collectionId = layer?.marks?.collectionId ?? null;
  if (!layer || !space || !collectionId) return null;
  return <CollectionMarks collectionId={collectionId} space={space} color={layer.color} />;
};

/** RGBA 0–255, as the annotation carries it, or the layer's colour. */
const cssOf = (rgba: readonly number[] | null | undefined, fallback: string): string =>
  rgba && rgba.length >= 3 ? `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${(rgba[3] ?? 255) / 255})` : fallback;

const CollectionMarks = ({
  collectionId,
  space,
  color,
}: {
  collectionId: string;
  space: MarkSpace;
  color: string;
}) => {
  // Mounting IS going live: one catch-up fetch, then the subscription.
  useLiveSceneAnnotations(collectionId);
  const { data } = useGetSceneAnnotationsQuery({
    variables: sceneAnnotationsVariables(collectionId),
    fetchPolicy: "cache-first",
  });
  const origin = useChartStore((s) => s.timeOrigin);
  const valuedRef = useRef<SVGGElement | null>(null);
  const spanningRef = useRef<SVGGElement | null>(null);
  useMarkTransform(valuedRef, true);
  useMarkTransform(spanningRef, false);

  const drawn = useMemo(() => {
    const annotations: readonly SceneAnnotationFragment[] = data?.annotations ?? [];
    return annotations.flatMap((annotation) =>
      chartMarksOf([annotation], space).map((mark) => ({
        mark,
        stroke: cssOf(annotation.strokeColor, color),
        fill: cssOf(annotation.fillColor, color),
      })),
    );
  }, [data, space, color]);

  const valued = drawn.filter(({ mark }) => mark.shape !== "instant" && mark.shape !== "span");
  const spanning = drawn.filter(({ mark }) => mark.shape === "instant" || mark.shape === "span");

  return (
    <>
      <g ref={spanningRef} style={{ display: "none" }}>
        {spanning.map(({ mark, stroke }) => (
          <Mark key={mark.id} mark={mark} origin={origin} stroke={stroke} fill={stroke} />
        ))}
      </g>
      <g ref={valuedRef} style={{ display: "none" }}>
        {valued.map(({ mark, stroke, fill }) => (
          <Mark key={mark.id} mark={mark} origin={origin} stroke={stroke} fill={fill} />
        ))}
      </g>
    </>
  );
};

/** Strokes stay screen-space under the group's non-uniform scale. */
const STROKE = { vectorEffect: "non-scaling-stroke" as const, strokeWidth: 1.5 };

/**
 * One mark, in data terms: x is the position relative to the scope's origin
 * (so the numbers stay small at any epoch), y is the value — or 0…1 of the
 * height for a mark that spans it.
 */
export const Mark = ({
  mark,
  origin,
  stroke,
  fill,
}: {
  mark: ChartMark;
  origin: number;
  stroke: string;
  fill: string;
}) => {
  const pointsOf = (points: readonly { at: number; value: number }[]) =>
    points.map((p) => `${p.at - origin},${p.value}`).join(" ");
  switch (mark.shape) {
    case "dots":
      return (
        <>
          {mark.points.map((p, i) => (
            // A zero-length round-capped stroke is a dot that stays round.
            <line
              key={i}
              x1={p.at - origin}
              y1={p.value}
              x2={p.at - origin}
              y2={p.value}
              stroke={stroke}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              strokeWidth={7}
            />
          ))}
        </>
      );
    case "polyline":
      return <polyline points={pointsOf(mark.points)} fill="none" stroke={stroke} {...STROKE} />;
    case "polygon":
      return (
        <polygon
          points={pointsOf(mark.points)}
          fill={mark.filled ? fill : "none"}
          fillOpacity={0.2}
          stroke={stroke}
          {...STROKE}
        />
      );
    case "ellipse":
      return (
        <ellipse
          cx={(mark.from.at + mark.to.at) / 2 - origin}
          cy={(mark.from.value + mark.to.value) / 2}
          rx={Math.abs(mark.to.at - mark.from.at) / 2}
          ry={Math.abs(mark.to.value - mark.from.value) / 2}
          fill={mark.filled ? fill : "none"}
          fillOpacity={0.2}
          stroke={stroke}
          {...STROKE}
        />
      );
    case "instant":
      return <line x1={mark.at - origin} y1={0} x2={mark.at - origin} y2={1} stroke={stroke} {...STROKE} />;
    case "span":
      return (
        <rect
          x={mark.from - origin}
          y={0}
          width={mark.to - mark.from}
          height={1}
          fill={fill}
          fillOpacity={0.15}
          stroke={stroke}
          {...STROKE}
        />
      );
  }
};
