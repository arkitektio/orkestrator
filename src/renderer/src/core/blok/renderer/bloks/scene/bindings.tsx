import * as React from 'react';
import * as THREE from 'three';
import * as z from 'zod';
import {useFrame} from '@react-three/fiber';
import {clipMotion, initialMotion, stepMotion, stillMotion, type MotionState} from '@/core/model/motion';
import {parseAxis, toBaseUnit, wavelengthToColor, type Dimension} from '@/core/model/units';
import {parseNodeAddress} from '@/core/model/writers';
import {createBlokComponent, useBlok, useValue, type BlokComponentPlacement} from '../../runtime';
import {describedString} from '../shared/schemas';
import {useModel, useSceneModelKey, useSceneNotice, useSceneState, type ModelContextValue} from './context';
import {useBlokSceneStill} from './host';
import {ownMaterials} from './loadModel';

/** Every binding sits somewhere under the model whose nodes it names. */
const IN_MODEL: BlokComponentPlacement = {context: 'scene', downstreamOf: ['Model', 'Robot']};

const nodeProp = z.string().describe('The name of the node in the enclosing model that this binds.');

/** The node a binding names, and a notice beside the scene while the model has no such node. */
const useNode = (name: string | undefined): THREE.Object3D | undefined => {
  const model = useModel();
  const node = name ? model.instance.nodes.get(name) : undefined;
  useSceneNotice(name && !node ? 'Unknown node' : null, `The model has no node '${name}'.`);
  return node;
};

/** A node of this model, or `arm:tool0` for a node of the model whose id is `arm`. */
const useAddressedNode = (address: string | undefined): THREE.Object3D | undefined => {
  const model = useModel();
  const parsed = address ? parseNodeAddress(address) : undefined;
  const modelKey = useSceneModelKey();
  const other = useSceneState(state => (parsed?.model ? state.models.get(modelKey(parsed.model)) : undefined));
  const instance = parsed?.model ? other : model.instance;
  const node = parsed ? instance?.nodes.get(parsed.node) : undefined;
  useSceneNotice(address && !node ? 'Unknown node' : null, `Nothing in the scene is addressed by '${address}'.`);
  return node;
};

const motionShape = (unit: string, rate: string) => ({
  node: nodeProp,
  axis: z
    .string()
    .describe('The axis in the node\'s own frame: "x", "y", "z" or a vector as "x y z".'),
  value: z
    .unknown()
    .optional()
    .describe(`Where the part is, in ${unit} from the pose the model was authored in. A quantity ({magnitude, unit}) is converted.`),
  animateTo: z
    .unknown()
    .optional()
    .describe('Where the part is going. With it, the view moves there at speed (or over duration) and value corrects it.'),
  speed: z.number().optional().describe(`How fast it moves to animateTo, in ${rate}.`),
  duration: z.number().optional().describe('How long a move to animateTo takes, in seconds. Ignored when speed is given.'),
  scale: z.number().optional().describe('Multiplies the value before it is applied. Defaults to 1.'),
  offset: z.number().optional().describe(`Added after scale, in ${unit}. Defaults to 0.`),
  gain: z.number().optional().describe('Exaggerates the motion on screen only, for travel too small to see. Defaults to 1.'),
  smooth: z.boolean().optional().describe('Whether to ease toward each new value over 300 ms. Defaults to true.'),
});

const moveSchema = z
  .object(motionShape('meters', 'm/s'))
  .describe('Translates a node along an axis by value x scale + offset meters from its authored pose.');
const rotateSchema = z
  .object(motionShape('radians', 'rad/s'))
  .describe('Rotates a node about an axis by value x scale + offset radians from its authored pose.');

const direction = new THREE.Vector3();
const turn = new THREE.Quaternion();

/**
 * Drives one channel of one node. React delivers what the agent published;
 * the frame loop moves the node, so a part glides between state updates
 * without a render per frame.
 */
