import type { DesignToolId } from "../../../platform/stores/modeStore";
import type { DesignToolRunContext } from "./context";
import { brushTool } from "./brushTool";
import { blobTool } from "./blobTool";
import { carveTool } from "./carveTool";
import { stampTool } from "./stampTool";
import { sculptTool } from "./sculptTool";
import { trimTool } from "./trimTool";
import { wandTool } from "./wandTool";
import { bridgeTool } from "./bridgeTool";
import { liftTool } from "./liftTool";
import { splitTool } from "./splitTool";

/**
 * The design tools — one module per verb, dispatched by held key.
 *
 * The interaction pattern is fixed: DESIGN navigates like NAVIGATE, a HELD
 * key arms exactly one tool (`modeStore.designTool`), and the gesture class
 * says who captures it:
 *
 *  - `volume-stroke` / `volume-click` — captured by the 3D volume's pointer
 *    handlers into the brush store, extracted on release by
 *    `useBrushSkeleton.extract`, which dispatches `run(ctx)` here.
 *  - `surface` / `screen` — owned by `ui/MeshDesignSession.tsx` (overlay
 *    raycasts / camera math), no volume probe involved.
 *
 * Adding a tool = one module + one entry in `DESIGN_TOOLS`. The keyboard
 * bindings, the shortcuts overlay and the toolbar hints all derive from the
 * registry, so a tool cannot exist half-wired.
 */
export type DesignToolGesture = "volume-stroke" | "volume-click" | "surface" | "screen";

export type DesignTool = {
  id: DesignToolId;
  /** The HELD key that arms it (lowercase; must not collide with HOLD_MODES). */
  key: string;
  label: string;
  gesture: DesignToolGesture;
  /** Which `AnnotateTool` the shared capture keys on, when it uses one. */
  roiTool: "BRUSH" | "BLOB" | null;
  /** The toolbar's status line while the tool is armed. */
  hint: string;
  /** The `?` overlay entry. */
  shortcut: { keys: string[]; description: string };
  /** Volume tools only — surface/screen tools run inside the session UI. */
  run?: (ctx: DesignToolRunContext) => Promise<void>;
};

export const DESIGN_TOOLS: readonly DesignTool[] = [brushTool, blobTool, carveTool, wandTool, liftTool, stampTool, sculptTool, trimTool, bridgeTool, splitTool];

export const designToolById = (id: DesignToolId | null | undefined): DesignTool | undefined =>
  DESIGN_TOOLS.find((tool) => tool.id === id);

export const designToolByKey = (key: string): DesignTool | undefined =>
  DESIGN_TOOLS.find((tool) => tool.key === key);
