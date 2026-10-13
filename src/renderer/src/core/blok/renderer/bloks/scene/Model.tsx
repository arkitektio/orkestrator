import * as React from 'react';
import * as THREE from 'three';
import * as z from 'zod';
import {useFrame, type ThreeEvent} from '@react-three/fiber';
import {resolveJoints} from '@/core/model/joints';
import {initialMotion, stepMotion, stillMotion, type MotionState} from '@/core/model/motion';
import {parseVector, toBaseUnit} from '@/core/model/units';
import {findWriterConflicts} from '@/core/model/writers';
import {
  createBlokComponent,
  useBlok,
  useEventAction,
  useValue,
  type BlokComponentNode,
  type BlokRenderArgs,
} from '../../runtime';
import {actionProp, describedString} from '../shared/schemas';
import {
  ModelProvider,
  useSceneModelKey,
  useSceneNotice,
  useSceneOverlay,
  useSceneStoreApi,
  type Clickable,
  type ModelContextValue,
} from './context';
import {ASSET_KIND_LABELS, useBlokAsset} from '../../assets';
import {useBlokSceneHost, useBlokSceneInert, useBlokSceneStill, type BlokModelDecoration} from './host';
import {instantiate, loadModel, type ModelInstance} from './loadModel';

const modelShape = {
  src: z
    .string()
    .describe('The 3D model to show: an asset its app registered, as in "@self.assets.scope".'),
  id: describedString('A name other models in the scene address this one by, as in to="arm:tool0".'),
  origin: describedString('Where the model sits in the scene, as "x y z" in meters.'),
  rotation: describedString('How the model is turned, as "x y z" Euler angles in radians.'),
  scale: z.number().optional().describe('Uniform scale. Defaults to 1; a model is authored in meters.'),
};

const modelSchema = z
  .object(modelShape)
  .describe(
    'Places one GLB model in the scene. Its children bind the model\'s named nodes to state. A model that is missing or refused renders a placeholder that says why.',
  );

const jointValues = z
  .record(z.string(), z.unknown())
  .optional();

const robotSchema = z
  .object({
    ...modelShape,
    joints: jointValues.describe(
      'Where each joint is: a map of joint name to radians (revolute, continuous) or meters (prismatic). A joint left out keeps its last value.',
    ),
    animateTo: jointValues.describe('Where each joint is going. Joints named here move at speed, or over duration.'),
    speed: z
      .unknown()
      .optional()
      .describe('How fast joints move to animateTo, in rad/s or m/s: one number for all joints or a map by joint name.'),
    duration: z
      .unknown()
      .optional()
      .describe('How long a move to animateTo takes, in seconds: one number or a map by joint name. Ignored where speed is given.'),
    onJointChange: actionProp(
      'Called when the viewer sets a joint by hand. Arguments may read event.name and event.value.',
    ),
  })
  .describe(
    'A Model with a joint table (extras.arkitekt.joints): applies a joint state map to it, including mimic joints, and clamps to limits.',
  );

const PLACEHOLDER_SIZE = 0.12;

/** What stands where a model would be, saying why it is not there. */
const Placeholder = ({reason}: {reason: string}) => {
  const mesh = React.useRef<THREE.Mesh>(null);
  const anchor = React.useCallback(() => mesh.current, []);
  const content = React.useMemo(() => <div>{reason}</div>, [reason]);
  useSceneOverlay({visible: true, anchor, content, mode: 'popout'});
  return (
    <mesh ref={mesh} position={[0, PLACEHOLDER_SIZE / 2, 0]}>
      <boxGeometry args={[PLACEHOLDER_SIZE, PLACEHOLDER_SIZE, PLACEHOLDER_SIZE]} />
      <meshBasicMaterial color="#8b8b8b" wireframe />
    </mesh>
  );
};

