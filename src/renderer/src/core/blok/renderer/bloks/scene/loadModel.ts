import * as THREE from 'three';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {GLTFLoader, type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {clone as cloneSkinned} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {DEFAULT_MODEL_POLICY, validateModel, type ModelPolicy, type ModelReport} from '@/core/model/glb';

/**
 * From verified bytes to a scene graph.
 *
 * Every load hashes the bytes against the reference and runs the full rule
 * table before a decoder sees them. The parsed result is cached by reference:
 * a hash names its content, so it never goes stale.
 */

export type LoadedModel = {gltf: GLTF; report: ModelReport};

const LOAD_TIMEOUT_MS = 30_000;

const cache = new Map<string, Promise<LoadedModel>>();

let dracoLoader: DRACOLoader | undefined;

/** The decoder ships with the app: a lab without internet must still open a Draco model. */
const draco = (): DRACOLoader => {
  dracoLoader ??= new DRACOLoader().setDecoderPath(new URL('./draco/gltf/', document.baseURI).href);
  return dracoLoader;
};

const parse = (bytes: Uint8Array): Promise<GLTF> => {
  const manager = new THREE.LoadingManager();
  // Validation refuses a model with a `uri`; this is the second line. Embedded
  // images load through blob: URLs the loader makes itself, nothing else may.
  manager.setURLModifier(url => (url.startsWith('blob:') || url.startsWith('data:') ? url : 'about:invalid'));
  const loader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).setDRACOLoader(draco());
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return Promise.race([
    loader.parseAsync(buffer, ''),
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error('The model took too long to decode.')), LOAD_TIMEOUT_MS),
    ),
  ]);
};

export const loadModel = (
  ref: string,
  getBytes: () => Promise<Uint8Array>,
  policy: ModelPolicy = DEFAULT_MODEL_POLICY,
): Promise<LoadedModel> => {
  const cached = cache.get(ref);
  if (cached) return cached;
  const loading = (async () => {
    const bytes = await getBytes();
    const report = await validateModel(bytes, ref, policy);
    return {gltf: await parse(bytes), report};
  })();
  cache.set(ref, loading);
  // A failure is not content: the next attempt (after an admin added the model, say) starts over.
  loading.catch(() => cache.delete(ref));
  return loading;
};

export type RestPose = {position: THREE.Vector3; quaternion: THREE.Quaternion; parent: THREE.Object3D | null};

/** One placed copy of a model: its own nodes and materials, and the pose it was authored in. */
export type ModelInstance = {
  root: THREE.Object3D;
  nodes: Map<string, THREE.Object3D>;
  rest: Map<THREE.Object3D, RestPose>;
  clips: THREE.AnimationClip[];
  report: ModelReport;
};

export const instantiate = (loaded: LoadedModel): ModelInstance => {
  const root = cloneSkinned(loaded.gltf.scene);
  const nodes = new Map<string, THREE.Object3D>();
  const rest = new Map<THREE.Object3D, RestPose>();
  root.traverse(object => {
    if (object.name && !nodes.has(object.name)) nodes.set(object.name, object);
    rest.set(object, {
      position: object.position.clone(),
      quaternion: object.quaternion.clone(),
      parent: object.parent,
    });
  });
  // GLTFLoader sanitizes names for animation tracks ("stage.x" -> "stagex"); the
  // binding contract is the authored name, which the report holds verbatim.
  for (const name of loaded.report.nodes) {
    if (nodes.has(name)) continue;
    const sanitized = THREE.PropertyBinding.sanitizeNodeName(name);
    const object = nodes.get(sanitized);
    if (object) nodes.set(name, object);
  }
  return {root, nodes, rest, clips: loaded.gltf.animations, report: loaded.report};
};

const owned = new WeakSet<THREE.Material>();

/**
 * The materials of a node's subtree, cloned once so that changing them does
 * not change another node, or another copy of the model, that shares them.
 */
export const ownMaterials = (node: THREE.Object3D): THREE.Material[] => {
  const materials: THREE.Material[] = [];
  node.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const claim = (material: THREE.Material): THREE.Material => {
      if (owned.has(material)) return material;
      const copy = material.clone();
      owned.add(copy);
      return copy;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(claim) : claim(mesh.material);
    materials.push(...(Array.isArray(mesh.material) ? mesh.material : [mesh.material]));
  });
  return materials;
};
