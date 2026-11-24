import * as React from 'react';
import * as THREE from 'three';
import {TransformControls} from '@react-three/drei';
import {Move3d} from 'lucide-react';
import {placedSchema, routeSchema, spaceSchema, type runContracts} from '@arkitektio/bsx/catalogs/parts/run';
import {fromMatrix4, toMatrix4} from '@/core/model/affine';
import {DropdownMenuItem} from '@/core/ui/dropdown-menu';
import {useBlok, useValue, type BlokRender, type BlokRenderArgs} from '@arkitektio/bsx/runtime';
import {ModelProvider, SceneOwnerProvider, useOwnedModel, useSceneNotice, type ModelContextValue} from '@arkitektio/bsx/renderer/bloks/scene/context';
import {FALLBACK_SCENE_RGB, useThemeColour} from '@arkitektio/bsx/renderer/bloks/scene/colour';
import {BlokSceneInertProvider, useBlokSceneEmbedded, useBlokSceneStill} from '@arkitektio/bsx/renderer/bloks/scene/host';
import {SceneFrame} from './Scene';
import {useBlokRunHost, useBlokSpaceHost, type BlokPose, type BlokRoom, type BlokRunAgent} from '@arkitektio/bsx/renderer/bloks/run/host';
import {progressFraction, routePoints, splitRoute, throughKeys} from '@arkitektio/bsx/renderer/bloks/run/math';

type Contracts = typeof runContracts;

/**
 * The app's own (`./index.ts`), with `Scene.tsx`: the three share the room's
 * context, so they are drawn together.
 *
 * The components that place an action's dependencies in 3D (the scene family). `Space`
 * is a scene whose layout is a shared room, `Placed` draws the agent a
 * dependency is bound to with that agent's own scene blok where the room keeps
 * it, and `Route` draws a line through several.
 */

const Children = ({component, buildChild}: Pick<BlokRenderArgs, 'component' | 'buildChild'>) => (
  <>
    {(component.children ?? []).map(child => (
      <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
    ))}
  </>
);

/* -------------------------------------------------------------------------- */
/* The room                                                                   */
/* -------------------------------------------------------------------------- */

/** What a `Space` tells what it holds: the room, whether it is being arranged, and where each device stands now. */
type RoomContextValue = {
  room: BlokRoom;
  /** Whether the viewer is arranging the room: devices then move by gizmo, and clicks do not reach them. */
  arranging: boolean;
  /** Where each placed agent stands now (its kept pose, else its `Placed`'s): what a `Route` runs through. */
  standing: ReadonlyMap<string, BlokPose>;
  stand: (agentId: string, pose: BlokPose | null) => void;
};

const NO_ROOM_CONTEXT: RoomContextValue = {
  room: {poseOf: () => null},
  arranging: false,
  standing: new Map(),
  stand: () => undefined,
};

const RoomContext = React.createContext<RoomContextValue>(NO_ROOM_CONTEXT);

const useRoom = (): RoomContextValue => React.useContext(RoomContext);