const HoverBox = ({node}: {node: THREE.Object3D}) => {
  const helper = React.useMemo(() => new THREE.BoxHelper(node, 0x38bdf8), [node]);
  useFrame(() => helper.update());
  React.useEffect(() => () => helper.dispose(), [helper]);
  return <primitive object={helper} />;
};

const DecorationMenu = ({decorations}: {decorations: readonly BlokModelDecoration[]}) => {
  const [chosen, setChosen] = React.useState<string | null>(decorations.length === 1 ? decorations[0].name : null);
  const active = decorations.find(decoration => decoration.name === chosen);
  if (active) return <>{active.render()}</>;
  return (
    <ul className="flex flex-col gap-1">
      {decorations.map(decoration => (
        <li key={decoration.name}>
          <button
            type="button"
            className="w-full rounded px-2 py-1 text-left hover:bg-muted"
            onClick={() => setChosen(decoration.name)}
          >
            {decoration.name}
          </button>
        </li>
      ))}
    </ul>
  );
};

/** One node other apps registered bloks for: a click opens them as a popout there. */
const DecoratedNode = ({
  model,
  node,
  decorations,
}: {
  model: ModelContextValue;
  node: THREE.Object3D;
  decorations: readonly BlokModelDecoration[];
}) => {
  const [open, setOpen] = React.useState(false);
  React.useEffect(
    () => model.addClickable(node, {onClick: () => setOpen(previous => !previous)}),
    [model, node],
  );
  const anchor = React.useCallback(() => node, [node]);
  const close = React.useCallback(() => setOpen(false), []);
  const content = React.useMemo(() => <DecorationMenu decorations={decorations} />, [decorations]);
  useSceneOverlay({visible: open, anchor, content, mode: 'popout', dismissable: true, onDismiss: close});
  return null;
};

const Decorations = ({model, reference}: {model: ModelContextValue; reference: string}) => {
  const decorations = useBlokSceneHost().useModelDecorations(reference);
  const byNode = React.useMemo(() => {
    const grouped = new Map<THREE.Object3D, BlokModelDecoration[]>();
    for (const decoration of decorations) {
      const node = decoration.node === null ? model.instance.root : model.instance.nodes.get(decoration.node);
      if (!node) continue;
      grouped.set(node, [...(grouped.get(node) ?? []), decoration]);
    }
    return [...grouped.entries()];
  }, [decorations, model]);
  const unknown = decorations
    .filter(decoration => decoration.node !== null && !model.instance.nodes.has(decoration.node))
    .map(decoration => `${decoration.name} → ${decoration.node}`);
  useSceneNotice(
    unknown.length ? 'Bloks registered for nodes this model does not have' : null,
    unknown.join(', '),
  );
  return (
    <>
      {byNode.map(([node, group]) => (
        <DecoratedNode key={node.uuid} model={model} node={node} decorations={group} />
      ))}
    </>
  );
};

const numberOrMap = (raw: unknown, name: string): number | undefined => {
  if (typeof raw === 'number') return raw;
  if (raw && typeof raw === 'object') {
    const value = (raw as Record<string, unknown>)[name];
    return typeof value === 'number' ? value : undefined;
  }
  return undefined;
};

const convertJointMap = (
  raw: Record<string, unknown> | undefined,
  kinds: ReadonlyMap<string, 'length' | 'angle'>,
): {values: Record<string, number>; problems: string[]} => {
  const values: Record<string, number> = {};
  const problems: string[] = [];
  for (const [name, value] of Object.entries(raw ?? {})) {
    const converted = toBaseUnit(value, kinds.get(name) ?? 'angle');
    if (converted.ok) values[name] = converted.value;
    else problems.push(`${name}: ${converted.reason}`);
  }
  return {values, problems};
};

