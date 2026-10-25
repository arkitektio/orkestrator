import * as React from 'react';
import * as THREE from 'three';
import {TransformControls} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {Box, Check, Magnet, Move3d, Plus, Replace, Rotate3d, Scale3d, Scan, Trash2} from 'lucide-react';
import {
  BlokSceneInertProvider,
  SceneOwnerProvider,
  SceneSurface,
  useSceneNotice,
  useSceneOverlay,
} from '@/core/blok/renderer/bloks/scene';
import {BlokSpaceHostProvider, type BlokSpaceHost} from '@/core/blok/renderer/bloks/run';
import {describeError, reportErrorAs, toast} from '@/core/notify';
import {useSmartDrop} from '@/core/smart/hooks';
import {Button} from '@/core/ui/button';
import {Input} from '@/core/ui/input';
import {Toggle} from '@/core/ui/toggle';
import {ToggleGroup, ToggleGroupItem} from '@/core/ui/toggle-group';
import {cn} from '@/core/util/utils';
import {
  ComponentContext,
  SpaceDocument,
  useCreatePlacementMutation,
  useCreateSpacePlacementMutation,
  useDeletePlacementMutation,
  useDeleteSpacePlacementMutation,
  useListMaterializedBloksQuery,
  useMaterializedBlokQuery,
  useUpdatePlacementMutation,
  useUpdateSpacePlacementMutation,
  type ListMaterializedBlokFragment,
  type SpaceBlokPlacementFragment,
  type SpaceFragment,
  type SpacePlacementFragment,
} from '@/rekuest/api/graphql';
import MaterializedBlokRenderer from '@/rekuest/components/MaterializedBlokRenderer';
import {RekuestSceneHost} from '@/rekuest/scene/RekuestSceneHost';
import {ActionBlokRenderer, RunHost} from '@/rekuest/run/ActionBlokRenderer';
import type {SpaceRun} from '@/rekuest/run/useRun';
import {
  autoFitScale,
  fitScale,
  freeSpot,
  fromMatrix4,
  readPose,
  readScale,
  toMatrix4,
  writePose,
  writeScale,
  type Affine,
  type Pose,
} from './affine';

/**
 * A space as one 3D room.
 *
 * What stands in it are 3D views: materialized bloks of the scene context.
 * Such a blok's root is always a `Scene`; here every one of them is rendered
 * into the room's single scene, where that root only contributes what it
 * holds, moved to where its placement stands.
 */

type GizmoMode = 'translate' | 'rotate' | 'scale';

/** Snapping steps: the grid's cells, and a twelfth of a half turn. */
const SNAP_DISTANCE = 0.05;
const SNAP_ANGLE = Math.PI / 12;

/** How small one drag of the scale gizmo can make a view: a hundredth of what it was. */
const MIN_SCALE_STEP = 0.01;

/** A view is measured every this many frames while it is being fitted. */
const MEASURE_EVERY = 15;
/** Measurements in a row that agree before a view counts as loaded: its parts arrive one by one. */
const STEADY_SAMPLES = 3;

/** How many 3D views are asked for: past the server's default page. */
const VIEW_LIMIT = 500;

/** The edge of the box that stands in for a placement with nothing to show, in meters. */
const MARKER_SIZE = 0.15;

const viewName = (view: {name?: string | null; blok: {name: string}}): string => view.name || view.blok.name;

type SceneView = {id: string; name?: string | null; blok: {name: string; context: ComponentContext}};

/** The view, when it is one this room can show: a blok of the scene context. */
const sceneView = (view: SceneView | null | undefined): SceneView | null =>
  view?.blok.context === ComponentContext.Scene ? view : null;

/**
 * Something standing in the room: an app's placement (its agent, shown by one
 * of its 3D views), or a 3D blok placed on its own, with no agent. Both sit
 * where a 4x4 affine puts them; `key` tells them apart across the two kinds.
 */
type Standing = {
  key: string;
  name: string;
  affineMatrix: unknown;
  /** The 3D view it shows, when it has one this room can show. */
  view: SceneView | null;
  /** Whether it has a view at all, if not one this room can show. */
  hasView: boolean;
} & ({kind: 'agent'; placement: SpacePlacementFragment} | {kind: 'blok'; placement: SpaceBlokPlacementFragment});

