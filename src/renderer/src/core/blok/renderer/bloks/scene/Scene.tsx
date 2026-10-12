import * as React from 'react';
import * as THREE from 'three';
import * as z from 'zod';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {Grid, OrbitControls} from '@react-three/drei';
import {Grid3x3, Pin, RotateCw, Scan, Settings2, X} from 'lucide-react';
import {NAVIGATE_BUTTONS_3D} from '@/core/data/scene/camera/navigateButtons';
import {Button} from '@/core/ui/button';
import {ButtonGroup} from '@/core/ui/button-group';
import {Popover, PopoverContent, PopoverTrigger} from '@/core/ui/popover';
import {Switch} from '@/core/ui/switch';
import {
  BlokNodeErrorSurface,
  createBlokComponent,
  useBlok,
  useValue,
  type BlokNodeErrorProps,
  type BlokRenderArgs,
} from '../../runtime';
import {describedString} from '../shared/schemas';
import {
  createSceneStore,
  SceneStoreProvider,
  useSceneNotice,
  useSceneState,
  useSceneStoreApi,
  type SceneOverlay,
  type SceneView,
} from './context';
import {BlokSceneEmbedProvider, useBlokSceneEmbedded, useBlokSceneFill} from './host';

/** The direction each view looks from, toward what it frames. */
const VIEW_DIRECTIONS: Record<SceneView, [number, number, number]> = {
  iso: [1, 0.8, 1],
  front: [0, 0.25, 1],
  side: [1, 0.25, 0],
  top: [0, 1, 0.001],
};

const VIEW_LABELS: Record<SceneView, string> = {iso: 'Iso', front: 'Front', side: 'Side', top: 'Top'};

/** The height a scene takes where the element it is in has none to fit. */
const FALLBACK_HEIGHT = '24rem';

const bounds = new THREE.Box3();
const sphere = new THREE.Sphere();

/**
 * Points the camera at what is in the scene.
 *
 * A view is a direction; how far back the camera stands follows from the size
 * of the models, so a 5 cm stage and a 2 m robot both fill the view. The scene
 * is framed when a view is asked for, and once when its first model arrives —
 * not on every change, which would take the camera out of the viewer's hands.
 */
const CameraRig = () => {
  const store = useSceneStoreApi();
  const view = useSceneState(state => state.view);
  const placed = useSceneState(state => state.placed);
  // Read when a view is framed, not subscribed to: framing moves the camera.
  const three = useThree(state => state.get);
  const ready = useThree(state => state.controls !== null);

  const frame = React.useCallback(
    (name: SceneView) => {
      const camera = three().camera;
      const controls = three().controls as unknown as {target: THREE.Vector3; update: () => void} | null;
      if (!ready || !controls) return;
      bounds.makeEmpty();
      store.getState().placed.forEach(object => {
        // A model that was just placed has not been through a frame yet.
        object.updateWorldMatrix(true, true);
        bounds.expandByObject(object);
      });
      if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-0.15, 0, -0.15), new THREE.Vector3(0.15, 0.3, 0.15));
      bounds.getBoundingSphere(sphere);
      const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
      const distance = (Math.max(sphere.radius, 0.01) / Math.sin(fov / 2)) * 1.15;
      const direction = new THREE.Vector3(...VIEW_DIRECTIONS[name]).normalize();
      controls.target.copy(sphere.center);
      camera.position.copy(sphere.center).addScaledVector(direction, distance);
      camera.near = distance / 200;
      camera.far = distance * 200;
      camera.updateProjectionMatrix();
      controls.update();
    },
    [ready, store, three],
  );

  React.useEffect(() => frame(view.name), [frame, view]);

  const framedFor = React.useRef(0);
  React.useEffect(() => {
    if (placed.size > framedFor.current) frame(store.getState().view.name);
    framedFor.current = placed.size;
  }, [frame, placed, store]);

  return null;
};

/**
 * Left-drag moves the view and shift turns it, as in every other viewer here:
 * a click on a part must not start an orbit.
 */
const SceneOrbitControls = () => (
  <OrbitControls
    makeDefault
    enableDamping
    mouseButtons={NAVIGATE_BUTTONS_3D}
    autoRotate={useSceneState(state => state.settings.autoRotate)}
    autoRotateSpeed={0.8}
  />
);

/** Inside the canvas an error cannot be a card; it is reported beside the scene. */
const SceneErrorSurface = ({componentId, title, detail}: BlokNodeErrorProps) => {
  useSceneNotice(title, detail ? `${detail} (${componentId})` : componentId);
  return null;
};

