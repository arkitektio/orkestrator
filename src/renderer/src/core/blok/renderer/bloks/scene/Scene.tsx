import * as React from 'react';
import * as THREE from 'three';
import * as z from 'zod';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {Grid, OrbitControls} from '@react-three/drei';
import {Anchor, GripVertical, Grid3x3, Pin, RotateCw, Scan, Settings2, X} from 'lucide-react';
import {NAVIGATE_BUTTONS_3D} from '@/core/data/scene/camera/navigateButtons';
import {Button} from '@/core/ui/button';
import {ButtonGroup} from '@/core/ui/button-group';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/core/ui/popover';
import {cn} from '@/core/util/utils';
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
import { useKeepTabLive } from "@/core/tabs/keepLive";
import {useBlokReady, useBlokSnapshotMode} from '@/core/blok/preview/snapshotMode';

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

/** Room kept between a card and the edge of the view, and between a card and what it points at. */
const CARD_INSET = 8;
const CARD_GAP = 12;

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), Math.max(low, high));

/**
 * A popout card as the frame loop moves it: its element, where the viewer
 * dragged it (null while it rides its anchor), and the leader drawn from it to
 * the anchor once it was dragged away.
 */
type CardHandle = {
  element: HTMLDivElement | null;
  detached: {x: number; y: number} | null;
  leader: SVGLineElement | null;
  dot: SVGCircleElement | null;
};

type CardHandles = React.RefObject<Map<string, CardHandle>>;

/**
 * Keeps every popout on its anchor, once per frame, without a React render.
 *
 * A card rides above the spot it points at, kept inside the view and flipped
 * below when there is no room above. A card the viewer dragged away stays
 * where it was dropped, and a leader line runs from it to the spot.
 */
const OverlayTracker = ({cards}: {cards: CardHandles}) => {
  const store = useSceneStoreApi();
  const {camera, size} = useThree();
  useFrame(() => {
    store.getState().overlays.forEach(overlay => {
      const handle = cards.current?.get(overlay.id);
      const element = handle?.element;
      if (!handle || !element || overlay.mode !== 'popout') return;
      const anchor = overlay.anchor();
      if (!anchor) {
        element.style.display = 'none';
        return;
      }
      if (overlay.point) projected.copy(overlay.point).applyMatrix4(anchor.matrixWorld);
      else anchor.getWorldPosition(projected);
      projected.project(camera);
      const behind = projected.z > 1;
      const x = (projected.x * 0.5 + 0.5) * size.width;
      const y = (-projected.y * 0.5 + 0.5) * size.height;
      const width = element.offsetWidth;
      const height = element.offsetHeight;

      if (handle.detached) {
        const left = clamp(handle.detached.x, 0, size.width - width);
        const top = clamp(handle.detached.y, 0, size.height - height);
        element.style.display = '';
        element.style.transform = `translate(${left}px, ${top}px)`;
        const leader = handle.leader;
        const dot = handle.dot;
        if (leader && dot) {
          leader.style.display = behind ? 'none' : '';
          dot.style.display = behind ? 'none' : '';
          // To the nearest point of the card's edge.
          leader.setAttribute('x1', String(x));
          leader.setAttribute('y1', String(y));
          leader.setAttribute('x2', String(clamp(x, left, left + width)));
          leader.setAttribute('y2', String(clamp(y, top, top + height)));
          dot.setAttribute('cx', String(x));
          dot.setAttribute('cy', String(y));
        }
        return;
      }

      element.style.display = behind ? 'none' : '';
      if (handle.leader) handle.leader.style.display = 'none';
      if (handle.dot) handle.dot.style.display = 'none';
      const above = y - height - CARD_GAP;
      const top = above >= CARD_INSET ? above : y + CARD_GAP;
      const left = clamp(x - width / 2, CARD_INSET, size.width - width - CARD_INSET);
      element.style.transform = `translate(${left}px, ${clamp(top, CARD_INSET, size.height - height - CARD_INSET)}px)`;
    });
  });
  return null;
};

/** How far (px) the header must be dragged before the card leaves its anchor. */
const DRAG_SLOP_PX = 3;
/** The smallest a card can be resized to. */
const MIN_CARD = {width: 208, height: 96};