const standingsOf = (space: SpaceFragment): Standing[] => [
  ...space.placements.map(
    (placement): Standing => ({
      key: `agent:${placement.id}`,
      kind: 'agent',
      placement,
      name: placement.name,
      affineMatrix: placement.affineMatrix,
      view: sceneView(placement.blok),
      hasView: Boolean(placement.blok),
    }),
  ),
  ...space.blokPlacements.map(
    (placement): Standing => ({
      key: `blok:${placement.id}`,
      kind: 'blok',
      placement,
      name: placement.name || viewName(placement.blok),
      affineMatrix: placement.affineMatrix,
      view: sceneView(placement.blok),
      hasView: true,
    }),
  ),
];

const Marker = ({title, detail}: {title: string; detail: string}) => {
  const mesh = React.useRef<THREE.Mesh>(null);
  const anchor = React.useCallback(() => mesh.current, []);
  const content = React.useMemo(
    () => (
      <>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </>
    ),
    [detail, title],
  );
  useSceneOverlay({visible: true, anchor, content, mode: 'popout'});
  return (
    <mesh ref={mesh} position={[0, MARKER_SIZE / 2, 0]}>
      <boxGeometry args={[MARKER_SIZE, MARKER_SIZE, MARKER_SIZE]} />
      <meshBasicMaterial color="#8b8b8b" wireframe />
    </mesh>
  );
};

const PlacedView = ({id, name}: {id: string; name: string}) => {
  const {data, error} = useMaterializedBlokQuery({variables: {id}});
  useSceneNotice(error ? `${name} could not be loaded` : null, error?.message);
  if (!data?.materializedBlok) return null;
  return (
    <MaterializedBlokRenderer embedded surfaceId={`space-${id}`} materializedBlok={data.materializedBlok} />
  );
};

/** The largest extent of what a placement shows, in meters as it was made: its own scale divided out. */
const naturalExtent = (group: THREE.Object3D): number | null => {
  group.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) return null;
  const size = box.getSize(new THREE.Vector3());
  const scale = group.getWorldScale(new THREE.Vector3());
  const extent =
    Math.max(size.x, size.y, size.z) / Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z));
  return extent > 0 && Number.isFinite(extent) ? extent : null;
};

/**
 * Measures a view that was just placed once it has loaded, and hands over its
 * size. Its model arrives after the placement does, so it waits for the size
 * to hold still rather than measuring the first part that shows.
 */
const AutoFit = ({group, onMeasured}: {group: THREE.Group; onMeasured: (extent: number) => void}) => {
  const state = React.useRef({frames: 0, last: null as number | null, steady: 0, done: false});
  useFrame(() => {
    const current = state.current;
    current.frames += 1;
    if (current.done || current.frames % MEASURE_EVERY !== 0) return;
    const extent = naturalExtent(group);
    const holds = extent !== null && current.last !== null && Math.abs(extent - current.last) <= current.last * 0.01;
    current.steady = holds ? current.steady + 1 : 0;
    current.last = extent;
    if (extent !== null && current.steady >= STEADY_SAMPLES) {
      current.done = true;
      onMeasured(extent);
    }
  });
  return null;
};

const SelectionBox = ({object}: {object: THREE.Object3D}) => {
  const helper = React.useMemo(() => new THREE.BoxHelper(object, 0x38bdf8), [object]);
  useFrame(() => helper.update());
  React.useEffect(() => () => helper.dispose(), [helper]);
  return <primitive object={helper} />;
};

type Editing = {
  selected: string | null;
  mode: GizmoMode;
  snap: boolean;
  onSelect: (key: string | null) => void;
  onMove: (item: Standing, affine: Affine) => void;
  /** The keys of what was just added, to be fitted once its view has loaded. */
  fitting: ReadonlySet<string>;
  onMeasured: (item: Standing, extent: number) => void;
  /** Every standing thing's group by key, for the Fit button to measure. */
  groups: React.RefObject<Map<string, THREE.Group>>;
  /** Set while the gizmo is held, so letting go of it is not read as a click beside everything. */
  gizmoHeld: React.RefObject<boolean>;
};