const useMotionBinding = (
  model: ModelContextValue,
  props: {
    node: string | undefined;
    axis: string | undefined;
    value: unknown;
    animateTo: unknown;
    speed: number | undefined;
    duration: number | undefined;
    scale: number | undefined;
    offset: number | undefined;
    gain: number | undefined;
    smooth: boolean | undefined;
  },
  dimension: Dimension,
): void => {
  const node = useNode(props.node);
  const axis = parseAxis(props.axis);
  const scale = props.scale ?? 1;
  const offset = props.offset ?? 0;
  const measured = props.value === undefined || props.value === null ? undefined : toBaseUnit(props.value, dimension);
  const target =
    props.animateTo === undefined || props.animateTo === null ? undefined : toBaseUnit(props.animateTo, dimension);

  const problem =
    props.axis !== undefined && !axis
      ? `'${props.axis}' is not an axis.`
      : measured && !measured.ok
        ? measured.reason
        : target && !target.ok
          ? target.reason
          : null;
  useSceneNotice(problem ? `Cannot move '${props.node}'` : null, problem ?? undefined);

  const still = useBlokSceneStill();
  const input = React.useMemo(() => {
    if (!measured?.ok) return undefined;
    const moving = {
      value: measured.value * scale + offset,
      target: target?.ok ? target.value * scale + offset : undefined,
      speed: props.speed,
      duration: props.duration,
      smooth: props.smooth,
    };
    return still ? stillMotion(moving) : moving;
  }, [measured, offset, props.duration, props.smooth, props.speed, scale, still, target]);
  const state = React.useRef<MotionState | undefined>(undefined);
  const gain = props.gain ?? 1;

  useFrame((_state, delta) => {
    const rest = node ? model.instance.rest.get(node) : undefined;
    if (!node || !rest || !axis || !input) return;
    state.current = stepMotion(state.current ?? initialMotion(input), input, Math.min(delta, 0.1));
    const displayed = state.current.displayed * gain;
    direction.set(...axis);
    if (dimension === 'length') {
      node.position.copy(rest.position).addScaledVector(direction.applyQuaternion(rest.quaternion), displayed);
    } else {
      node.quaternion.copy(rest.quaternion).multiply(turn.setFromAxisAngle(direction, displayed));
    }
  });

  // An unmounted binding leaves the node where the model was authored.
  React.useEffect(
    () => () => {
      const rest = node ? model.instance.rest.get(node) : undefined;
      if (!node || !rest) return;
      if (dimension === 'length') node.position.copy(rest.position);
      else node.quaternion.copy(rest.quaternion);
    },
    [dimension, model, node],
  );
};

const motionComponent = (name: 'Move' | 'Rotate', schema: typeof moveSchema, dimension: Dimension) =>
  createBlokComponent({name, placement: IN_MODEL, schema}, ({component}) => {
    const blok = useBlok(component, schema);
    useMotionBinding(
      useModel(),
      {
        node: useValue(blok.node),
        axis: useValue(blok.axis),
        value: useValue(blok.value),
        animateTo: useValue(blok.animateTo),
        speed: useValue(blok.speed),
        duration: useValue(blok.duration),
        scale: useValue(blok.scale),
        offset: useValue(blok.offset),
        gain: useValue(blok.gain),
        smooth: useValue(blok.smooth),
      },
      dimension,
    );
    return null;
  });

export const MoveBlok = motionComponent('Move', moveSchema, 'length');
export const RotateBlok = motionComponent('Rotate', rotateSchema, 'angle');

const showSchema = z
  .object({
    node: nodeProp,
    when: z.boolean().optional().describe('Whether the node is visible. Hiding a node hides everything beneath it.'),
  })
  .describe('Shows or hides a node and its whole subtree.');

export const ShowBlok = createBlokComponent({name: 'Show', placement: IN_MODEL, schema: showSchema}, ({component}) => {
  const blok = useBlok(component, showSchema);
  const node = useNode(useValue(blok.node));
  const when = useValue(blok.when);
  React.useEffect(() => {
    if (!node) return;
    const authored = node.visible;
    node.visible = when ?? authored;
    return () => {
      node.visible = authored;
    };
  }, [node, when]);
  return null;
});

type Emissive = THREE.Material & {emissive?: THREE.Color; emissiveIntensity?: number};
type Colored = THREE.Material & {color?: THREE.Color};

const glowSchema = z
  .object({
    node: nodeProp,
    on: z.boolean().optional().describe('Whether the node glows.'),
    intensity: z.number().optional().describe('How strongly. Defaults to 1 for materials, and to the authored intensity for a light.'),
    color: describedString('The color of the glow, as a CSS color. Defaults to the material\'s own emissive color, or white.'),
  })
  .describe('Switches the emissive output of a node\'s materials, or the intensity of a punctual light attached to it.');

