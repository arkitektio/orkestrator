import type { ReactNode } from "react";

import { cn } from "@/core/util/utils";
import type { SceneFragment } from "../api/graphql";
import { Scene } from "../components/scene/Scene";

/**
 * A scene inside someone else's UI (a blok pane): the viewport and its
 * scrubbers, without the page around it. It fills its parent, which must have
 * a height.
 *
 * `brandTheme={false}`: the app's hue follows the scene on a scene page, where
 * there is one. Several embedded scenes would fight over it, and unmounting one
 * would release the other's.
 */
export const EmbeddedScene = ({
  scene,
  controls,
  className,
}: {
  scene: SceneFragment;
  controls?: boolean;
  className?: string;
}) => (
  <div className={cn("relative h-full w-full overflow-hidden", className)}>
    <Scene.Provider scene={scene} brandTheme={false}>
      {/* Keyed on the scene id: the renderer builds its stores per scene. */}
      <Scene.Viewport key={scene.id}>
        {controls === false ? (
          // An empty fragment, not nothing: no children means the default panels.
          <></>
        ) : (
          <>
            <Scene.Dock side="right">
              <Scene.ZSlider />
            </Scene.Dock>
            <Scene.Dock side="bottom">
              <Scene.DimSliders />
            </Scene.Dock>
          </>
        )}
      </Scene.Viewport>
    </Scene.Provider>
  </div>
);

export const ViewerNotice = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      "flex h-full w-full items-center justify-center px-4 text-sm text-muted-foreground",
      className,
    )}
  >
    {children}
  </div>
);