const Placed = ({item, editing}: {item: Standing; editing?: Editing}) => {
  const [group, setGroup] = React.useState<THREE.Group | null>(null);
  const affine = item.affineMatrix;
  React.useLayoutEffect(() => {
    if (group) toMatrix4(affine).decompose(group.position, group.quaternion, group.scale);
  }, [affine, group]);

  const view = item.view;
  const selected = editing?.selected === item.key;
  const turning = editing?.mode === 'rotate';
  // The scale the view had when the scale gizmo was picked up.
  const scaleStart = React.useRef(new THREE.Vector3(1, 1, 1));

  const groups = editing?.groups;
  React.useEffect(() => {
    if (!groups || !group) return undefined;
    groups.current.set(item.key, group);
    return () => {
      groups.current.delete(item.key);
    };
  }, [group, groups, item.key]);

  return (
    <>
      <group
        ref={setGroup}
        onClick={
          editing
            ? event => {
                event.stopPropagation();
                editing.onSelect(item.key);
              }
            : undefined
        }
      >
        {view ? (
          // Its models stand for its agent: an overlay anchored at the agent binds to them.
          <SceneOwnerProvider value={item.kind === 'agent' ? item.placement.agent.id : null}>
            <PlacedView id={view.id} name={viewName(view)} />
          </SceneOwnerProvider>
        ) : (
          <Marker title={item.name} detail={item.hasView ? 'Its view is a panel, not a 3D view' : 'No 3D view'} />
        )}
      </group>
      {editing && view && group && editing.fitting.has(item.key) ? (
        <AutoFit group={group} onMeasured={extent => editing.onMeasured(item, extent)} />
      ) : null}
      {editing && selected && group ? (
        <>
          <SelectionBox object={group} />
          <TransformControls
            object={group}
            mode={editing.mode}
            size={0.8}
            // A device stands on the floor: it is turned around the vertical only.
            showX={!turning}
            showZ={!turning}
            translationSnap={editing.snap ? SNAP_DISTANCE : null}
            rotationSnap={editing.snap ? SNAP_ANGLE : null}
            onMouseDown={() => {
              editing.gizmoHeld.current = true;
              scaleStart.current.copy(group.scale);
            }}
            // A view is scaled evenly: whichever handle is dragged, every axis follows it.
            onObjectChange={() => {
              if (editing.mode !== 'scale') return;
              const start = scaleStart.current;
              const ratio = [group.scale.x / start.x, group.scale.y / start.y, group.scale.z / start.z].reduce(
                (most, next) => (Math.abs(next - 1) > Math.abs(most - 1) ? next : most),
              );
              group.scale.copy(start).multiplyScalar(Math.max(ratio, MIN_SCALE_STEP));
            }}
            onMouseUp={() => {
              window.setTimeout(() => {
                editing.gizmoHeld.current = false;
              }, 0);
              group.updateMatrix();
              // A click on the gizmo that moved nothing has nothing to save.
              if (!group.matrix.equals(toMatrix4(affine))) editing.onMove(item, fromMatrix4(group.matrix));
            }}
          />
        </>
      ) : null}
    </>
  );
};

const Hint = ({children}: {children: React.ReactNode}) => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
    <div className="max-w-sm rounded-lg bg-background/80 px-4 py-3 text-center text-sm text-muted-foreground">
      {children}
    </div>
  </div>
);

/** Where each agent stands in the space, for an overlay's `At` and `Route`. */
const useSpaceHost = (placements: readonly SpacePlacementFragment[]): BlokSpaceHost =>
  React.useMemo(() => {
    const byAgent = new Map(placements.map(placement => [placement.agent.id, placement.affineMatrix] as const));
    return {placementOf: agentId => byAgent.get(agentId) ?? null};
  }, [placements]);

/**
 * The run layer: the overlay of the action a run belongs to, drawn over the
 * agents placed here, in the room's own coordinates. The run is provided
 * around the whole surface, so a card it opens (the run's ask) has it too.
 */
const RunLayer = ({spaceId, run}: {spaceId: string; run: SpaceRun}) => (
  <ActionBlokRenderer
    embedded
    surfaceId={`space-${spaceId}-run-${run.run.task?.id ?? 'preview'}`}
    actionBlok={run.actionBlok}
    run={run.run}
  />
);