const JointSlider = ({
  name,
  lower,
  upper,
  initial,
  onChange,
}: {
  name: string;
  lower: number;
  upper: number;
  initial: number;
  onChange: (value: number) => void;
}) => {
  const [value, setValue] = React.useState(initial);
  return (
    <label className="flex w-56 flex-col gap-1">
      <span className="flex justify-between text-xs">
        <span className="font-medium">{name}</span>
        <span className="tabular-nums text-muted-foreground">{value.toFixed(3)}</span>
      </span>
      <input
        type="range"
        min={lower}
        max={upper}
        step={(upper - lower) / 200}
        value={value}
        onChange={event => {
          const next = Number(event.target.value);
          setValue(next);
          onChange(next);
        }}
      />
    </label>
  );
};

const axisVector = new THREE.Vector3();
const turn = new THREE.Quaternion();

/** Applies the joint state map to the pivot nodes, every frame. */
const JointDriver = ({
  component,
  model,
}: {
  component: BlokComponentNode;
  model: ModelContextValue;
}) => {
  const blok = useBlok(component, robotSchema);
  const joints = useValue(blok.joints);
  const animateTo = useValue(blok.animateTo);
  const speed = useValue(blok.speed);
  const duration = useValue(blok.duration);
  const onJointChange = useEventAction(blok, 'onJointChange');
  const table = model.instance.report.joints;
  const kinds = React.useMemo(
    () => new Map(table.map(joint => [joint.name, joint.type === 'prismatic' ? ('length' as const) : ('angle' as const)])),
    [table],
  );

  const measured = React.useMemo(() => convertJointMap(joints, kinds), [joints, kinds]);
  const targets = React.useMemo(() => convertJointMap(animateTo, kinds), [animateTo, kinds]);
  // A joint a partial map leaves out keeps its last value, so each resolution starts
  // from the one before it.
  const [resolved, setResolved] = React.useState(() => ({
    measured,
    result: resolveJoints(table, measured.values),
  }));
  if (resolved.measured !== measured) {
    setResolved({measured, result: resolveJoints(table, measured.values, resolved.result.poses)});
  }
  const poses = resolved.result;
  const targetPoses = React.useMemo(() => resolveJoints(table, targets.values), [table, targets]);

  const clamped = [...poses.poses].filter(([, pose]) => pose.clamped).map(([name]) => name);
  const problems = [...measured.problems, ...targets.problems];
  useSceneNotice(poses.unknown.length ? 'Joints this model does not have' : null, poses.unknown.join(', '));
  useSceneNotice(
    clamped.length ? 'Joint values outside their limits' : null,
    `${clamped.join(', ')} (clamped for display; check calibration and units)`,
  );
  useSceneNotice(problems.length ? 'Joint values that cannot be converted' : null, problems.join('; '));

  const still = useBlokSceneStill();
  const motion = React.useRef(new Map<string, MotionState>());
  useFrame((_state, delta) => {
    for (const joint of table) {
      const node = model.instance.nodes.get(joint.node);
      const rest = node ? model.instance.rest.get(node) : undefined;
      const pose = poses.poses.get(joint.name);
      if (!node || !rest || !pose) continue;
      const moving = {
        value: pose.value,
        target: targetPoses.poses.get(joint.name)?.value,
        speed: numberOrMap(speed, joint.name),
        duration: numberOrMap(duration, joint.name),
      };
      const input = still ? stillMotion(moving) : moving;
      const next = stepMotion(motion.current.get(joint.name) ?? initialMotion(input), input, Math.min(delta, 0.1));
      motion.current.set(joint.name, next);
      axisVector.set(...joint.axis);
      if (joint.type === 'prismatic') {
        node.position.copy(rest.position).addScaledVector(axisVector.applyQuaternion(rest.quaternion), next.displayed);
      } else {
        node.quaternion.copy(rest.quaternion).multiply(turn.setFromAxisAngle(axisVector, next.displayed));
      }
    }
  });

  // A joint is set by hand through a slider at its pivot, only when the blok asked to hear of it.
  const [selected, setSelected] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!onJointChange) return;
    const removers = table.flatMap(joint => {
      const node = model.instance.nodes.get(joint.node);
      return node
        ? [model.addClickable(node, {onClick: () => setSelected(current => (current === joint.name ? null : joint.name))})]
        : [];
    });
    return () => removers.forEach(remove => remove());
  }, [model, onJointChange, table]);
  const joint = table.find(candidate => candidate.name === selected);
  const anchor = React.useCallback(
    () => (joint ? (model.instance.nodes.get(joint.node) ?? null) : null),
    [joint, model],
  );
  const close = React.useCallback(() => setSelected(null), []);
  const content = React.useMemo(
    () =>
      joint && onJointChange ? (
        <JointSlider
          key={joint.name}
          name={joint.name}
          lower={joint.limit?.lower ?? -Math.PI}
          upper={joint.limit?.upper ?? Math.PI}
          initial={poses.poses.get(joint.name)?.value ?? 0}
          onChange={value => onJointChange({name: joint.name, value})}
        />
      ) : null,
    [joint, onJointChange, poses],
  );
  useSceneOverlay({
    visible: Boolean(joint && onJointChange),
    anchor,
    content,
    mode: 'popout',
    dismissable: true,
    onDismiss: close,
  });
  return null;
};

