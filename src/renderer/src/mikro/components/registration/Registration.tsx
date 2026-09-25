import type { ReactNode } from "react";
import { Guard } from "@/core/app/Arkitekt";
import { SceneHostGuard } from "../scene/sceneHost";
import { BlinkKey } from "./canvas/BlinkKey";
import { Gizmo } from "./canvas/Gizmo";
import { LandmarkMarkers } from "./canvas/LandmarkMarkers";
import { LandmarkPicker } from "./canvas/LandmarkPicker";
import { MovingOutline } from "./canvas/MovingOutline";
import { NudgeKeys } from "./canvas/NudgeKeys";
import { PreviewSync } from "./canvas/PreviewSync";
import { SessionWatcher } from "./canvas/SessionWatcher";
import { LayerPicker } from "./panels/LayerPicker";
import { SessionPanel } from "./panels/SessionPanel";
import { useSeedRegistration } from "./hooks/useSeedRegistration";
import { RegistrationStoreProvider, useRegistration } from "./store/context";

/**
 * Interactive registration: overlay a layer on the others, move it into place,
 * and store the result as the coordinate-graph edge that places it.
 *
 * A WORKSPACE composed over the scene, not a scene feature. It owns its
 * session, math, solver and UI; of the scene it uses only the public surface —
 * `Scene.*` to render and `scene/sceneHost.ts` to list layers, preview a
 * placement and pick points (`registrationImports.test.ts` holds that line).
 * See scene/ARCHITECTURE.md "Workflows live outside".
 *
 * Hosted on its OWN page (`pages/SceneRegistrationPage`, `/mikro/scenes/:id/
 * register`) and nowhere else — the scene page stays a viewer:
 *
 *   <Scene.Provider scene={scene}>
 *     <Registration.Provider>                       // above the sidebar tabs
 *       <ModelPage additionalSidebars={<Sidebars.Tab label="Registration"><Registration.Sidebar /></Sidebars.Tab>}>
 *         <Scene.Viewport inCanvas={<Registration.CanvasLayer />} />
 *       </ModelPage>
 *     </Registration.Provider>
 *   </Scene.Provider>
 *
 * The draft never becomes a second source of placement truth: it is previewed
 * as `D · asAffine` and saved by folding `D` into ONE edge
 * (scene/COORDINATE_SYSTEMS.md §1 R1a).
 */

/**
 * Everything that must be alive for a whole session, mounted in the scene's
 * in-canvas slot: the viewport outlives the sidebar tabs, which unmount when
 * another tab is showing.
 */
const CanvasLayer = () => (
  <>
    <PreviewSync />
    <SessionWatcher />
    <NudgeKeys />
    <BlinkKey />
    <LandmarkPicker />
    <MovingOutline />
    <LandmarkMarkers />
    <Gizmo />
  </>
);

const SidebarBody = () => {
  const active = useRegistration((state) => state.session !== null);
  const seed = useSeedRegistration();
  return active ? <SessionPanel /> : <LayerPicker onSeed={seed} />;
};

/**
 * The sidebar tab. Guarded from the OUTSIDE (CLAUDE.md §1): the save bar's edge
 * query fires on mount, so a JSX-level guard inside would already be too late.
 */
const Sidebar = () => (
  <SceneHostGuard fallback={<div className="p-4 text-center text-xs text-muted-foreground">Loading scene…</div>}>
    <Guard.Mikro unavailable={<></>}>
      <SidebarBody />
    </Guard.Mikro>
  </SceneHostGuard>
);

const Provider = (props: { children: ReactNode }) => (
  <RegistrationStoreProvider>{props.children}</RegistrationStoreProvider>
);

export const Registration = { Provider, CanvasLayer, Sidebar };
