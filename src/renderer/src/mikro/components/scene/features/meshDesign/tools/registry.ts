import type { LucideIcon } from "lucide-react";

import type { DesignToolId } from "../../../platform/stores/modeStore";
import type { DesignToolRunContext } from "./context";
import { traceTool } from "./traceTool";
import { seedTool } from "./seedTool";
import { carveTool } from "./carveTool";
import { stampTool } from "./stampTool";
import { sculptTool } from "./sculptTool";
import { trimTool } from "./trimTool";
import { bridgeTool } from "./bridgeTool";
import { liftTool } from "./liftTool";
import { splitTool } from "./splitTool";

// The gesture capture (`useBrushSkeleton.extract`) accepts a pending
// candidate before it hands a release to a tool; it reaches that through the
// registry, its one door into the designer.
export { commitCandidate } from "../reconstruct/candidate";

/**
 * The design tools — one module per verb, picked in the designer's toolbar.
 *
 * DESIGN navigates like NAVIGATE, and a tool ACTS only while its key is
 * HELD (`modeStore.designTool`). Clicking its toolbar button — or pressing
 * the key — also SELECTS it (`modeStore.selectedDesignTool`), which is only
 * about whose panel is shown. The gesture class says who captures a held
 * tool's gesture:
 *
 *  - `volume-stroke` / `volume-click` — captured by the volume layers'
 *    pointer handlers into the brush store, and dispatched on release by
 *    `useBrushSkeleton.extract` to `run(ctx)` here.
 *  - `surface` / `screen` — owned by `ui/MeshDesignSession.tsx` (overlay
 *    raycasts / camera math), no volume probe involved.
 *
 * `trace` and `seed` are the two RECONSTRUCT tools: they only capture the
 * gesture, and the reconstructor picked for it (`reconstruct/registry.ts`)
 * decides what the data becomes. Every other tool edits what is there.
 *
 * Adding a tool = one module + one entry in `DESIGN_TOOLS`. The toolbar, the
 * key bindings and the shortcuts overlay all derive from the registry, so a
 * tool cannot exist half-wired.
 */
export type DesignToolGesture = "volume-stroke" | "volume-click" | "surface" | "screen";

export type DesignTool = {
  id: DesignToolId;
  /** The HELD key that arms it (lowercase; must not collide with HOLD_MODES). */
  key: string;
  label: string;
  icon: LucideIcon;
  /** `primary` tools are toolbar buttons; `more` ones sit in its More menu. */
  group: "primary" | "more";
  gesture: DesignToolGesture;
  /** The toolbar's status line for the tool (prefixed "Hold K —" until held). */
  hint: string;
  /** The `?` overlay entry. */
  shortcut: { keys: string[]; description: string };
  /** Volume tools only — surface/screen tools run inside the session UI. */
  run?: (ctx: DesignToolRunContext) => Promise<void>;
};

export const DESIGN_TOOLS: readonly DesignTool[] = [
  traceTool,
  seedTool,
  carveTool,
  sculptTool,
  stampTool,
  trimTool,
  splitTool,
  bridgeTool,
  liftTool,
];

export const designToolById = (id: DesignToolId | null | undefined): DesignTool | undefined =>
  DESIGN_TOOLS.find((tool) => tool.id === id);

export const designToolByKey = (key: string): DesignTool | undefined =>
  DESIGN_TOOLS.find((tool) => tool.key === key);
