import * as React from 'react';
import * as THREE from 'three';
import * as z from 'zod';
import {Line} from '@react-three/drei';
import {createBlokComponent, useBlok, useValue, type BlokRenderArgs} from '../../runtime';
import {describedString} from '../shared/schemas';
import {ModelProvider, useOwnedModel, useSceneNotice, useSceneOverlay, type ModelContextValue} from '../scene/context';
import {FALLBACK_SCENE_RGB, useThemeColour} from '../scene/colour';
import {useBlokSceneEmbedded} from '../scene/host';
import {BlokTrayProvider, useBlokRunHost, useBlokSpaceHost, type BlokRunAgent} from './host';
import {progressFraction, resolveAnchors, routePoints, splitRoute, throughKeys} from './math';

/**
 * The components only an action's own blok holds: they read the run it is
 * shown for (scene@1). `Overlay` is the root of one drawn into the space
 * hosting the run, `Anchor` anchors at the agent a dependency is bound to,
 * and `Route` draws a line through several.
 */

const Children = ({component, buildChild}: Pick<BlokRenderArgs, 'component' | 'buildChild'>) => (
  <>
    {(component.children ?? []).map(child => (
      <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
    ))}
  </>
);

const overlaySchema = z
  .object({})
  .describe(
    'Root of an action\'s overlay: drawn into the space that hosts a run of the action, in its world coordinates, over the agents placed there. It owns no canvas. Place Anchor and Route inside.',
  );

export const OverlayBlok = createBlokComponent(
  {
    name: 'Overlay',
    acceptsChildren: true,
    placement: {childrenContext: 'scene', notDownstreamOf: ['Scene', 'Overlay']},
    schema: overlaySchema,
  },
  ({component, buildChild}) =>
    useBlokSceneEmbedded() ? (
      <Children component={component} buildChild={buildChild} />
    ) : (
      <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-6 text-center text-sm text-muted-foreground">
        An overlay is drawn into the space that hosts a run of its action. Open the run in a space to see it.
      </div>
    ),
);

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
 * anchor, with no nodes to bind and nothing to click. A binding without a
 * `node` then works on the anchor; one naming a node reports it missing.
 */
const standInModel = (root: THREE.Object3D): ModelContextValue => ({
  instance: {root, nodes: new Map(), rest: new Map(), clips: [], report: EMPTY_REPORT},
  addClickable: () => () => undefined,
});

/** One agent the space places: its children at its placement, bound to its model as its scene blok loaded it. */
const PlacedAt = ({
  agent,
  matrix,
  children,
}: {
  agent: BlokRunAgent;
  matrix: THREE.Matrix4;
  children: React.ReactNode;
}) => {
  const [group, setGroup] = React.useState<THREE.Group | null>(null);
  React.useLayoutEffect(() => {
    if (group) matrix.decompose(group.position, group.quaternion, group.scale);
  }, [group, matrix]);
  const device = useOwnedModel(agent.id);
  const standIn = React.useMemo(() => (group ? standInModel(group) : null), [group]);
  const model = device ?? standIn;
  return (
    <group ref={setGroup} name={`at:${agent.id}`}>
      {model ? <ModelProvider value={model}>{children}</ModelProvider> : null}
    </group>
  );
};

/** One agent the space does not place: a card in the side tray, where what would point at it shows. */
const TrayAt = ({agent, dependency, children}: {agent: BlokRunAgent; dependency: string; children: React.ReactNode}) => {
  const [root] = React.useState(() => new THREE.Object3D());
  const model = React.useMemo(() => standInModel(root), [root]);
  const anchor = React.useCallback(() => null, []);
  useSceneOverlay({
    visible: true,
    anchor,
    mode: 'panel',
    title: agent.name,
    description: `Not placed in this space (${dependency})`,
    content: null,
  });
  return (
    <BlokTrayProvider value={agent.name}>
      <ModelProvider value={model}>{children}</ModelProvider>
    </BlokTrayProvider>
  );
};

