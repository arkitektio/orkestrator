import * as React from 'react';
import * as THREE from 'three';
import {TransformControls} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {Check, Magnet, Move3d, Plus, Replace, Rotate3d, Trash2} from 'lucide-react';
import {
  BlokSceneInertProvider,
  SceneSurface,
  useSceneNotice,
  useSceneOverlay,
} from '@/core/blok/renderer/bloks/scene';
import {formatApolloError} from '@/core/connection/graphql/errorHandler';
import {toast} from '@/core/notify';
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
  useDeletePlacementMutation,
  useListMaterializedBloksQuery,
  useMaterializedBlokQuery,
  useUpdatePlacementMutation,
  type ListMaterializedBlokFragment,
  type SpaceFragment,
  type SpacePlacementFragment,
} from '@/rekuest/api/graphql';
import MaterializedBlokRenderer from '@/rekuest/components/MaterializedBlokRenderer';
import {RekuestSceneHost} from '@/rekuest/scene/RekuestSceneHost';
import {freeSpot, fromMatrix4, readPose, toMatrix4, writePose, type Affine, type Pose} from './affine';

/**
 * A space as one 3D room.
 *
 * What stands in it are 3D views: materialized bloks of the scene context.
 * Such a blok's root is always a `Scene`; here every one of them is rendered
 * into the room's single scene, where that root only contributes what it
 * holds, moved to where its placement stands.
 */

type GizmoMode = 'translate' | 'rotate';

/** Snapping steps: the grid's cells, and a twelfth of a half turn. */
const SNAP_DISTANCE = 0.05;
const SNAP_ANGLE = Math.PI / 12;

/** How many materialized bloks are asked for, to pick the 3D views from: past the server's default page. */
const VIEW_LIMIT = 500;

/** The edge of the box that stands in for a placement with nothing to show, in meters. */
const MARKER_SIZE = 0.15;

const viewName = (view: {name?: string | null; blok: {name: string}}): string => view.name || view.blok.name;

/** The 3D view of a placement, when it has one this room can show. */
const sceneViewOf = (placement: SpacePlacementFragment) =>
  placement.blok?.blok.context === ComponentContext.Scene ? placement.blok : null;

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
  onSelect: (id: string | null) => void;
  onMove: (placement: SpacePlacementFragment, affine: Affine) => void;
  /** Set while the gizmo is held, so letting go of it is not read as a click beside everything. */
  gizmoHeld: React.RefObject<boolean>;
};

const Placed = ({placement, editing}: {placement: SpacePlacementFragment; editing?: Editing}) => {
  const [group, setGroup] = React.useState<THREE.Group | null>(null);
  const affine = placement.affineMatrix as unknown;
  React.useLayoutEffect(() => {
    if (group) toMatrix4(affine).decompose(group.position, group.quaternion, group.scale);
  }, [affine, group]);

  const view = sceneViewOf(placement);
  const selected = editing?.selected === placement.id;
  const turning = editing?.mode === 'rotate';

  return (
    <>
      <group
        ref={setGroup}
        onClick={
          editing
            ? event => {
                event.stopPropagation();
                editing.onSelect(placement.id);
              }
            : undefined
        }
      >
        {view ? (
          <PlacedView id={view.id} name={viewName(view)} />
        ) : (
          <Marker title={placement.name} detail={placement.blok ? 'Its view is a panel, not a 3D view' : 'No 3D view'} />
        )}
      </group>
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
            }}
            onMouseUp={() => {
              window.setTimeout(() => {
                editing.gizmoHeld.current = false;
              }, 0);
              group.updateMatrix();
              // A click on the gizmo that moved nothing has nothing to save.
              if (!group.matrix.equals(toMatrix4(affine))) editing.onMove(placement, fromMatrix4(group.matrix));
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

const Room = ({
  placements,
  editing,
  overlay,
}: {
  placements: readonly SpacePlacementFragment[];
  editing?: Editing;
  overlay?: React.ReactNode;
}) => (
  <SceneSurface
    className="relative h-full w-full overflow-hidden bg-muted/20"
    onPointerMissed={() => {
      if (editing && !editing.gizmoHeld.current) editing.onSelect(null);
    }}
    overlay={overlay}
  >
    <BlokSceneInertProvider value={Boolean(editing)}>
      {placements.map(placement => (
        <Placed key={placement.id} placement={placement} editing={editing} />
      ))}
    </BlokSceneInertProvider>
  </SceneSurface>
);

/** The room as it is: every 3D view live, where it was placed. */
export const SpaceScene = ({space}: {space: SpaceFragment}) => (
  <RekuestSceneHost>
    <Room
      placements={space.placements}
      overlay={
        space.placements.length === 0 ? (
          <Hint>
            Nothing stands in this space yet. Press <b>Edit</b> to add 3D views.
          </Hint>
        ) : null
      }
    />
  </RekuestSceneHost>
);

type Agent = SpacePlacementFragment['agent'];

/** A 3D view that can be added, and what a click on it does. */
type ViewOption = {
  view: ListMaterializedBlokFragment;
  /** The app the view shows: a placement belongs to one. */
  agent: Agent | null;
  /** The placement of that app in this space, when it has one. */
  placement: SpacePlacementFragment | null;
  action: 'add' | 'select' | 'swap' | 'none';
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
      const action = !agent ? 'none' : !placement ? 'add' : placement.blok?.id === view.id ? 'select' : 'swap';
      return {view, agent, placement, action};
    });

const ACTION_ICON = {add: Plus, select: Check, swap: Replace, none: null} as const;

const optionHint = (option: ViewOption): string => {
  switch (option.action) {
    case 'add':
      return 'Place it in this space';
    case 'select':
      return 'Already in this space: select it';
    case 'swap':
      return `${option.agent?.name} already stands in this space: show it with this view instead`;
    default:
      return 'This view is not connected to an app, so it cannot be placed';
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
      disabled={disabled || option.action === 'none'}
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
            <span className="truncate">Not connected to an app</span>
          )}
        </div>
      </div>
      {Icon ? (
        <Icon
          className={cn(
            'size-4 shrink-0 text-muted-foreground',
            option.action === 'select' ? '' : 'group-hover:text-foreground',
          )}
        />
      ) : null}
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
  placement,
  selected,
  onSelect,
  onMove,
  onRemove,
}: {
  placement: SpacePlacementFragment;
  selected: boolean;
  onSelect: () => void;
  onMove: (affine: Affine) => void;
  onRemove: () => void;
}) => {
  const view = sceneViewOf(placement);
  const pose = readPose(placement.affineMatrix);
  return (
    <div className={cn('rounded-md', selected ? 'bg-muted' : 'hover:bg-muted/60')}>
      <button type="button" onClick={onSelect} className="flex w-full items-center gap-2 px-2 py-1.5 text-left">
        <OnlineDot online={placement.agent.connected} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{placement.agent.name}</div>
          <div className="truncate text-xs text-muted-foreground">{view ? viewName(view) : 'No 3D view'}</div>
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
                onCommit={value => onMove(writePose(placement.affineMatrix, {...pose, [field.key]: value}))}
              />
            ))}
          </div>
          <Button variant="outline" size="sm" className="self-start" onClick={onRemove}>
            <Trash2 />
            Remove
          </Button>
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

