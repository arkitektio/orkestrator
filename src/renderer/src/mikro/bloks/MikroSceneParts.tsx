import * as React from "react";

import {
  asStructure,
  renderChildList,
  useControlledValue,
} from "@/core/blok/renderer/bloks/shared";
import { useBinding, useBlok, useEventAction, useValue, type BlokRenderArgs } from "@/core/blok/renderer/runtime";
import { cn } from "@/core/util/utils";
import { useGetSceneQuery, type SceneFragment } from "@/mikro/api/graphql";
import { Scene } from "@/mikro/components/scene/Scene";
import {
  SceneHostGuard,
  useLiveScene,
  useSceneAnnotationCollections,
  useSceneEvents,
  type SceneSelectPayload,
} from "@/mikro/components/scene/sceneHost";
import { useLiveSceneAnnotations } from "@/mikro/lib/annotations/useLiveSceneAnnotations";

import { mikroScenePanelSchema, mikroSceneSchema, mikroSceneViewportSchema } from "./index";

/** Which scene the parts inside a `MikroScene` draw: what they key their remounts on. */
const MikroSceneContext = React.createContext<SceneFragment | null>(null);

const Notice = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full min-h-24 w-full items-center justify-center p-4 text-sm text-muted-foreground">
    {children}
  </div>
);

/** The selection a `bind` holds: the shape and the lens it was looked at with. */
type BoundSelection = Pick<SceneSelectPayload, "annotation" | "lens"> | null;

const asSelection = (raw: unknown): BoundSelection => {
  if (raw == null || typeof raw !== "object") return null;
  const value = raw as { annotation?: unknown; lens?: unknown };
  return { annotation: asStructure(value.annotation), lens: asStructure(value.lens) };
};

export const MikroSceneRender = ({ component, buildChild }: BlokRenderArgs) => {
  const blok = useBlok(component, mikroSceneSchema);
  const value = asStructure(useValue(blok.value));
  const className = useValue(blok.className);
  const { data, loading, error } = useGetSceneQuery({
    variables: { id: String(value?.object ?? "") },
    skip: !value,
    // As ScenePage: a layer whose placement cannot condense nulls that field, not the scene.
    errorPolicy: "all",
  });
  const scene = data?.scene ?? null;

  if (!value) return <Notice>No scene yet.</Notice>;
  if (!scene) return <Notice>{loading ? "Loading scene…" : (error?.message ?? "This scene could not be loaded.")}</Notice>;

  return (
    <div className={cn("relative min-w-0", className)}>
      <MikroSceneContext.Provider value={scene}>
        {/* Not the app's hue: a blok is one pane among others. */}
        <Scene.Provider scene={scene} brandTheme={false}>
          <SceneHostGuard>
            <SceneWiring component={component} sceneId={scene.id} />
          </SceneHostGuard>
          {renderChildList(component.children, buildChild)}
        </Scene.Provider>
      </MikroSceneContext.Provider>
    </div>
  );
};

/** The container's events, its selection binding, and following the scene live. */
const SceneWiring = ({ component, sceneId }: { component: BlokRenderArgs["component"]; sceneId: string }) => {
  const blok = useBlok(component, mikroSceneSchema);
  const bind = useValue(blok.bind);
  const live = useValue(blok.live) !== false;
  const onAnnotation = useEventAction(blok.onAnnotation);
  const onSelect = useEventAction(blok.onSelect);
  const onPick = useEventAction(blok.onPick);
  const onLayersChange = useEventAction(blok.onLayersChange);
  const selection = useControlledValue<BoundSelection>({
    bind,
    value: undefined,
    defaultValue: undefined,
    fallback: null,
    parse: asSelection,
  });
  const setSelection = selection.setValue;

  useSceneEvents({
    onAnnotation,
    // The binding follows every selection; the action only runs when one is declared.
    onSelect: bind || onSelect
      ? (payload) => {
          if (bind) setSelection(payload.annotation ? { annotation: payload.annotation, lens: payload.lens } : null);
          onSelect?.(payload);
        }
      : undefined,
    onPick,
    onLayersChange,
  });

  useBoundWorld(useValue(blok.bindWorld));
  useLiveScene(sceneId, live);
  return live ? <LiveCollections /> : null;
};

const WORLD = "@mikro/coordinatesystem";

/** Keeps `bindWorld` on the scene's world space. Written only when it differs: a write is a new binding. */
const useBoundWorld = (bind: string | undefined) => {
  const binding = useBinding(bind);
  const world = React.useContext(MikroSceneContext)?.worldCoordinateSystem?.id ?? null;
  const held = asStructure(binding?.value)?.object ?? null;
  React.useEffect(() => {
    if (!binding || String(held ?? "") === String(world ?? "")) return;
    binding.setValue(world ? { object: world, __identifier: WORLD } : null);
  }, [binding, held, world]);
};

const LiveCollections = () => (
  <>
    {useSceneAnnotationCollections().map((id) => (
      <LiveCollection key={id} collectionId={id} />
    ))}
  </>
);

const LiveCollection = ({ collectionId }: { collectionId: string }) => {
  useLiveSceneAnnotations(collectionId);
  return null;
};

export const MikroSceneViewportRender = ({ component }: BlokRenderArgs) => {
  const blok = useBlok(component, mikroSceneViewportSchema);
  const scene = React.useContext(MikroSceneContext);
  const height = useValue(blok.height);
  const minHeight = useValue(blok.minHeight);
  const sliders = useValue(blok.sliders) !== false;
  const cards = useValue(blok.cards) === true;
  const className = useValue(blok.className);
  if (!scene) return <Notice>Place the viewport inside a MikroScene.</Notice>;

  // A viewport fills its box, and nothing above a blok has a height to fill.
  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-xl", className)}
      style={{ height: height ?? "32rem", minHeight }}
    >
      {/* Keyed on the scene: the renderer builds its stores per scene. */}
      <Scene.Viewport key={scene.id} annotationCards={cards}>
        {sliders ? (
          <>
            <Scene.Dock side="right">
              <Scene.ZSlider />
            </Scene.Dock>
            <Scene.Dock side="bottom">
              <Scene.DimSliders />
            </Scene.Dock>
          </>
        ) : (
          // An empty fragment, not nothing: no children means the default panels.
          <></>
        )}
      </Scene.Viewport>
    </div>
  );
};

const panelRender =
  (Panel: React.ComponentType) =>
  ({ component }: BlokRenderArgs) => {
    const blok = useBlok(component, mikroScenePanelSchema);
    const height = useValue(blok.height);
    const className = useValue(blok.className);
    const scene = React.useContext(MikroSceneContext);
    if (!scene) return <Notice>Place this inside a MikroScene.</Notice>;
    return (
      <div className={cn("min-w-0 overflow-auto rounded-xl border", className)} style={{ height }}>
        <Panel />
      </div>
    );
  };

export const MikroSceneLayersRender = panelRender(Scene.LayersSidebar);
export const MikroSceneAnnotationsRender = panelRender(Scene.AnnotationsSidebar);
export const MikroSceneProbeRender = panelRender(Scene.ProbeSidebar);