const Room = ({
  items,
  placements,
  spaceId,
  run,
  editing,
  inert = false,
  overlay,
}: {
  items: readonly Standing[];
  placements: readonly SpacePlacementFragment[];
  spaceId: string;
  /** A run whose action's overlay is drawn over the room. */
  run?: SpaceRun | null;
  editing?: Editing;
  /** Whether the devices ignore the pointer although nothing is being arranged. */
  inert?: boolean;
  overlay?: React.ReactNode;
}) => {
  const space = useSpaceHost(placements);
  const surface = (
    <BlokSpaceHostProvider value={space}>
      <SceneSurface
        className="relative h-full w-full overflow-hidden bg-muted/20"
        onPointerMissed={() => {
          if (editing && !editing.gizmoHeld.current) editing.onSelect(null);
        }}
        overlay={overlay}
      >
        <BlokSceneInertProvider value={Boolean(editing) || inert}>
          {items.map(item => (
            <Placed key={item.key} item={item} editing={editing} />
          ))}
        </BlokSceneInertProvider>
        {run ? <RunLayer spaceId={spaceId} run={run} /> : null}
      </SceneSurface>
    </BlokSpaceHostProvider>
  );
  return run ? <RunHost run={run.run}>{surface}</RunHost> : surface;
};

/**
 * The room as it is: every 3D view where it was placed, live unless a travel
 * provider around it says otherwise.
 *
 * `overlay` is the host's own HTML over the scene. `readOnly` is a room to
 * look at: the devices ignore the pointer, so nothing in it can be run.
 * `run` draws a run of an action into the room (its overlay blok, bound to the
 * run's agents), or previews one from a dry run.
 */
export const SpaceScene = ({
  space,
  overlay,
  readOnly = false,
  run,
}: {
  space: SpaceFragment;
  overlay?: React.ReactNode;
  readOnly?: boolean;
  run?: SpaceRun | null;
}) => {
  const items = React.useMemo(() => standingsOf(space), [space]);
  return (
    <RekuestSceneHost>
      <Room
        items={items}
        placements={space.placements}
        spaceId={space.id}
        run={run}
        inert={readOnly}
        overlay={
          <>
            {items.length === 0 ? (
              <Hint>
                Nothing stands in this space yet. Press <b>Edit</b> to add 3D views.
              </Hint>
            ) : null}
            {overlay}
          </>
        }
      />
    </RekuestSceneHost>
  );
};

type Agent = SpacePlacementFragment['agent'];

/**
 * A 3D view that can be added, and what a click on it does. A view of an app
 * places that app (once per space); a view connected to no app is placed as
 * a blok of its own, as often as wanted.
 */
type ViewOption = {
  view: ListMaterializedBlokFragment;
  /** The app the view shows, when it is connected to one. */
  agent: Agent | null;
  /** The placement of that app in this space, when it has one. */
  placement: SpacePlacementFragment | null;
  action: 'add' | 'select' | 'swap' | 'place';
};

const optionsFor = (
  views: readonly ListMaterializedBlokFragment[],
  placements: readonly SpacePlacementFragment[],
): ViewOption[] =>
  views
    .filter(view => view.blok.context === ComponentContext.Scene)
    .map(view => {
      const mapping = view.agentMappings.find(candidate => candidate.key === 'self') ?? view.agentMappings[0];
      const agent = mapping?.agent ?? null;
      const placement = agent ? (placements.find(candidate => candidate.agent.id === agent.id) ?? null) : null;
      const action = !agent ? 'place' : !placement ? 'add' : placement.blok?.id === view.id ? 'select' : 'swap';
      return {view, agent, placement, action};
    });

const ACTION_ICON = {add: Plus, select: Check, swap: Replace, place: Plus} as const;

const optionHint = (option: ViewOption): string => {
  switch (option.action) {
    case 'add':
      return 'Place it in this space';
    case 'select':
      return 'Already in this space: select it';
    case 'swap':
      return `${option.agent?.name} already stands in this space: show it with this view instead`;
    case 'place':
      return 'Place it in this space on its own: it belongs to no app, so it can stand here more than once';
  }
};

const OnlineDot = ({online}: {online: boolean}) => (
  <span className={cn('size-1.5 shrink-0 rounded-full', online ? 'bg-green-500' : 'bg-muted-foreground/40')} />
);