const LoadedModel = ({
  component,
  buildChild,
  instance,
  id,
  reference,
  robot,
}: {
  component: BlokComponentNode;
  buildChild: BlokRenderArgs['buildChild'];
  instance: ModelInstance;
  id: string | undefined;
  reference: string;
  robot: boolean;
}) => {
  const store = useSceneStoreApi();
  const inert = useBlokSceneInert();
  const clickables = React.useRef(new Map<THREE.Object3D, Clickable>());
  const [hovered, setHovered] = React.useState<THREE.Object3D | null>(null);

  const model = React.useMemo<ModelContextValue>(
    () => ({
      id,
      instance,
      addClickable: (node, clickable) => {
        clickables.current.set(node, clickable);
        return () => {
          if (clickables.current.get(node) === clickable) clickables.current.delete(node);
        };
      },
    }),
    [id, instance],
  );

  const modelKey = useSceneModelKey();
  React.useEffect(() => {
    if (!id) return;
    const key = modelKey(id);
    store.getState().setModel(key, instance);
    return () => store.getState().setModel(key, null);
  }, [id, instance, modelKey, store]);

  const placedKey = React.useId();
  React.useEffect(() => {
    store.getState().setPlaced(placedKey, instance.root);
    return () => store.getState().setPlaced(placedKey, null);
  }, [instance, placedKey, store]);

  /** The nearest clickable node at or above what the pointer hit. */
  const clickableAt = (object: THREE.Object3D | null): THREE.Object3D | null => {
    if (inert) return null;
    for (let current = object; current; current = current.parent) {
      if (clickables.current.has(current)) return current;
      if (current === instance.root) break;
    }
    return null;
  };
  const onClick = (event: ThreeEvent<MouseEvent>) => {
    const node = clickableAt(event.object);
    if (!node) return;
    event.stopPropagation();
    clickables.current.get(node)?.onClick();
  };
  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    const node = clickableAt(event.object);
    if (node === hovered) return;
    if (hovered) clickables.current.get(hovered)?.onHover?.(false);
    if (node) clickables.current.get(node)?.onHover?.(true);
    setHovered(node);
    document.body.style.cursor = node ? 'pointer' : '';
  };
  const onPointerOut = () => {
    if (hovered) clickables.current.get(hovered)?.onHover?.(false);
    setHovered(null);
    document.body.style.cursor = '';
  };

  const jointNodes = React.useMemo(
    () => new Set(robot ? instance.report.joints.map(joint => joint.node) : []),
    [instance, robot],
  );
  const conflicts = React.useMemo(
    () => findWriterConflicts(component.children, jointNodes),
    [component, jointNodes],
  );
  useSceneNotice(conflicts.length ? 'Conflicting bindings; none were applied' : null, conflicts.join(' '));
  const missingJoints = robot && instance.report.joints.length === 0;
  useSceneNotice(
    missingJoints ? 'This model has no joint table' : null,
    'A Robot needs extras.arkitekt.joints; use Model for a model without one.',
  );
  // What an author should fix in the model (naming, ignored extensions) is not a
  // viewer's problem: a binding that names a missing node reports itself.
  React.useEffect(() => {
    if (instance.report.warnings.length) {
      console.warn(`[blok] model ${reference}:`, instance.report.warnings.join('; '));
    }
  }, [instance, reference]);

  return (
    <ModelProvider value={model}>
      <primitive object={instance.root} onClick={onClick} onPointerMove={onPointerMove} onPointerOut={onPointerOut} />
      {hovered ? <HoverBox node={hovered} /> : null}
      {robot && !missingJoints ? <JointDriver component={component} model={model} /> : null}
      <Decorations model={model} reference={reference} />
      {conflicts.length
        ? null
        : (component.children ?? []).map(child => (
            <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
          ))}
    </ModelProvider>
  );
};

