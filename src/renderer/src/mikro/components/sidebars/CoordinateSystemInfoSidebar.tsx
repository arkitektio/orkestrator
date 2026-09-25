import { Badge } from "@/components/ui/badge";
import { MikroCoordinateSystem } from "@/linkers";

import { GetCoordinateSystemQuery } from "../../api/graphql";
import {
  RESIDENT_KIND_LABEL,
  ResidentLink,
} from "../coordinates/ResidentLink";
import { ValidityBadge } from "../coordinates/EdgeTable";
import {
  PixelSizeEdge,
  formatPixelSize,
  pixelSizeEntries,
  spatialPixelSizes,
} from "../coordinates/pixelSize";
import { isReferenceFrame, residentLabel } from "../coordinates/residents";
import { AnyTransformation } from "../coordinates/types";

type PageSystem = GetCoordinateSystemQuery["coordinateSystem"];

/**
 * Everything about a space that is not the graph: what it is, what its
 * coordinates mean, who lives in it.
 *
 * The graph on the stage answers "what is this connected to"; this rail answers
 * the questions the picture cannot — the axes and their units, the pixel size a
 * calibration edge encodes, and the residents whose data these coordinates
 * actually address.
 */
export const CoordinateSystemInfoSidebar = ({
  system,
  inbound,
}: {
  system: PageSystem;
  /** The edges pointing AT this space, from the page's graph walk. */
  inbound: readonly AnyTransformation[];
}) => {
  const isFrame = isReferenceFrame(system);
  const axes = [...system.axes].sort((a, b) => a.order - b.order);

  // A calibration is reached from the space it calibrates by exactly one edge,
  // and that edge's parameters ARE the pixel size. There is no PHYSICAL kind
  // left to gate on, so gate on what actually made those systems different:
  // this space's axes CARRY UNITS, and something scales into it. A pyramid
  // level maps into its dataset's grid by a scale too — but into unitless
  // pixels, which is a resolution, not a pixel size.
  const calibrationEdge = inbound[0];
  const pixelSizes = spatialPixelSizes(
    pixelSizeEntries(calibrationEdge as PixelSizeEdge, system.axes),
  );
  const isCalibration = pixelSizes.some((entry) => entry.unit);

  const hasTime = system.axes.some((axis) => axis.type === "TIME");

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        {/* `break-all` like the other rails: a system name is usually one long
            token, which word-wrap would not break at all. */}
        <MikroCoordinateSystem.DetailLink
          object={system}
          className="break-all text-lg font-semibold"
        >
          {system.name}
        </MikroCoordinateSystem.DetailLink>
        <div>
          <Badge
            variant="outline"
            className="text-[0.625rem]"
            title={
              isFrame
                ? "Nothing lives in this space. Sources register into it and scenes adopt it as their world; it outlives every scene over it."
                : "The data living in this space."
            }
          >
            {residentLabel(system)}
          </Badge>
        </div>
      </div>

      {/* The axes as rows rather than the five-column table the page used to
          show in the middle: the rail is too narrow for a table, and an axis is
          four short facts that read fine on two lines. */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-baseline justify-between gap-2">
          <div className="text-xs font-semibold">Axes</div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {axes.length}
          </span>
        </div>
        {axes.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            This space declares no axes.
          </span>
        ) : (
          axes.map((axis) => (
            <div
              key={axis.id}
              className="flex flex-col gap-0.5 rounded-md border border-border/60 p-2"
            >
              <div className="flex flex-row items-baseline justify-between gap-2">
                <span className="min-w-0 break-all font-mono text-sm">
                  {axis.name}
                </span>
                <Badge
                  variant="outline"
                  className="shrink-0 px-1 py-0 text-[0.625rem] font-normal"
                >
                  {axis.type}
                </Badge>
              </div>
              <div className="flex flex-row flex-wrap items-baseline gap-x-2 font-mono text-[0.625rem] text-muted-foreground">
                <span>#{axis.order}</span>
                {axis.unit && <span>· {axis.unit}</span>}
              </div>
              {axis.longName && (
                <div className="text-[0.625rem] text-muted-foreground">
                  {axis.longName}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Only meaningful for a calibrated system with a TIME axis. An
          unanchored clock is not a defect: the time axis is still a perfectly
          composable relative coordinate. */}
      {hasTime && (
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold">Clock</div>
          {system.epoch ? (
            <span
              className="font-mono text-[0.625rem] text-muted-foreground"
              title="wall_clock = epoch + t * unit"
            >
              t=0 ≙ {new Date(system.epoch).toISOString()}
            </span>
          ) : (
            <span
              className="text-xs text-muted-foreground"
              title="The time axis is still a perfectly composable relative coordinate."
            >
              Unanchored — t is relative.
            </span>
          )}
        </div>
      )}

      {isCalibration && calibrationEdge && (
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold">Pixel size</div>
          <div className="flex flex-row flex-wrap items-center gap-x-3">
            {pixelSizes.map((entry) => (
              <span key={entry.axis} className="font-mono text-xs">
                {formatPixelSize(entry)}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>maps from</span>
            {calibrationEdge.input && (
              <MikroCoordinateSystem.DetailLink object={calibrationEdge.input}>
                {calibrationEdge.input.name}
              </MikroCoordinateSystem.DetailLink>
            )}
            {calibrationEdge.validity && (
              <ValidityBadge validity={calibrationEdge.validity} />
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-baseline justify-between gap-2">
          <div className="text-xs font-semibold">Residents</div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {system.residents.length}
          </span>
        </div>
        {system.residents.length === 0 ? (
          // Not an empty state: an uninhabited space is what a reference frame
          // IS, and the schema draws no other distinction.
          <span className="text-xs text-muted-foreground">
            Nobody. This is a reference frame — a space built to be registered
            into rather than to hold anything of its own.
          </span>
        ) : (
          system.residents.map((resident) => (
            <div
              key={`${resident.__typename}-${resident.id}`}
              className="flex flex-col gap-0.5 rounded-md border border-border/60 p-2"
            >
              <ResidentLink resident={resident} />
              <span className="text-[0.625rem] text-muted-foreground">
                {RESIDENT_KIND_LABEL[resident.__typename]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