export const GlowBlok = createBlokComponent({name: 'Glow', placement: IN_MODEL, schema: glowSchema}, ({component}) => {
  const blok = useBlok(component, glowSchema);
  const node = useNode(useValue(blok.node));
  const on = useValue(blok.on) ?? false;
  const intensity = useValue(blok.intensity);
  const color = useValue(blok.color);
  React.useEffect(() => {
    if (!node) return;
    const lights: Array<[THREE.Light, number]> = [];
    node.traverse(object => {
      const light = object as THREE.Light;
      if (light.isLight) lights.push([light, light.intensity]);
    });
    const materials = ownMaterials(node).filter((material): material is Emissive => 'emissive' in material);
    const authored = materials.map(material => [material.emissive?.clone(), material.emissiveIntensity] as const);
    lights.forEach(([light, original]) => {
      light.intensity = on ? (intensity ?? original) : 0;
    });
    materials.forEach(material => {
      if (!material.emissive) return;
      if (on) {
        if (color) material.emissive.set(color);
        else if (material.emissive.getHex() === 0) material.emissive.set('#ffffff');
        material.emissiveIntensity = intensity ?? 1;
      } else {
        material.emissiveIntensity = 0;
      }
    });
    return () => {
      lights.forEach(([light, original]) => {
        light.intensity = original;
      });
      materials.forEach((material, index) => {
        const [emissive, emissiveIntensity] = authored[index];
        if (emissive && material.emissive) material.emissive.copy(emissive);
        material.emissiveIntensity = emissiveIntensity;
      });
    };
  }, [color, intensity, node, on]);
  return null;
});

const tintSchema = z
  .object({
    node: nodeProp,
    color: describedString('The base color to give the node, as a CSS color. Without it the authored color shows.'),
  })
  .describe('Overrides the base color of a node. Its materials are copied first, so nodes sharing them are unaffected.');

export const TintBlok = createBlokComponent({name: 'Tint', placement: IN_MODEL, schema: tintSchema}, ({component}) => {
  const blok = useBlok(component, tintSchema);
  const node = useNode(useValue(blok.node));
  const color = useValue(blok.color);
  React.useEffect(() => {
    if (!node || !color) return;
    const materials = ownMaterials(node).filter((material): material is Colored => 'color' in material);
    const authored = materials.map(material => material.color?.clone());
    materials.forEach(material => material.color?.set(color));
    return () => {
      materials.forEach((material, index) => {
        const original = authored[index];
        if (original) material.color?.copy(original);
      });
    };
  }, [color, node]);
  return null;
});

const attachSchema = z
  .object({
    node: nodeProp,
    to: z
      .string()
      .describe('What to attach it to: a node of this model, or "<model id>:<node>" for a node of another model in the scene.'),
    when: z.boolean().optional().describe('Whether it is attached. When false the node returns to where it was authored.'),
  })
  .describe('While `when` holds, carries a node with another node, keeping its place in the world at the moment of attaching. For picked-up objects.');

export const AttachBlok = createBlokComponent({name: 'Attach', placement: IN_MODEL, schema: attachSchema}, ({component}) => {
  const blok = useBlok(component, attachSchema);
  const model = useModel();
  const node = useNode(useValue(blok.node));
  const target = useAddressedNode(useValue(blok.to));
  const when = useValue(blok.when) ?? false;
  React.useEffect(() => {
    const home = node ? model.instance.rest.get(node)?.parent : undefined;
    if (!node || !target || !home || !when) return;
    target.attach(node);
    return () => {
      home.attach(node);
    };
  }, [model, node, target, when]);
  return null;
});

const beamSchema = z
  .object({
    start: z.string().describe('The node the beam leaves from.'),
    end: describedString('The node the beam ends at, in this model or as "<model id>:<node>". Use this or length.'),
    length: z.number().optional().describe('How far the beam reaches along the start node\'s own Z axis, in meters. Use this or end.'),
    on: z.boolean().optional().describe('Whether the beam is drawn. Defaults to true.'),
    wavelength: z.number().optional().describe('The wavelength in nanometers, shown as its color.'),
    color: describedString('The color of the beam as a CSS color. Takes precedence over wavelength.'),
    width: z.number().optional().describe('The diameter of the beam in meters. Defaults to 2 mm.'),
  })
  .describe('Draws a beam from one anchor to another, or for a length along an anchor\'s Z axis, following both as they move.');

