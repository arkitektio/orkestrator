import * as React from "react";
import * as z from "zod";

import { classNameSchema, markStructureSchema } from "@arkitektio/bsx/catalogs";
import { createBlokComponent, type BlokComponentDefinition, type BlokRenderArgs } from "@arkitektio/bsx/renderer/runtime/index";

import { outputSchema, transformSchema } from "@/core/blok/mount/schema";
import { preloadable } from "@/core/util/preloadable";

/**
 * Live streams as mounts: a video stream's frames on a quad in a `Scene`, a
 * data stream (a spectrum) as a line in a `Plot`. Each starts in the space its
 * stream declares (axes, calibration, reference) and is placed by mikro-style
 * steps onto output axes (`core/blok/mount/steps.ts`):
 *
 *     <Scene camera="top">
 *       <LovekitVideo value={self.scope.camera} transform={self.scope.camera_steps} />
 *     </Scene>
 *
 * The definitions import nothing of the renders: the catalog is exported
 * offline, where three.js and LiveKit cannot load.
 */

const SERVICE = "lovekit";

const lazily =
  (Part: React.ComponentType<BlokRenderArgs>) =>
  (args: BlokRenderArgs): React.ReactElement => (
    <React.Suspense fallback={null}>
      <Part {...args} />
    </React.Suspense>
  );

const Parts = {
  LovekitVideo: preloadable<BlokRenderArgs>(() => import("./LovekitVideo").then((module) => ({ default: module.LovekitVideoRender }))),
  LovekitTrace: preloadable<BlokRenderArgs>(() => import("./LovekitTrace").then((module) => ({ default: module.LovekitTraceRender }))),
};

/** A lovekit stream, as a structure reference. */
const streamValue = (what: string) =>
  markStructureSchema(
    z.object({ object: z.union([z.string(), z.number()]), __identifier: z.string() }),
    "@lovekit/stream",
  )
    .nullish()
    .describe(`The ${what} stream, a structure reference: typically \`{self.state.stream}\`.`);

export const lovekitVideoSchema = z
  .object({
    value: streamValue("video"),
    transform: transformSchema,
    output: outputSchema,
    opacity: z.number().optional().describe("How opaque the frames are drawn, 0 to 1. Defaults to 1."),
  })
  .describe(
    "A live video stream's frames on a quad in a Scene, sized and placed by the stream's declared axes and calibration. Streams of one reference line up with each other.",
  );

export const LovekitVideoBlok = createBlokComponent(
  {
    name: "LovekitVideo",
    service: SERVICE,
    placement: { context: "scene", downstreamOf: ["Scene", "Space"] },
    schema: lovekitVideoSchema,
  },
  lazily(Parts.LovekitVideo),
);

export const lovekitTraceSchema = z
  .object({
    value: streamValue("data"),
    transform: transformSchema,
    output: outputSchema,
    color: z.string().optional().describe('The line colour, any CSS colour. Defaults to "#7dd3fc".'),
    className: classNameSchema,
  })
  .describe(
    "A live data stream (a spectrum, a profile) drawn as a line in a Plot: x from the stream's calibration converted to the plot's unit, y scaled to what has arrived.",
  );

export const LovekitTraceBlok = createBlokComponent(
  {
    name: "LovekitTrace",
    service: SERVICE,
    placement: { downstreamOf: ["Plot"] },
    schema: lovekitTraceSchema,
  },
  lazily(Parts.LovekitTrace),
);

export const LOVEKIT_BLOKS: readonly BlokComponentDefinition[] = [LovekitVideoBlok, LovekitTraceBlok];