const anchorSchema = z
  .object({
    dep: z.string().describe('The dependency key of the action whose agent this anchors at.'),
  })
  .describe(
    'Anchors its children at the agent the run got for a dependency, where it stands in the hosting space; Glow, Popout and OnClick inside it bind to that device\'s model as its scene blok loaded it. A key bound to several agents anchors at each; an agent the space does not place shows in a side tray.',
  );

export const AnchorBlok = createBlokComponent(
  {name: 'Anchor', acceptsChildren: true, placement: {context: 'scene', downstreamOf: ['Overlay']}, schema: anchorSchema},
  ({component, buildChild}) => {
    const blok = useBlok(component, anchorSchema);
    const dependency = useValue(blok.dep);
    const run = useBlokRunHost();
    const space = useBlokSpaceHost();
    const agents = React.useMemo(() => (dependency ? run.agentsFor(dependency) : []), [dependency, run]);
    const anchors = React.useMemo(() => resolveAnchors(agents, space.placementOf), [agents, space]);
    useSceneNotice(
      dependency && agents.length === 0 ? `Nothing is bound to "${dependency}"` : null,
      'The run has no agent for this dependency, so nothing is drawn for it.',
    );
    const children = <Children component={component} buildChild={buildChild} />;
    return (
      <>
        {anchors.placed.map(({agent, matrix}) => (
          <PlacedAt key={agent.id} agent={agent} matrix={matrix}>
            {children}
          </PlacedAt>
        ))}
        {anchors.unplaced.map(agent => (
          <TrayAt key={agent.id} agent={agent} dependency={dependency ?? ''}>
            {children}
          </TrayAt>
        ))}
      </>
    );
  },
);

const routeSchema = z
  .object({
    through: z
      .unknown()
      .describe('The dependency keys the line runs through, in order: `through={["robot", "frame", "robot"]}`.'),
    progress: z
      .number()
      .nullish()
      .describe('How far along the run is, from 0 to 100 (`task.progress`): the way behind is drawn solid, a marker stands at the head.'),
    color: describedString('The colour of the line: a colour role of the theme, usually a chart role (`chart-2`). Defaults to `chart-1`.'),
  })
  .describe(
    'Draws a line through the agents the run got for these dependencies, where they stand in the hosting space. A dependency whose agent is not placed there is skipped.',
  );

const ROUTE_COLOR = 'chart-1';

/** Corners as plain triples: `Line` reads a Vector3 by `instanceof`, which a second copy of three fails. */
const triples = (points: readonly THREE.Vector3[]): Array<[number, number, number]> =>
  points.map(point => [point.x, point.y, point.z]);

export const RouteBlok = createBlokComponent(
  {name: 'Route', placement: {context: 'scene', downstreamOf: ['Overlay']}, schema: routeSchema},
  ({component}) => {
    const blok = useBlok(component, routeSchema);
    const through = useValue(blok.through);
    const progress = useValue(blok.progress) ?? undefined;
    const color = useThemeColour(useValue(blok.color) || ROUTE_COLOR) ?? FALLBACK_SCENE_RGB;
    const run = useBlokRunHost();
    const space = useBlokSpaceHost();
    const keys = React.useMemo(() => throughKeys(through), [through]);
    const points = React.useMemo(() => routePoints(keys, run.agentsFor, space.placementOf), [keys, run, space]);
    const split = React.useMemo(
      () => splitRoute(points, progress === undefined ? 1 : progressFraction(progress)),
      [points, progress],
    );
    useSceneNotice(
      keys.length >= 2 && points.length < 2 ? 'A route with nowhere to go' : null,
      `Fewer than two of ${keys.join(', ')} stand in this space.`,
    );
    if (!split.head) return null;
    return (
      <group name="route">
        {split.travelled.length >= 2 ? <Line points={triples(split.travelled)} color={color} lineWidth={3} /> : null}
        {split.ahead.length >= 2 && progress !== undefined ? (
          <Line points={triples(split.ahead)} color={color} lineWidth={2} dashed dashSize={0.04} gapSize={0.03} transparent opacity={0.5} />
        ) : null}
        {progress !== undefined ? (
          <mesh position={split.head} raycast={() => null}>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ) : null}
      </group>
    );
  },
);

export const runBlokComponents = [OverlayBlok, AnchorBlok, RouteBlok];