const report = (what: string) => (error: unknown) => toast.error(`${what}: ${formatApolloError(error, 'rekuest')}`);

/** The room with its handles: add 3D views from the list, pick one up and move it. */
export const SpaceEditor = ({space}: {space: SpaceFragment}) => {
  const placements = space.placements;
  const [selected, setSelected] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<GizmoMode>('translate');
  const [snap, setSnap] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const gizmoHeld = React.useRef(false);

  // Every view is asked for and the scene ones picked out here: the list has no filter for a blok's context.
  const {data, loading, error} = useListMaterializedBloksQuery({variables: {pagination: {limit: VIEW_LIMIT}}});
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

  const move = React.useCallback(
    (placement: SpacePlacementFragment, affineMatrix: Affine) => {
      updatePlacement({
        variables: {input: {id: placement.id, affineMatrix}},
        // The view stays where it was let go while the server is told.
        optimisticResponse: {updatePlacement: {...placement, affineMatrix}},
      }).catch(report('The placement could not be moved'));
    },
    [updatePlacement],
  );

  const pick = React.useCallback(
    (option: ViewOption) => {
      if (!option.agent || option.action === 'none') return;
      if (option.action === 'select') {
        setSelected(option.placement?.id ?? null);
        return;
      }
      createPlacement({
        variables: {
          input: {
            space: space.id,
            agent: option.agent.id,
            materializedBlok: option.view.id,
            // An app stands in a space once: its new view takes the spot of the old one.
            affineMatrix:
              (option.placement?.affineMatrix as Affine | null | undefined) ??
              freeSpot(placements.map(placement => placement.affineMatrix)),
          },
        },
      })
        .then(result => setSelected(result.data?.createPlacement.id ?? null))
        .catch(report(`${viewName(option.view)} could not be placed`));
    },
    [createPlacement, placements, space.id],
  );

  const remove = React.useCallback(
    (placement: SpacePlacementFragment) => {
      setSelected(null);
      deletePlacement({variables: {id: placement.id}}).catch(report('The placement could not be removed'));
    },
    [deletePlacement],
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
    () => ({selected, mode, snap, onSelect: setSelected, onMove: move, gizmoHeld}),
    [mode, move, selected, snap],
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
              <ViewRow key={option.view.id} option={option} disabled={adding} onPick={() => pick(option)} />
            ))}
            {shown.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                {error
                  ? `The 3D views could not be loaded: ${formatApolloError(error, 'rekuest')}`
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
            {placements.map(placement => (
              <PlacementRow
                key={placement.id}
                placement={placement}
                selected={selected === placement.id}
                onSelect={() => setSelected(selected === placement.id ? null : placement.id)}
                onMove={affine => move(placement, affine)}
                onRemove={() => remove(placement)}
              />
            ))}
            {placements.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">Nothing yet.</div>
            ) : null}
          </div>
        </div>

        <div ref={dropRef} className={cn('relative min-w-0 flex-1', isOver && 'ring-2 ring-inset ring-primary')}>
          <Room
            placements={placements}
            editing={editing}
            overlay={
              <>
                {placements.length === 0 ? (
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
