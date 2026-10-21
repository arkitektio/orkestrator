import * as React from "react";
import * as z from "zod";

import {
  actionProp,
  bindSchema,
  boolSchema,
  classNameSchema,
  sizeSchema,
  structureValueSchema,
} from "@/core/blok/renderer/bloks/shared";
import { createBlokComponent, type BlokComponentDefinition, type BlokRenderArgs } from "@/core/blok/renderer/runtime";

/**
 * The mikro scene, as blok components an app's blok composes: a `MikroScene`
 * owns one scene, and the parts placed inside it share it (its viewport, its
 * layer list, its shapes, its probe readout), laid out beside the app's own
 * controls. What happens in the scene runs the app's actions, the event as
 * `$event` (`event.annotation` in BSX):
 *
 *     <MikroScene value="@args.scene" bind="form.selected"
 *       onAnnotation="@self.segment(scene=args.scene, path=event.annotation, lens=event.lens).into(run)">
 *       <MikroSceneViewport height="36rem" />
 *       <MikroSceneLayers />
 *     </MikroScene>
 *
 * These definitions import nothing of the scene: the catalog is exported
 * offline, where three.js and WebGPU cannot load. The renders are lazy
 * (`./MikroSceneParts`).
 */

const Parts = {
  MikroScene: React.lazy(() => import("./MikroSceneParts").then((module) => ({ default: module.MikroSceneRender }))),
  MikroSceneViewport: React.lazy(() =>
    import("./MikroSceneParts").then((module) => ({ default: module.MikroSceneViewportRender })),
  ),
  MikroSceneLayers: React.lazy(() =>
    import("./MikroSceneParts").then((module) => ({ default: module.MikroSceneLayersRender })),
  ),
  MikroSceneAnnotations: React.lazy(() =>
    import("./MikroSceneParts").then((module) => ({ default: module.MikroSceneAnnotationsRender })),
  ),
  MikroSceneProbe: React.lazy(() =>
    import("./MikroSceneParts").then((module) => ({ default: module.MikroSceneProbeRender })),
  ),
};

const lazily =
  (Part: React.ComponentType<BlokRenderArgs>) =>
  (args: BlokRenderArgs): React.ReactElement => (
    <React.Suspense fallback={null}>
      <Part {...args} />
    </React.Suspense>
  );

const INSIDE = { downstreamOf: ["MikroScene"] } as const;

export const mikroSceneSchema = z
  .object({
    value: structureValueSchema.describe("The scene, a structure reference: typically @args.scene."),
    bind: bindSchema.describe(
      'Where the selection is written: {"annotation", "lens"} (structure references), or null when nothing is selected.',
    ),
    bindWorld: bindSchema.describe(
      'Where the scene\'s world coordinate system is written, a structure reference ({"object", "__identifier": "@mikro/coordinatesystem"}), once the scene has loaded. What a picker of what this scene can show asks the server with: `lenses(filters: {placeableIn: {space: $world}})`, `$world` read from this path.',
    ),
    live: boolSchema.describe(
      "Follow the scene as others change it, an action writing a layer included. Defaults to true.",
    ),
    className: classNameSchema,
    onAnnotation: actionProp(
      'Runs when a shape is drawn. $event is {"annotation", "kind", "lens", "descriptors"}: the shape and the lens under the probe as structure references (lens null when none was under it).',
    ),
    onSelect: actionProp(
      'Runs when the user changes the selection (the selection a draw makes is reported as onAnnotation, not here). $event is {"annotation", "annotations", "lens"}.',
    ),
    onPick: actionProp(
      'Runs on a deliberate click that reads a voxel (probe mode, not a vertex being placed). $event is {"layer", "world", "voxel", "lens"}.',
    ),
    onLayersChange: actionProp(
      'Runs when a layer comes, goes or draws another lens. $event is {"layers", "added"}; an action here that writes layers is told again, `added` names the new ones.',
    ),
  })
  .describe(
    "One mikro scene and its stores, shared by the MikroScene parts inside it. One per blok is the supported case: a second scene's viewport also hears the window's keyboard.",
  );

export const MikroSceneBlok = createBlokComponent(
  {
    name: "MikroScene",
    acceptsChildren: true,
    placement: { notDownstreamOf: ["MikroScene"] },
    schema: mikroSceneSchema,
  },
  lazily(Parts.MikroScene),
);

export const mikroSceneViewportSchema = z
  .object({
    height: sizeSchema.describe('CSS height of the viewport. Defaults to "32rem".'),
    minHeight: sizeSchema.describe("CSS minimum height of the viewport."),
    sliders: boolSchema.describe("Show the Z and dimension sliders. Defaults to true."),
    cards: boolSchema.describe(
      "Open a shape's action card on a click or a draw. Defaults to false here: the blok decides what a shape does.",
    ),
    className: classNameSchema,
  })
  .describe("The scene's interactive view: draw, probe, navigate. Placed inside a MikroScene.");

export const MikroSceneViewportBlok = createBlokComponent(
  {
    name: "MikroSceneViewport",
    placement: INSIDE,
    schema: mikroSceneViewportSchema,
  },
  lazily(Parts.MikroSceneViewport),
);

export const mikroScenePanelSchema = z.object({
  height: sizeSchema.describe("CSS height of the panel."),
  className: classNameSchema,
});

const panel = (name: string, description: string, Part: React.ComponentType<BlokRenderArgs>) =>
  createBlokComponent(
    {
      name,
      placement: INSIDE,
      schema: mikroScenePanelSchema.describe(description),
    },
    lazily(Part),
  );

export const MikroSceneLayersBlok = panel(
  "MikroSceneLayers",
  "The scene's layers, as the scene page's Layers tab lists them. Placed inside a MikroScene.",
  Parts.MikroSceneLayers,
);
export const MikroSceneAnnotationsBlok = panel(
  "MikroSceneAnnotations",
  "The scene's shapes and the selection, as the scene page's Annotations tab lists them. Placed inside a MikroScene.",
  Parts.MikroSceneAnnotations,
);
export const MikroSceneProbeBlok = panel(
  "MikroSceneProbe",
  "What the probe reads under the cursor. Placed inside a MikroScene.",
  Parts.MikroSceneProbe,
);

export const MIKRO_BLOKS: readonly BlokComponentDefinition[] = [
  MikroSceneBlok,
  MikroSceneViewportBlok,
  MikroSceneLayersBlok,
  MikroSceneAnnotationsBlok,
  MikroSceneProbeBlok,
];