const ViewRow = ({option, disabled, onPick}: {option: ViewOption; disabled: boolean; onPick: () => void}) => {
  const Icon = ACTION_ICON[option.action];
  return (
    <button
      type="button"
      title={optionHint(option)}
      disabled={disabled}
      onClick={onPick}
      className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{viewName(option.view)}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {option.agent ? (
            <>
              <OnlineDot online={option.agent.connected} />
              <span className="truncate">{option.agent.name}</span>
            </>
          ) : (
            <>
              <Box className="size-3 shrink-0" />
              <span className="truncate">A blok of its own</span>
            </>
          )}
        </div>
      </div>
      <Icon
        className={cn(
          'size-4 shrink-0 text-muted-foreground',
          option.action === 'select' ? '' : 'group-hover:text-foreground',
        )}
      />
    </button>
  );
};

const POSE_FIELDS: Array<{key: keyof Pose; label: string; step: number; hint: string}> = [
  {key: 'x', label: 'X', step: 0.05, hint: 'Along the floor, in meters'},
  {key: 'y', label: 'Y', step: 0.05, hint: 'Height above the floor, in meters'},
  {key: 'z', label: 'Z', step: 0.05, hint: 'Along the floor, in meters'},
  {key: 'turn', label: 'Turn', step: 15, hint: 'Turn around the vertical, in degrees'},
];

const PoseField = (props: {
  label: string;
  hint: string;
  step: number;
  value: number;
  onCommit: (value: number) => void;
}) => {
  // What is being typed, until it is committed; the stored value otherwise.
  const [draft, setDraft] = React.useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const next = Number(draft);
    setDraft(null);
    if (draft.trim() !== '' && Number.isFinite(next) && next !== props.value) props.onCommit(next);
  };
  return (
    <label className="flex min-w-0 flex-col gap-0.5 text-[0.625rem] text-muted-foreground" title={props.hint}>
      {props.label}
      <Input
        type="number"
        step={props.step}
        className="h-6 px-1.5 text-xs"
        value={draft ?? String(props.value)}
        onChange={event => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') setDraft(null);
        }}
      />
    </label>
  );
};