const from = new THREE.Vector3();
const to = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const orientation = new THREE.Quaternion();

export const BeamBlok = createBlokComponent({name: 'Beam', placement: IN_MODEL, schema: beamSchema}, ({component}) => {
  const blok = useBlok(component, beamSchema);
  const start = useNode(useValue(blok.start));
  const end = useAddressedNode(useValue(blok.end));
  const length = useValue(blok.length);
  const on = useValue(blok.on) ?? true;
  const wavelength = useValue(blok.wavelength);
  const color = useValue(blok.color) ?? (wavelength ? wavelengthToColor(wavelength) : '#ff3b30');
  const width = useValue(blok.width) ?? 0.002;
  const mesh = React.useRef<THREE.Mesh>(null);

  useFrame(() => {
    const beam = mesh.current;
    if (!beam) return;
    if (!on || !start || (!end && !length)) {
      beam.visible = false;
      return;
    }
    start.getWorldPosition(from);
    if (end) end.getWorldPosition(to);
    else to.set(0, 0, length ?? 0).applyQuaternion(start.getWorldQuaternion(orientation)).add(from);
    const span = from.distanceTo(to);
    beam.visible = span > 0;
    if (!beam.visible) return;
    // The mesh lives in the model's group; the anchors are measured in the world.
    beam.parent?.worldToLocal(from);
    beam.parent?.worldToLocal(to);
    beam.position.copy(from).add(to).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(up, to.sub(from).normalize());
    beam.scale.set(width, from.distanceTo(beam.position) * 2, width);
  });

  return (
    <mesh ref={mesh} visible={false} raycast={() => null}>
      <cylinderGeometry args={[0.5, 0.5, 1, 12, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.75} toneMapped={false} depthWrite={false} />
    </mesh>
  );
});

const animateSchema = z
  .object({
    clip: z.string().describe('The name of an animation clip in the enclosing model.'),
    progress: z.number().optional().describe('Where in the clip to show, from 0 (start) to 1 (end). Use this or time.'),
    time: z.number().optional().describe('Where in the clip to show, in seconds. Use this or progress.'),
    animateTo: z.number().optional().describe('The position to play to, in the unit of whichever of progress or time is used.'),
    duration: z.number().optional().describe('How long playing to animateTo takes, in seconds.'),
  })
  .describe('Scrubs a named animation clip of the model to a position, for mechanisms a single move or turn cannot describe. Never loops on its own.');

export const AnimateBlok = createBlokComponent({name: 'Animate', placement: IN_MODEL, schema: animateSchema}, ({component}) => {
  const blok = useBlok(component, animateSchema);
  const model = useModel();
  const clipName = useValue(blok.clip);
  const progress = useValue(blok.progress);
  const time = useValue(blok.time);
  const animateTo = useValue(blok.animateTo);
  const duration = useValue(blok.duration);

  const clip = React.useMemo(
    () => model.instance.clips.find(candidate => candidate.name === clipName),
    [clipName, model],
  );
  useSceneNotice(clipName && !clip ? 'Unknown animation clip' : null, `The model has no clip '${clipName}'.`);

  const playback = React.useMemo(() => {
    if (!clip) return undefined;
    const mixer = new THREE.AnimationMixer(model.instance.root);
    const action = mixer.clipAction(clip);
    action.play();
    action.paused = true;
    return {mixer, action};
  }, [clip, model]);
  React.useEffect(
    () => () => {
      playback?.mixer.stopAllAction();
      playback?.mixer.uncacheRoot(model.instance.root);
    },
    [model, playback],
  );

  const still = useBlokSceneStill();
  const state = React.useRef<MotionState | undefined>(undefined);
  // A clip bound to state can change: the new clip starts from its own position, not
  // from where the previous one was left.
  React.useEffect(() => {
    state.current = undefined;
  }, [playback]);
  useFrame((_state, delta) => {
    if (!playback || !clip) return;
    const input = clipMotion({time, progress, animateTo, duration}, clip.duration, still);
    state.current = stepMotion(state.current ?? initialMotion(input), input, Math.min(delta, 0.1));
    playback.action.time = Math.min(Math.max(state.current.displayed, 0), clip.duration);
    playback.mixer.update(0);
  });
  return null;
});
