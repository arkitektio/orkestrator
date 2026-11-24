import * as React from "react";
import * as z from "zod";

import { classNameSchema, sizeSchema } from "@arkitektio/bsx/catalogs";
import { createBlokComponent, type BlokComponentDefinition, type BlokRenderArgs } from "@arkitektio/bsx/renderer/runtime/index";

import { preloadable } from "@/core/util/preloadable";

/**
 * The base plot: one measured axis that mounts are laid along — a live
 * spectrum (`LovekitTrace`) — each converted from its own unit into the plot's
 * and given a row:
 *
 *     <Plot axis="wavelength" type="SPECTRUM" unit="nm">
 *       <LovekitTrace value={self.scope.spectrum} />
 *     </Plot>
 *
 * The definition imports nothing of the render: the catalog is exported
 * offline, where three.js and WebGPU cannot load.
 */

const PlotPart = preloadable<BlokRenderArgs>(() => import("./PlotSurface").then((module) => ({ default: module.PlotRender })));

export const plotSchema = z
  .object({
    axis: z.string().describe('The name of the measured axis, e.g. "wavelength".'),
    type: z
      .enum(["SPACE", "TIME", "MICROTIME", "SPECTRUM"])
      .optional()
      .describe("What the axis measures, as mikro names it. Defaults to SPECTRUM."),
    unit: z.string().describe('The unit positions along the axis are shown in, e.g. "nm". Every mount is converted into it.'),
    reference: z
      .string()
      .optional()
      .describe("The space the axis is in, as mikro and lovekit name a reference; mounts of another space are flagged."),
    height: sizeSchema.describe('CSS height of the plot. Defaults to "20rem".'),
    className: classNameSchema,
  })
  .describe(
    "A plot along one measured axis. The mounts inside it (LovekitTrace) are drawn along that axis, each in a row of its own.",
  );

export const PlotBlok = createBlokComponent(
  {
    name: "Plot",
    acceptsChildren: true,
    placement: { notDownstreamOf: ["Plot"] },
    schema: plotSchema,
  },
  (args: BlokRenderArgs): React.ReactElement => (
    <React.Suspense fallback={null}>
      <PlotPart {...args} />
    </React.Suspense>
  ),
);

/** The blok components core brings beside the base catalog. */
export const CORE_BLOKS: readonly BlokComponentDefinition[] = [PlotBlok];