const PlacementRow = ({
  item,
  selected,
  onSelect,
  onMove,
  onFit,
  onRemove,
}: {
  item: Standing;
  selected: boolean;
  onSelect: () => void;
  onMove: (affine: Affine) => void;
  onFit: () => void;
  onRemove: () => void;
}) => {
  const view = item.view;
  const pose = readPose(item.affineMatrix);
  const scale = readScale(item.affineMatrix);
  return (
    <div className={cn('rounded-md', selected ? 'bg-muted' : 'hover:bg-muted/60')}>
      <button type="button" onClick={onSelect} className="flex w-full items-center gap-2 px-2 py-1.5 text-left">
        {item.kind === 'agent' ? (
          <OnlineDot online={item.placement.agent.connected} />
        ) : (
          <Box className="size-3 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{item.kind === 'agent' ? item.placement.agent.name : item.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {item.kind === 'blok' ? 'A blok of its own' : view ? viewName(view) : 'No 3D view'}
          </div>
        </div>
      </button>
      {selected ? (
        <div className="flex flex-col gap-2 px-2 pb-2">
          <div className="grid grid-cols-4 gap-1.5">
            {POSE_FIELDS.map(field => (
              <PoseField
                key={field.key}
                label={field.label}
                hint={field.hint}
                step={field.step}
                value={pose[field.key]}
                onCommit={value => onMove(writePose(item.affineMatrix, {...pose, [field.key]: value}))}
              />
            ))}
          </div>
          <div className="flex items-end gap-1.5">
            <div className="w-20">
              <PoseField
                label="Scale"
                hint="Size against the model as it was made: 1 is as made, 0.001 shows a model drawn in millimeters in meters"
                step={0.1}
                value={scale}
                onCommit={value => {
                  if (value > 0) onMove(writeScale(item.affineMatrix, value));
                }}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              disabled={!view}
              onClick={onFit}
              title="Scale the view to the size of a device on a bench"
            >
              <Scan />
              Fit
            </Button>
            <Button variant="outline" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={onRemove}>
              <Trash2 />
              Remove
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const PanelHeading = ({children}: {children: React.ReactNode}) => (
  <div className="px-2 pb-1 text-[0.625rem] font-medium uppercase tracking-widest text-muted-foreground">
    {children}
  </div>
);

/** The room with its handles: add 3D views from the list, pick one up and move it. */
export const SpaceEditor = ({space}: {space: SpaceFragment}) => {
  const placements = space.placements;
  const items = React.useMemo(() => standingsOf(space), [space]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<GizmoMode>('translate');
  const [snap, setSnap] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [fitting, setFitting] = React.useState<ReadonlySet<string>>(() => new Set());
  const gizmoHeld = React.useRef(false);
  const groups = React.useRef(new Map<string, THREE.Group>());

  // Only the scene views: the server narrows by the blok's context.
  const {data, loading, error} = useListMaterializedBloksQuery({
    variables: {filters: {contexts: [ComponentContext.Scene]}, pagination: {limit: VIEW_LIMIT}},
  });
  const options = React.useMemo(
    () => optionsFor(data?.materializedBloks ?? [], placements),
    [data, placements],
  );
  const needle = search.trim().toLowerCase();
  const shown = needle
    ? options.filter(option =>
        [viewName(option.view), option.view.blok.name, option.agent?.name ?? ''].some(text =>
          text.toLowerCase().includes(needle),
        ),
      )
    : options;

  const [updatePlacement] = useUpdatePlacementMutation();
  const [createPlacement, {loading: adding}] = useCreatePlacementMutation({
    refetchQueries: [SpaceDocument],
    awaitRefetchQueries: true,
  });
  const [deletePlacement] = useDeletePlacementMutation({refetchQueries: [SpaceDocument]});
  const [updateSpacePlacement] = useUpdateSpacePlacementMutation();
  const [createSpacePlacement, {loading: placing}] = useCreateSpacePlacementMutation({
    refetchQueries: [SpaceDocument],
    awaitRefetchQueries: true,
  });
  const [deleteSpacePlacement] = useDeleteSpacePlacementMutation({refetchQueries: [SpaceDocument]});

  const move = React.useCallback(
    (item: Standing, affineMatrix: Affine) => {
      // The view stays where it was let go while the server is told.
      const moved =
        item.kind === 'agent'
          ? updatePlacement({
              variables: {input: {id: item.placement.id, affineMatrix}},
              optimisticResponse: {updatePlacement: {...item.placement, affineMatrix}},
            })
          : updateSpacePlacement({
              variables: {input: {id: item.placement.id, affineMatrix}},
              optimisticResponse: {updateSpacePlacement: {...item.placement, affineMatrix}},
            });
      moved.catch(reportErrorAs(`Couldn't move ${item.name}`));
    },
    [updatePlacement, updateSpacePlacement],
  );

  // What was just placed is selected, and fitted once its view has loaded.
  const fitNew = React.useCallback((key: string | null) => {
    setSelected(key);
    if (key) setFitting(current => new Set(current).add(key));
  }, []);

  const pick = React.useCallback(
    (option: ViewOption) => {
      if (option.action === 'select') {
        setSelected(option.placement ? `agent:${option.placement.id}` : null);
        return;
      }
      const free = freeSpot(items.map(item => item.affineMatrix));
      if (option.action === 'place' || !option.agent) {
        createSpacePlacement({
          variables: {input: {space: space.id, blok: option.view.id, affineMatrix: free}},
        })
          .then(result => {
            const id = result.data?.createSpacePlacement.id;
            fitNew(id ? `blok:${id}` : null);
          })
          .catch(reportErrorAs(`Couldn't place ${viewName(option.view)}`));
        return;
      }
      createPlacement({
        variables: {
          input: {
            space: space.id,
            agent: option.agent.id,
            materializedBlok: option.view.id,
            // An app stands in a space once: its new view takes the spot of the
            // old one, at the size it was made, as a new view is fitted anew.
            affineMatrix: option.placement ? writeScale(option.placement.affineMatrix, 1) : free,
          },
        },
      })
        .then(result => {
          const id = result.data?.createPlacement.id;
          fitNew(id ? `agent:${id}` : null);
        })
        .catch(reportErrorAs(`Couldn't place ${viewName(option.view)}`));
    },
    [createPlacement, createSpacePlacement, fitNew, items, space.id],
  );

  // A view that was just placed and is ten times off the size of a device is fitted.
  const measured = React.useCallback(
    (item: Standing, extent: number) => {
      setFitting(current => {
        const next = new Set(current);
        next.delete(item.key);
        return next;
      });
      const scale = autoFitScale(extent);
      if (scale !== null) move(item, writeScale(item.affineMatrix, scale));
    },
    [move],
  );

  const fit = React.useCallback(
    (item: Standing) => {
      const group = groups.current.get(item.key);
      const extent = group ? naturalExtent(group) : null;
      if (extent === null) {
        toast.info('This view has nothing to measure yet.');
        return;
      }
      move(item, writeScale(item.affineMatrix, fitScale(extent)));
    },
    [move],
  );

  const remove = React.useCallback(
    (item: Standing) => {
      setSelected(null);
      const removed =
        item.kind === 'agent'
          ? deletePlacement({variables: {id: item.placement.id}})
          : deleteSpacePlacement({variables: {id: item.placement.id}});
      removed.catch(reportErrorAs(`Couldn't remove ${item.name}`));
    },
    [deletePlacement, deleteSpacePlacement],
  );

  // An agent card dropped on the room adds that app's 3D view, its default one first.
  const [{isOver}, dropRef] = useSmartDrop(structures => {
    const agent = structures.find(structure => structure.identifier === '@rekuest/agent');
    if (!agent) return;
    const candidates = options.filter(option => option.agent?.id === agent.id);
    const option = candidates.find(candidate => candidate.view.isDefault) ?? candidates[0];
    if (option) pick(option);
    else toast.info('This app has no 3D view to place.');
  });

  const editing = React.useMemo<Editing>(
    () => ({
      selected,
      mode,
      snap,
      onSelect: setSelected,
      onMove: move,
      fitting,
      onMeasured: measured,
      groups,
      gizmoHeld,
    }),
    [fitting, measured, mode, move, selected, snap],
  );

  return (
    <RekuestSceneHost>
      <div className="flex h-full min-h-0">
        <div className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r p-2">
          <div>
            <PanelHeading>Add a 3D view</PanelHeading>
            <Input
              className="mb-1 h-7"
              placeholder="Search 3D views"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
            {shown.map(option => (
              <ViewRow key={option.view.id} option={option} disabled={adding || placing} onPick={() => pick(option)} />
            ))}
            {shown.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                {error
                  ? `The 3D views could not be loaded. ${describeError(error).message}`
                  : loading
                    ? 'Loading…'
                    : needle
                      ? 'No 3D view matches.'
                      : 'No 3D views yet. An app adds one by declaring a blok for the scene context.'}
              </div>
            ) : null}
          </div>
          <div>
            <PanelHeading>In this space</PanelHeading>
            {items.map(item => (
              <PlacementRow
                key={item.key}
                item={item}
                selected={selected === item.key}
                onSelect={() => setSelected(selected === item.key ? null : item.key)}
                onMove={affine => move(item, affine)}
                onFit={() => fit(item)}
                onRemove={() => remove(item)}
              />
            ))}
            {items.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">Nothing yet.</div>
            ) : null}
          </div>
        </div>

        <div ref={dropRef} className={cn('relative min-w-0 flex-1', isOver && 'ring-2 ring-inset ring-primary')}>
          <Room
            items={items}
            placements={placements}
            spaceId={space.id}
            editing={editing}
            overlay={
              <>
                {items.length === 0 ? (
                  <Hint>
                    Click a 3D view in <b>Add a 3D view</b> to place it here.
                  </Hint>
                ) : null}
                <div
                  className="pointer-events-auto absolute left-2 top-2 z-30 flex items-center gap-1 rounded-lg border bg-background/90 p-1"
                  onPointerDown={event => event.stopPropagation()}
                >
                  <ToggleGroup
                    type="single"
                    size="sm"
                    value={mode}
                    onValueChange={value => value && setMode(value as GizmoMode)}
                  >
                    <ToggleGroupItem value="translate" title="Drag the arrows to move the selected view">
                      <Move3d />
                      Move
                    </ToggleGroupItem>
                    <ToggleGroupItem value="rotate" title="Drag the ring to turn the selected view">
                      <Rotate3d />
                      Turn
                    </ToggleGroupItem>
                    <ToggleGroupItem value="scale" title="Drag a handle to scale the selected view, evenly">
                      <Scale3d />
                      Scale
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <Toggle
                    size="sm"
                    pressed={snap}
                    onPressedChange={setSnap}
                    title="Move in steps of 5 cm and turn in steps of 15°"
                  >
                    <Magnet />
                    Snap
                  </Toggle>
                </div>
              </>
            }
          />
        </div>
      </div>
    </RekuestSceneHost>
  );
};