const samePose = (a: BlokPose | undefined, b: BlokPose | null): boolean =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const RoomProvider = ({room, arranging, children}: {room: BlokRoom; arranging: boolean; children: React.ReactNode}) => {
  const [standing, setStanding] = React.useState<ReadonlyMap<string, BlokPose>>(() => new Map());
  const stand = React.useCallback((agentId: string, pose: BlokPose | null) => {
    setStanding(previous => {
      if (samePose(previous.get(agentId), pose)) return previous;
      const next = new Map(previous);
      if (pose === null) next.delete(agentId);
      else next.set(agentId, pose);
      return next;
    });
  }, []);
  const value = React.useMemo(() => ({room, arranging, standing, stand}), [room, arranging, standing, stand]);
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

/** Arranging is offered on a right-click of the room, not as a button over it. */
const ArrangeItem = ({arranging, onChange}: {arranging: boolean; onChange: (arranging: boolean) => void}) => (
  <DropdownMenuItem
    onSelect={() => onChange(!arranging)}
    title={arranging ? 'Devices stay where you left them, for everyone' : 'Move the devices of this room'}
  >
    <Move3d className="size-4" />
    {arranging ? 'Done arranging' : 'Arrange devices'}
  </DropdownMenuItem>
);

/** Says so when a `Space` names no room. Rendered inside the scene: a notice needs the scene's store, which the frame opens. */
const RoomNotice = ({reference}: {reference: string}) => {
  useSceneNotice(reference ? null : 'A space without a room', 'Name the room (`room="room:lab"`): where devices stand is kept by it.');
  return null;
};

const SpaceRender: BlokRender<Contracts['Space']> = ({component, buildChild}) => {
  const blok = useBlok(component, spaceSchema);
  const reference = useValue(blok.room) ?? '';
  const room = useBlokSpaceHost().useRoom(reference);
  const still = useBlokSceneStill();
  const [arranging, setArranging] = React.useState(false);
  // Only a room the viewer may keep can be arranged, and never while viewing the past.
  const canArrange = room.save !== undefined && !still;
  const moving = arranging && canArrange;

  const children = (
    <RoomProvider room={room} arranging={moving}>
      <RoomNotice reference={reference} />
      <BlokSceneInertProvider value={moving}>
        <Children component={component} buildChild={buildChild} />
      </BlokSceneInertProvider>
    </RoomProvider>
  );
  // Inside a scene that is already open, this one only adds what it holds.
  if (useBlokSceneEmbedded()) return children;
  return (
    <SceneFrame
      component={component}
      buildChild={buildChild}
      menu={canArrange ? <ArrangeItem arranging={moving} onChange={setArranging} /> : null}
    >
      {children}
    </SceneFrame>
  );
};

/* -------------------------------------------------------------------------- */
/* Placed devices                                                             */
/* -------------------------------------------------------------------------- */

const EMPTY_REPORT = {
  ref: '',
  size: 0,
  nodes: [],
  stats: {nodes: 0, triangles: 0, textures: 0, animations: 0},
  joints: [],
  animations: [],
  warnings: [],
};

/**
 * What stands in for a device whose model is not in the scene (yet): its
 * group, with no nodes to bind and nothing to click. A binding without a
 * `node` then works on the group; one naming a node reports it missing.
 */
const standInModel = (root: THREE.Object3D): ModelContextValue => ({
  instance: {root, nodes: new Map(), rest: new Map(), clips: [], report: EMPTY_REPORT},
  addClickable: () => () => undefined,
});

const isPoseRows = (value: unknown): value is BlokPose =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every(row => Array.isArray(row) && row.length === 4 && row.every(cell => typeof cell === 'number' && Number.isFinite(cell)));

const IDENTITY: BlokPose = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

/** One agent a dependency is bound to: drawn by its own scene blok where the room keeps it, its children bound to its model. */
const PlacedAgent = ({
  agent,
  dependency,
  declared,
  blokName,
  children,
}: {
  agent: BlokRunAgent;
  dependency: string;
  declared: unknown;
  blokName: string | null;
  children: React.ReactNode;
}) => {
  const {room, arranging, stand} = useRoom();
  const space = useBlokSpaceHost();
  const kept = room.poseOf(agent.id);
  const pose: BlokPose = kept ?? (isPoseRows(declared) ? declared : IDENTITY);
  const poseKey = JSON.stringify(pose);
  // Keyed by value: a room re-read around the same pose moves nothing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matrix = React.useMemo(() => toMatrix4(pose), [poseKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => stand(agent.id, pose), [agent.id, poseKey, stand]);
  React.useEffect(() => () => stand(agent.id, null), [agent.id, stand]);

  const [group, setGroup] = React.useState<THREE.Group | null>(null);
  const dragging = React.useRef(false);
  React.useLayoutEffect(() => {
    // While the gizmo holds the group it is the gizmo's; the save on release brings the pose back.
    if (!group || dragging.current) return;
    matrix.decompose(group.position, group.quaternion, group.scale);
  }, [group, matrix]);

  const device = useOwnedModel(agent.id);
  const standIn = React.useMemo(() => (group ? standInModel(group) : null), [group]);
  const model = device ?? standIn;

  return (
    <>
      <group ref={setGroup} name={`placed:${dependency}:${agent.id}`}>
        <SceneOwnerProvider value={agent.id}>{space.renderAgent(agent.id, blokName)}</SceneOwnerProvider>
        {model ? <ModelProvider value={model}>{children}</ModelProvider> : null}
      </group>
      {arranging && room.save && group ? (
        <TransformControls
          object={group}
          mode="translate"
          size={0.7}
          onMouseDown={() => {
            dragging.current = true;
          }}
          onMouseUp={() => {
            dragging.current = false;
            group.updateMatrix();
            // A click on the gizmo that moved nothing has nothing to keep.
            if (group.matrix.equals(matrix)) return;
            room.save?.(agent, dependency, fromMatrix4(group.matrix));
          }}
        />
      ) : null}
    </>
  );
};

const PlacedRender: BlokRender<Contracts['Placed']> = ({component, buildChild}) => {
  const blok = useBlok(component, placedSchema);
  const dependency = useValue(blok.dep);
  const blokName = useValue(blok.blok) ?? null;
  const declared = useValue(blok.matrix);
  const run = useBlokRunHost();
  const agents = React.useMemo(() => (dependency ? run.agentsFor(dependency) : []), [dependency, run]);
  useSceneNotice(
    dependency && agents.length === 0 ? `Nothing is bound to "${dependency}"` : null,
    'The run has no agent for this dependency, so nothing is drawn for it.',
  );
  useSceneNotice(
    declared !== undefined && declared !== null && !isPoseRows(declared) ? 'A placement that is not a matrix' : null,
    `"${dependency}" stands at the room's origin: its matrix is not four rows of four numbers.`,
  );
  const children = <Children component={component} buildChild={buildChild} />;
  return (
    <>
      {agents.map(agent => (
        <PlacedAgent key={agent.id} agent={agent} dependency={dependency ?? ''} declared={declared} blokName={blokName}>
          {children}
        </PlacedAgent>
      ))}
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

const ROUTE_COLOR = 'chart-1';

/**
 * A polyline as a tube of `radius` meters: a mesh, which draws on WebGPU, WebGL2
 * and the preview's WebGL alike (drei's `Line` is a GLSL shader).
 */
const RouteTube = ({points, radius, color, opacity = 1}: {points: readonly THREE.Vector3[]; radius: number; color: string; opacity?: number}) => {
  const key = points.map(point => `${point.x},${point.y},${point.z}`).join(';');
  const geometry = React.useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let index = 1; index < points.length; index += 1) {
      // Fresh vectors: a second copy of three fails `instanceof` on the caller's.
      const from = points[index - 1];
      const to = points[index];
      // A zero-length piece has no direction, and the tube's frames would be NaN.
      if (from.x === to.x && from.y === to.y && from.z === to.z) continue;
      path.add(new THREE.LineCurve3(new THREE.Vector3(from.x, from.y, from.z), new THREE.Vector3(to.x, to.y, to.z)));
    }
    if (path.curves.length === 0) return null;
    return new THREE.TubeGeometry(path, path.curves.length * 8, radius, 8, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, radius]);
  React.useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} raycast={() => null}>
      <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} toneMapped={false} />
    </mesh>
  );
};