/** What a card shows, as a shadcn popover does: a header (title, description, buttons), then its content. */
const CardBody = ({
  overlay,
  handle,
  detached,
  onAttach,
}: {
  overlay: SceneOverlay;
  /** Where the header starts a drag; a panel has none. */
  handle?: (event: React.PointerEvent<HTMLDivElement>) => void;
  detached?: boolean;
  onAttach?: () => void;
}) => {
  const store = useSceneStoreApi();
  const pinned = useSceneState(state => state.pinned.has(overlay.id));
  const header = handle || overlay.title || overlay.dismissable;
  return (
    <>
      {header ? (
        <div
          className={cn(
            'flex items-start gap-1.5',
            handle && 'cursor-grab touch-none select-none active:cursor-grabbing',
          )}
          onPointerDown={handle}
          title={handle ? 'Drag to move the card aside' : undefined}
        >
          {handle ? <GripVertical aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" /> : null}
          <PopoverHeader className="min-w-0 flex-1">
            {overlay.title ? <PopoverTitle className="truncate">{overlay.title}</PopoverTitle> : null}
            {overlay.description ? <PopoverDescription>{overlay.description}</PopoverDescription> : null}
          </PopoverHeader>
          <div className="-mr-1 -mt-1 flex shrink-0 items-center">
            {detached && onAttach ? (
              <Button variant="ghost" size="icon-xs" aria-label="Back to the part" title="Back to the part" onClick={onAttach}>
                <Anchor />
              </Button>
            ) : null}
            {overlay.dismissable ? (
              <>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={pinned ? 'Unpin' : 'Pin'}
                  aria-pressed={pinned}
                  title={pinned ? 'Unpin: a click elsewhere closes it' : 'Pin: keep it open'}
                  className={pinned ? 'text-foreground' : 'text-muted-foreground'}
                  onClick={() => store.getState().togglePinned(overlay.id)}
                >
                  <Pin className={pinned ? 'fill-current' : undefined} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Close"
                  className="text-muted-foreground"
                  onClick={() => overlay.onDismiss?.()}
                >
                  <X />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">{overlay.content}</div>
    </>
  );
};

const CARD_CLASS =
  'flex flex-col gap-2 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10';

/** Escape closes a card that a click elsewhere would close. */
const closeOnEscape = (overlay: SceneOverlay) => (event: React.KeyboardEvent) => {
  if (event.key !== 'Escape' || !overlay.dismissable) return;
  event.stopPropagation();
  overlay.onDismiss?.();
};

/** A card on its anchor in the 3D view; dragged by its header, it stays where it is dropped. */
const PopoutCard = ({overlay, cards}: {overlay: SceneOverlay; cards: CardHandles}) => {
  const store = useSceneStoreApi();
  const handle = React.useMemo<CardHandle>(() => ({element: null, detached: null, leader: null, dot: null}), []);
  const [detached, setDetached] = React.useState(false);
  // What the viewer resized the card to; null while it fits its content.
  const [size, setSize] = React.useState<{width: number; height: number} | null>(null);
  const body = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const all = cards.current;
    all?.set(overlay.id, handle);
    return () => {
      if (all?.get(overlay.id) === handle) all.delete(overlay.id);
    };
  }, [cards, handle, overlay.id]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = handle.element;
    const frame = element?.offsetParent;
    if (event.button !== 0 || !element || !frame || (event.target as Element).closest('button')) return;
    event.preventDefault();
    const card = element.getBoundingClientRect();
    const bounds = frame.getBoundingClientRect();
    const from = handle.detached ?? {x: card.left - bounds.left, y: card.top - bounds.top};
    const origin = {x: event.clientX, y: event.clientY};
    let moved = false;
    const move = (pointer: PointerEvent) => {
      const dx = pointer.clientX - origin.x;
      const dy = pointer.clientY - origin.y;
      if (!moved && Math.hypot(dx, dy) < DRAG_SLOP_PX) return;
      moved = true;
      handle.detached = {
        x: clamp(from.x + dx, 0, bounds.width - card.width),
        y: clamp(from.y + dy, 0, bounds.height - card.height),
      };
      element.style.transform = `translate(${handle.detached.x}px, ${handle.detached.y}px)`;
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (!moved) return;
      setDetached(true);
      keep();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  /** A card the viewer worked on (moved, resized) is one to keep: a click on the scene leaves it open. */
  const keep = () => {
    if (overlay.dismissable && !store.getState().pinned.has(overlay.id)) store.getState().togglePinned(overlay.id);
  };

  /** Resizes from the bottom-right corner, up to the edges of the view. */
  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const card = body.current;
    const frame = handle.element?.offsetParent;
    if (event.button !== 0 || !card || !frame) return;
    event.preventDefault();
    event.stopPropagation();
    const from = card.getBoundingClientRect();
    const bounds = frame.getBoundingClientRect();
    const origin = {x: event.clientX, y: event.clientY};
    let next = {width: from.width, height: from.height};
    // A card on its anchor would re-centre as it grows: it holds still until released.
    const riding = handle.detached === null;
    if (riding) handle.detached = {x: from.left - bounds.left, y: from.top - bounds.top};
    const move = (pointer: PointerEvent) => {
      next = {
        width: clamp(from.width + pointer.clientX - origin.x, MIN_CARD.width, bounds.right - from.left - CARD_INSET),
        height: clamp(from.height + pointer.clientY - origin.y, MIN_CARD.height, bounds.bottom - from.top - CARD_INSET),
      };
      // Drawn directly while dragging; React hears the size once, on release.
      card.style.width = `${next.width}px`;
      card.style.height = `${next.height}px`;
      card.style.maxWidth = 'none';
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (riding) handle.detached = null;
      setSize(next);
      keep();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  const attach = () => {
    handle.detached = null;
    setDetached(false);
  };

  return (
    <>
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <line
          ref={line => {
            handle.leader = line;
          }}
          className="stroke-foreground/40"
          strokeWidth={1}
          strokeDasharray="3 3"
          style={{display: 'none'}}
        />
        <circle
          ref={dot => {
            handle.dot = dot;
          }}
          r={3}
          className="fill-popover stroke-foreground/60"
          strokeWidth={1.5}
          style={{display: 'none'}}
        />
      </svg>
      <div
        ref={element => {
          handle.element = element;
        }}
        className="pointer-events-auto absolute left-0 top-0 will-change-transform"
        onPointerDown={event => event.stopPropagation()}
        onKeyDown={closeOnEscape(overlay)}
      >
        {/* The frame loop moves the outer box; the inner one animates in. */}
        <div
          ref={body}
          data-detached={detached || undefined}
          className={cn(
            CARD_CLASS,
            'relative animate-in fade-in-0 zoom-in-95 duration-100',
            // Fits its content until the viewer sizes it.
            size ? 'max-w-none' : 'w-max min-w-52 max-w-80 [&>div:nth-last-child(2)]:max-h-80',
            detached && 'shadow-lg ring-foreground/20',
          )}
          style={size ? {width: size.width, height: size.height} : undefined}
        >
          <CardBody overlay={overlay} handle={startDrag} detached={detached} onAttach={attach} />
          <div
            aria-hidden
            title="Drag to resize"
            onPointerDown={startResize}
            onDoubleClick={() => {
              const card = body.current;
              if (card) card.removeAttribute('style');
              setSize(null);
            }}
            className="absolute bottom-0 right-0 flex size-4 cursor-se-resize touch-none items-end justify-end p-0.5 text-muted-foreground/50 hover:text-muted-foreground"
          >
            <svg viewBox="0 0 8 8" className="size-2">
              <path d="M7 1 1 7M7 4 4 7" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
};

/** A card beside the view. */
const PanelCard = ({overlay}: {overlay: SceneOverlay}) => (
  <div
    className={cn(CARD_CLASS, 'pointer-events-auto max-h-full w-80 overflow-hidden')}
    onPointerDown={event => event.stopPropagation()}
    onKeyDown={closeOnEscape(overlay)}
  >
    <CardBody overlay={overlay} />
  </div>
);

/** The HTML half of a scene: popouts on their anchors, panels beside the view, and what went wrong. */
const SceneOverlays = ({cards}: {cards: CardHandles}) => {
  const overlays = useSceneState(state => state.overlays);
  const notices = useSceneState(state => state.notices);
  const showNotices = useSceneState(state => state.settings.notices);
  const all = [...overlays.values()];
  const panels = all.filter(overlay => overlay.mode === 'panel');
  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {all
          .filter(overlay => overlay.mode === 'popout')
          .map(overlay => (
            <PopoutCard key={overlay.id} overlay={overlay} cards={cards} />
          ))}
      </div>
      {panels.length ? (
        <div className="pointer-events-none absolute bottom-12 right-2 top-2 flex flex-col gap-2">
          {panels.map(overlay => (
            <PanelCard key={overlay.id} overlay={overlay} />
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

/** How many frames a preview waits for before the canvas counts as painted. */
const PAINTED_AFTER_FRAMES = 3;

/** A scene is not ready for its preview until its canvas has drawn a few frames. */
const FirstFrames = () => {
  const frames = React.useRef(0);
  const [painted, setPainted] = React.useState(false);
  useBlokReady(painted ? 'ready' : 'pending');
  useFrame(() => {
    if (painted) return;
    frames.current += 1;
    if (frames.current >= PAINTED_AFTER_FRAMES) setPainted(true);
  });
  return null;
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
  const cards = React.useRef(new Map<string, CardHandle>());
  // A frozen tab would drop the GPU context: stay live hidden.
  useKeepTabLive();
  // A preview reads the canvas after it painted: keep the drawing buffer.
  const snapshot = useBlokSnapshotMode();

  return (
    <SceneStoreProvider value={store}>
      <div ref={frameRef} className={className} style={style}>
        <Canvas
          className="absolute! inset-0"
          gl={snapshot ? {preserveDrawingBuffer: true} : undefined}
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
                <OverlayTracker cards={cards} />
                {snapshot && <FirstFrames />}
              </BlokSceneEmbedProvider>
            </BlokNodeErrorSurface.Provider>
          </SceneStoreProvider>
        </Canvas>
        <SceneOverlays cards={cards} />
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