const projected = new THREE.Vector3();

/** Keeps every popout on its anchor, once per frame, without a React render. */
const OverlayTracker = ({elements}: {elements: React.RefObject<Map<string, HTMLDivElement>>}) => {
  const store = useSceneStoreApi();
  const {camera, size} = useThree();
  useFrame(() => {
    store.getState().overlays.forEach(overlay => {
      const element = elements.current?.get(overlay.id);
      if (!element || overlay.mode !== 'popout') return;
      const anchor = overlay.anchor();
      if (!anchor) {
        element.style.display = 'none';
        return;
      }
      anchor.getWorldPosition(projected).project(camera);
      const behind = projected.z > 1;
      element.style.display = behind ? 'none' : '';
      const x = (projected.x * 0.5 + 0.5) * size.width;
      const y = (-projected.y * 0.5 + 0.5) * size.height;
      element.style.transform = `translate(${x}px, ${y}px) translate(-50%, calc(-100% - 12px))`;
    });
  });
  return null;
};

const OverlayCard = ({
  overlay,
  register,
}: {
  overlay: SceneOverlay;
  register: (id: string, element: HTMLDivElement | null) => void;
}) => {
  const store = useSceneStoreApi();
  const pinned = useSceneState(state => state.pinned.has(overlay.id));
  const popout = overlay.mode === 'popout';
  return (
    <div
      ref={element => register(overlay.id, element)}
      className={
        popout
          ? 'pointer-events-auto absolute left-0 top-0 max-w-sm rounded-xl border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg'
          : 'pointer-events-auto max-h-full w-80 overflow-auto rounded-xl border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg'
      }
      onPointerDown={event => event.stopPropagation()}
    >
      {overlay.dismissable ? (
        <div className="-mr-1 -mt-1 mb-1 flex justify-end gap-1">
          <button
            type="button"
            aria-label={pinned ? 'Unpin' : 'Pin'}
            aria-pressed={pinned}
            className={`rounded p-1 hover:bg-muted ${pinned ? 'text-foreground' : 'text-muted-foreground'}`}
            onClick={() => store.getState().togglePinned(overlay.id)}
          >
            <Pin className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Close"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            onClick={() => overlay.onDismiss?.()}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
      {overlay.content}
    </div>
  );
};

/** The HTML half of a scene: popouts on their anchors, panels beside the view, and what went wrong. */
const SceneOverlays = ({elements}: {elements: React.RefObject<Map<string, HTMLDivElement>>}) => {
  const overlays = useSceneState(state => state.overlays);
  const notices = useSceneState(state => state.notices);
  const showNotices = useSceneState(state => state.settings.notices);
  const register = React.useCallback(
    (id: string, element: HTMLDivElement | null) => {
      if (element) elements.current?.set(id, element);
      else elements.current?.delete(id);
    },
    [elements],
  );
  const all = [...overlays.values()];
  const panels = all.filter(overlay => overlay.mode === 'panel');
  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {all
          .filter(overlay => overlay.mode === 'popout')
          .map(overlay => (
            <OverlayCard key={overlay.id} overlay={overlay} register={register} />
          ))}
      </div>
      {panels.length ? (
        <div className="pointer-events-none absolute bottom-12 right-2 top-2 flex flex-col gap-2">
          {panels.map(overlay => (
            <OverlayCard key={overlay.id} overlay={overlay} register={register} />
          ))}
        </div>
      ) : null}
      {notices.size && showNotices ? (
        <div className="pointer-events-none absolute bottom-2 left-2 flex max-w-md flex-col gap-1">
          {[...notices.values()].map(notice => (
            <div
              key={notice.id}
              role="alert"
              className="pointer-events-auto rounded-lg border border-amber-500/40 bg-background/90 px-3 py-1.5 text-xs"
            >
              <span className="font-medium">{notice.title}</span>
              {notice.detail ? <span className="text-muted-foreground"> {notice.detail}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
};

const SettingRow = (props: {label: string; hint: string; checked: boolean; onChange: (checked: boolean) => void}) => (
  <label className="flex items-center justify-between gap-4 py-1" title={props.hint}>
    <span className="text-xs text-muted-foreground">{props.label}</span>
    <Switch checked={props.checked} onCheckedChange={props.onChange} />
  </label>
);

const NAVIGATION_HINTS: Array<[string, string]> = [
  ['Drag', 'Move the view'],
  ['Shift + drag', 'Turn around the scene'],
  ['Right-drag', 'Turn around the scene'],
  ['Scroll', 'Zoom'],
  ['Click a part', 'Use it, where the view offers that'],
];

/**
 * The scene's own controls, docked bottom-right like the image viewer's: where
 * to look from, and how the view is drawn. They change the viewer's picture
 * only, never the device.
 */
const SceneControls = () => {
  const store = useSceneStoreApi();
  const view = useSceneState(state => state.view.name);
  const settings = useSceneState(state => state.settings);
  const noticeCount = useSceneState(state => state.notices.size);
  const update = store.getState().updateSettings;
  const quiet = 'h-7 bg-black p-0';
  return (
    <div
      className="pointer-events-auto absolute bottom-2 right-2 z-30 flex items-center gap-2 rounded-lg border border-black/10 bg-black/40 p-1 backdrop-blur-md"
      onPointerDown={event => event.stopPropagation()}
    >
      <ButtonGroup>
        {(Object.keys(VIEW_LABELS) as SceneView[]).map(name => (
          <Button
            key={name}
            variant={view === name ? 'default' : 'outline'}
            size="xs"
            className={view === name ? 'h-7 px-2' : 'h-7 bg-black px-2'}
            onClick={() => store.getState().requestView(name)}
            title={`Look from the ${VIEW_LABELS[name].toLowerCase()} and frame everything`}
          >
            <span className="text-xs font-medium">{VIEW_LABELS[name]}</span>
          </Button>
        ))}
      </ButtonGroup>
      <Button
        variant="outline"
        size="xs"
        className={`${quiet} w-8`}
        onClick={() => store.getState().requestView(view)}
        title="Frame everything in the scene"
      >
        <Scan className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={settings.grid ? 'default' : 'outline'}
        size="xs"
        className={settings.grid ? 'h-7 w-8 p-0' : `${quiet} w-8`}
        onClick={() => update({grid: !settings.grid})}
        title={settings.grid ? 'Hide the ground grid' : 'Show the ground grid'}
      >
        <Grid3x3 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={settings.autoRotate ? 'default' : 'outline'}
        size="xs"
        className={settings.autoRotate ? 'h-7 w-8 p-0' : `${quiet} w-8`}
        onClick={() => update({autoRotate: !settings.autoRotate})}
        title={settings.autoRotate ? 'Stop turning the view' : 'Turn the view slowly around the scene'}
      >
        <RotateCw className="h-3.5 w-3.5" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="xs" className={`${quiet} w-8`} title="View settings and how to navigate">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-64 p-3">
          <SettingRow
            label="Ground grid"
            hint="A grid on the floor; each bold line is half a meter."
            checked={settings.grid}
            onChange={grid => update({grid})}
          />
          <SettingRow
            label="Turn slowly"
            hint="Keeps the view circling the scene until you take over."
            checked={settings.autoRotate}
            onChange={autoRotate => update({autoRotate})}
          />
          <SettingRow
            label={noticeCount ? `Warnings (${noticeCount})` : 'Warnings'}
            hint="What is wrong with the scene, such as a binding to a part the model does not have."
            checked={settings.notices}
            onChange={notices => update({notices})}
          />
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-border/60 pt-2 text-xs">
            {NAVIGATION_HINTS.map(([gesture, effect]) => (
              <React.Fragment key={gesture}>
                <dt className="font-medium">{gesture}</dt>
                <dd className="text-muted-foreground">{effect}</dd>
              </React.Fragment>
            ))}
          </dl>
        </PopoverContent>
      </Popover>
    </div>
  );
};

/** The ground grid, drawn or not as the viewer chose. */
const SceneGrid = () =>
  useSceneState(state => state.settings.grid) ? (
    <Grid infiniteGrid cellSize={0.05} sectionSize={0.5} fadeDistance={8} cellColor="#8b8b8b" sectionColor="#6b6b6b" />
  ) : null;

type SceneSurfaceProps = {
  /** Where the camera starts looking from. */
  view?: SceneView;
  /** Whether the ground grid starts shown. */
  grid?: boolean;
  className?: string;
  style?: React.CSSProperties;
  frameRef?: React.Ref<HTMLDivElement>;
  /** Called for a click that hit nothing in the scene. */
  onPointerMissed?: () => void;
  /** HTML laid over the view, inside the scene's store. */
  overlay?: React.ReactNode;
  /** What stands in the scene: rendered inside the canvas. */
  children?: React.ReactNode;
};

/**
 * One 3D view: the renderer, camera, light rig and ground, with the HTML that
 * belongs to it laid over. A `Scene` blok opens one for itself; a host that
 * shows several scene bloks in one room opens one and renders them into it,
 * where their own `Scene` only contributes its models.
 */
export const SceneSurface = ({
  view = 'iso',
  grid = true,
  className,
  style,
  frameRef,
  onPointerMissed,
  overlay,
  children,
}: SceneSurfaceProps) => {
  // What is asked for is where the scene starts; from then on it is the viewer's.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = React.useMemo(() => createSceneStore({view, grid}), []);
  const elements = React.useRef(new Map<string, HTMLDivElement>());

  return (
    <SceneStoreProvider value={store}>
      <div ref={frameRef} className={className} style={style}>
        <Canvas
          className="absolute! inset-0"
          camera={{position: VIEW_DIRECTIONS[view], fov: 40, near: 0.005, far: 200}}
          onPointerMissed={() => {
            store.getState().dismiss();
            onPointerMissed?.();
          }}
        >
          <SceneStoreProvider value={store}>
            <BlokNodeErrorSurface.Provider value={SceneErrorSurface}>
              <BlokSceneEmbedProvider value>
                <ambientLight intensity={0.7} />
                <directionalLight position={[2, 4, 3]} intensity={1.6} />
                <directionalLight position={[-3, 2, -2]} intensity={0.5} />
                <SceneGrid />
                <SceneOrbitControls />
                <CameraRig />
                {children}
                <OverlayTracker elements={elements} />
              </BlokSceneEmbedProvider>
            </BlokNodeErrorSurface.Provider>
          </SceneStoreProvider>
        </Canvas>
        <SceneOverlays elements={elements} />
        <SceneControls />
        {overlay}
      </div>
    </SceneStoreProvider>
  );
};

const sceneSchema = z
  .object({
    camera: z
      .enum(['iso', 'front', 'side', 'top'])
      .optional()
      .describe('Where the camera starts looking from; it frames the models whatever their size. Defaults to iso.'),
    grid: z.boolean().optional().describe('Whether the ground grid starts shown; the viewer can switch it. Defaults to true.'),
    height: describedString(
      'CSS height of the view, e.g. "24rem". Omit to fit the element the scene is in (24rem where that has no height of its own).',
    ),
  })
  .describe(
    'Root of a 3D view: one renderer, camera and light rig. Y is up and one unit is one meter. Place Model and Robot inside.',
  );

type SceneRenderArgs = BlokRenderArgs<typeof sceneSchema>;

const SceneChildren = ({component, buildChild}: Pick<SceneRenderArgs, 'component' | 'buildChild'>) => (
  <>
    {(component.children ?? []).map(child => (
      <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
    ))}
  </>
);

const StandaloneScene = ({component, schema, buildChild}: SceneRenderArgs) => {
  const blok = useBlok(component, schema);
  const camera = useValue(blok.camera) ?? 'iso';
  const grid = useValue(blok.grid) ?? true;
  const declaredHeight = useValue(blok.height);
  // A surface that shows the scene as its backdrop decides the size, not the blok.
  const fill = useBlokSceneFill();
  // Undeclared, the scene fits the element it is in. The canvas is out of
  // flow, so "100%" of an element with no height of its own measures zero
  // rather than whatever the canvas happens to be; then it takes a height.
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [unsized, setUnsized] = React.useState(false);
  const fits = fill || declaredHeight === undefined;
  React.useLayoutEffect(() => {
    if (fits && !fill && frameRef.current?.clientHeight === 0) setUnsized(true);
  }, [fits, fill]);
  const height = fits ? (unsized && !fill ? FALLBACK_HEIGHT : '100%') : declaredHeight;

  return (
    <SceneSurface
      view={camera}
      grid={grid}
      frameRef={frameRef}
      className={fill ? 'relative w-full overflow-hidden' : 'relative w-full overflow-hidden rounded-xl bg-muted/20'}
      style={{height}}
    >
      <SceneChildren component={component} buildChild={buildChild} />
    </SceneSurface>
  );
};

export const SceneBlok = createBlokComponent(
  {
    name: 'Scene',
    acceptsChildren: true,
    placement: {childrenContext: 'scene', notDownstreamOf: ['Scene']},
    schema: sceneSchema,
  },
  args =>
    // Inside a scene that is already open, this one only adds what it holds:
    // the camera, grid and size are the surrounding scene's.
    useBlokSceneEmbedded() ? (
      <SceneChildren component={args.component} buildChild={args.buildChild} />
    ) : (
      <StandaloneScene {...args} />
    ),
);