const RouteRender: BlokRender<Contracts['Route']> = ({component}) => {
  const blok = useBlok(component, routeSchema);
  const through = useValue(blok.through);
  const progress = useValue(blok.progress) ?? undefined;
  const color = useThemeColour(useValue(blok.color) || ROUTE_COLOR) ?? FALLBACK_SCENE_RGB;
  const run = useBlokRunHost();
  const {standing} = useRoom();
  const keys = React.useMemo(() => throughKeys(through), [through]);
  const placementOf = React.useCallback((agentId: string) => standing.get(agentId) ?? null, [standing]);
  const points = React.useMemo(() => routePoints(keys, run.agentsFor, placementOf), [keys, run, placementOf]);
  const split = React.useMemo(
    () => splitRoute(points, progress === undefined ? 1 : progressFraction(progress)),
    [points, progress],
  );
  useSceneNotice(
    keys.length >= 2 && points.length < 2 ? 'A route with nowhere to go' : null,
    `Fewer than two of ${keys.join(', ')} are placed in this space.`,
  );
  if (!split.head) return null;
  return (
    <group name="route">
      {split.travelled.length >= 2 ? <RouteTube points={split.travelled} radius={0.006} color={color} /> : null}
      {split.ahead.length >= 2 && progress !== undefined ? (
        <RouteTube points={split.ahead} radius={0.004} color={color} opacity={0.45} />
      ) : null}
      {progress !== undefined ? (
        <mesh position={split.head} raycast={() => null}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
};

export const runRenders = {
  Space: SpaceRender,
  Placed: PlacedRender,
  Route: RouteRender,
};