const ModelBody = ({component, buildChild, robot}: Pick<BlokRenderArgs, 'component' | 'buildChild'> & {robot: boolean}) => {
  const blok = useBlok(component, modelSchema);
  const id = useValue(blok.id);
  const origin = parseVector(useValue(blok.origin)) ?? [0, 0, 0];
  const rotation = parseVector(useValue(blok.rotation)) ?? [0, 0, 0];
  const scale = useValue(blok.scale) ?? 1;
  const host = useBlokSceneHost();
  const asset = useBlokAsset(component, 'src');

  const ready = asset?.status === 'ready' && asset.kind === 'MODEL_3D' ? asset : null;
  const reference = ready?.ref ?? '';
  const load = ready?.load ?? null;

  const [loaded, setLoaded] = React.useState<{reference: string; instance?: ModelInstance; error?: string}>({
    reference: '',
  });
  React.useEffect(() => {
    if (!load) return;
    let live = true;
    loadModel(reference, load, host.policy).then(
      model => live && setLoaded({reference, instance: instantiate(model)}),
      (error: Error) => live && setLoaded({reference, error: error.message}),
    );
    return () => {
      live = false;
    };
  }, [host.policy, load, reference]);

  const current = load && loaded.reference === reference ? loaded : undefined;
  const reason =
    asset === null
      ? 'A model names an asset its app registered: src="@self.assets.<name>".'
      : asset.status === 'unknown'
        ? asset.reason
        : asset.status === 'awaited'
          ? 'This model has not been uploaded yet. Its app uploads it when it runs.'
          : asset.status === 'ready' && asset.kind !== 'MODEL_3D'
            ? `This asset is a ${ASSET_KIND_LABELS[asset.kind]}, not a 3D model.`
            : (current?.error ?? 'Loading model…');

  return (
    <group position={origin} rotation={rotation} scale={scale}>
      {current?.instance ? (
        <LoadedModel
          component={component}
          buildChild={buildChild}
          instance={current.instance}
          id={id}
          reference={reference}
          robot={robot}
        />
      ) : (
        <Placeholder reason={reason} />
      )}
    </group>
  );
};

const MODEL_PROP_KINDS = {src: 'ASSET'} as const;

export const ModelBlok = createBlokComponent(
  {
    name: 'Model',
    acceptsChildren: true,
    placement: {context: 'scene', downstreamOf: ['Scene']},
    propKinds: MODEL_PROP_KINDS,
    schema: modelSchema,
  },
  ({component, buildChild}) => <ModelBody component={component} buildChild={buildChild} robot={false} />,
);

export const RobotBlok = createBlokComponent(
  {
    name: 'Robot',
    acceptsChildren: true,
    placement: {context: 'scene', downstreamOf: ['Scene']},
    propKinds: MODEL_PROP_KINDS,
    schema: robotSchema,
  },
  ({component, buildChild}) => <ModelBody component={component} buildChild={buildChild} robot />,
);
