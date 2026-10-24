/**
 * What a GLB must be to be shown, checked on its bytes.
 *
 * The browser's implementation of the kulisse wire format (`KULISSE.md` in
 * arkitektio/kulisse): the rule table a server's KulisseStore holds a model to
 * when its upload is finished (`arkitekt_datalayer/kulisse.py`, with the same
 * refusal codes), plus the one check only a client can make: texture sizes
 * live in the binary chunk, which the server measures but never decodes.
 *
 * Pure: no DOM, no three.js. A viewer runs `validateModel` before an admin
 * upload and `modelRef` on every load.
 */

export type ModelPolicy = {
  maxSize: number;
  maxJson: number;
  maxNodes: number;
  maxTriangles: number;
  maxTextureSize: number;
  maxTextureMemory: number;
  maxAnimations: number;
  extensions: readonly string[];
};

export const DEFAULT_MODEL_POLICY: ModelPolicy = {
  maxSize: 50 * 1024 * 1024,
  maxJson: 4 * 1024 * 1024,
  maxNodes: 10_000,
  maxTriangles: 2_000_000,
  maxTextureSize: 4096,
  maxTextureMemory: 256 * 1024 * 1024,
  maxAnimations: 64,
  extensions: [
    'KHR_lights_punctual',
    'KHR_materials_emissive_strength',
    'KHR_materials_variants',
    'KHR_texture_transform',
    'KHR_mesh_quantization',
    'EXT_meshopt_compression',
    'KHR_draco_mesh_compression',
  ],
};

export type ModelRefusalCode =
  | 'bad_reference'
  | 'hash_mismatch'
  | 'too_large'
  | 'bad_header'
  | 'bad_structure'
  | 'external_reference'
  | 'unsupported_extension'
  | 'bad_extras'
  | 'over_budget';

/** A model that may not be shown, with the code the server uses for the same rule. */
export class ModelRefused extends Error {
  constructor(
    readonly code: ModelRefusalCode,
    message: string,
  ) {
    super(message);
    this.name = 'ModelRefused';
  }
}

export type ModelJoint = {
  name: string;
  node: string;
  type: 'revolute' | 'continuous' | 'prismatic';
  axis: [number, number, number];
  limit?: {lower: number; upper: number};
  mimic?: {joint: string; multiplier: number; offset: number};
};

export type ModelStats = {nodes: number; triangles: number; textures: number; animations: number};

export type ModelReport = {
  ref: string;
  size: number;
  nodes: string[];
  stats: ModelStats;
  joints: ModelJoint[];
  animations: string[];
  warnings: string[];
};

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const REF_PATTERN = /^sha256:[0-9a-f]{64}$/;
const NODE_NAME_PATTERN = /^[a-z0-9_]+$/;
const JOINT_TYPES = new Set(['revolute', 'continuous', 'prismatic']);
const COMPONENT_BYTES: Record<number, number> = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4};
const TYPE_COMPONENTS: Record<string, number> = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16};

type Json = Record<string, unknown>;

export const isModelRef = (value: unknown): value is string =>
  typeof value === 'string' && REF_PATTERN.test(value);

/** The reference of these exact bytes: `sha256:` and the hex digest. */
export const modelRef = async (bytes: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return (
    'sha256:' +
    Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  );
};

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isIndex = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

const items = (document: Json, key: string): Json[] => {
  const value = document[key] ?? [];
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new ModelRefused('bad_structure', `'${key}' must be a list of objects`);
  }
  return value;
};

const readChunks = (
  bytes: Uint8Array,
  policy: ModelPolicy,
): {document: Json; binaryOffset: number; binaryLength: number} => {
  if (bytes.byteLength < 20) {
    throw new ModelRefused('bad_header', 'the file is shorter than a GLB header and one chunk header');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== GLB_MAGIC) {
    throw new ModelRefused(
      'bad_header',
      'the file does not start with the glTF magic; only binary glTF (.glb) is shown',
    );
  }
  const version = view.getUint32(4, true);
  if (version !== 2) {
    throw new ModelRefused('bad_header', `the container version is ${version}, only 2 is supported`);
  }
  const declared = view.getUint32(8, true);
  if (declared !== bytes.byteLength) {
    throw new ModelRefused(
      'bad_header',
      `the header declares ${declared} bytes but the file has ${bytes.byteLength}`,
    );
  }
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== CHUNK_JSON) {
    throw new ModelRefused('bad_structure', 'the first chunk is not the JSON chunk');
  }
  if (jsonLength > policy.maxJson) {
    throw new ModelRefused(
      'bad_structure',
      `the JSON chunk is ${jsonLength} bytes, over the limit of ${policy.maxJson}`,
    );
  }
  const jsonEnd = 20 + jsonLength;
  if (jsonEnd > bytes.byteLength) {
    throw new ModelRefused('bad_structure', 'the JSON chunk runs past the end of the file');
  }
  let document: unknown;
  try {
    document = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes.subarray(20, jsonEnd)));
  } catch (error) {
    throw new ModelRefused('bad_structure', `the JSON chunk does not parse: ${(error as Error).message}`);
  }
  if (!isRecord(document)) {
    throw new ModelRefused('bad_structure', 'the JSON chunk is not an object');
  }
  const asset = document.asset;
  if (!isRecord(asset) || asset.version !== '2.0') {
    throw new ModelRefused('bad_structure', "asset.version must be '2.0'");
  }
  let binaryOffset = 0;
  let binaryLength = 0;
  if (jsonEnd < bytes.byteLength) {
    if (jsonEnd + 8 > bytes.byteLength) {
      throw new ModelRefused('bad_structure', 'a chunk header is cut off after the JSON chunk');
    }
    binaryLength = view.getUint32(jsonEnd, true);
    if (view.getUint32(jsonEnd + 4, true) !== CHUNK_BIN) {
      throw new ModelRefused('bad_structure', 'the chunk after the JSON chunk is not the binary chunk');
    }
    binaryOffset = jsonEnd + 8;
    if (binaryOffset + binaryLength > bytes.byteLength) {
      throw new ModelRefused('bad_structure', 'the binary chunk runs past the end of the file');
    }
  }
  return {document, binaryOffset, binaryLength};
};

const checkSelfContained = (document: Json): void => {
  for (const key of ['buffers', 'images']) {
    items(document, key).forEach((item, index) => {
      if ('uri' in item) {
        throw new ModelRefused(
          'external_reference',
          `${key}[${index}] has a uri; a model carries all its data in its binary chunk`,
        );
      }
    });
  }
};

const checkExtensions = (document: Json, policy: ModelPolicy, warnings: string[]): void => {
  const required = document.extensionsRequired ?? [];
  const used = document.extensionsUsed ?? [];
  if (!Array.isArray(required) || !Array.isArray(used)) {
    throw new ModelRefused('bad_structure', 'extensionsRequired and extensionsUsed must be lists');
  }
  const allowed = new Set(policy.extensions);
  const refused = [...new Set(required as string[])].filter(name => !allowed.has(name)).sort();
  if (refused.length) {
    throw new ModelRefused(
      'unsupported_extension',
      `the model requires extensions that are not allowed: ${refused.join(', ')}`,
    );
  }
  const ignored = [...new Set(used as string[])]
    .filter(name => !allowed.has(name) && !(required as string[]).includes(name))
    .sort();
  if (ignored.length) {
    warnings.push(`extensions used but not supported are ignored: ${ignored.join(', ')}`);
  }
};

const isFallbackBuffer = (buffer: Json): boolean => {
  const extensions = buffer.extensions;
  const meshopt = isRecord(extensions) ? extensions.EXT_meshopt_compression : undefined;
  return isRecord(meshopt) && meshopt.fallback === true;
};

const span = (item: Json, what: string): [number, number] => {
  const offset = item.byteOffset ?? 0;
  const length = item.byteLength;
  if (!isIndex(offset) || !isIndex(length)) {
    throw new ModelRefused(
      'bad_structure',
      `${what} needs a non-negative integer byteOffset and byteLength`,
    );
  }
  return [offset, length];
};

const checkBounds = (document: Json, binaryLength: number): void => {
  const buffers = items(document, 'buffers');
  const views = items(document, 'bufferViews');
  buffers.forEach((buffer, index) => {
    if (isFallbackBuffer(buffer)) return;
    if (index !== 0) {
      throw new ModelRefused(
        'bad_structure',
        `buffers[${index}] has no data: only the first buffer is the binary chunk`,
      );
    }
    const [, length] = span(buffer, 'buffers[0]');
    if (length > binaryLength) {
      throw new ModelRefused(
        'bad_structure',
        `buffers[0] declares ${length} bytes but the binary chunk has ${binaryLength}`,
      );
    }
  });
  const checkView = (what: string, source: Json): void => {
    const bufferIndex = source.buffer;
    if (!isIndex(bufferIndex) || bufferIndex >= buffers.length) {
      throw new ModelRefused('bad_structure', `${what} names a buffer that does not exist`);
    }
    const [offset, length] = span(source, what);
    if (offset + length > span(buffers[bufferIndex], `buffers[${bufferIndex}]`)[1]) {
      throw new ModelRefused('bad_structure', `${what} runs past the end of buffers[${bufferIndex}]`);
    }
  };
  views.forEach((view, index) => {
    checkView(`bufferViews[${index}]`, view);
    const extensions = view.extensions;
    const compressed = isRecord(extensions) ? extensions.EXT_meshopt_compression : undefined;
    if (isRecord(compressed)) checkView(`bufferViews[${index}] (compressed)`, compressed);
  });
  items(document, 'accessors').forEach((accessor, index) => {
    const count = accessor.count;
    if (!isIndex(count)) {
      throw new ModelRefused('bad_structure', `accessors[${index}] needs a non-negative integer count`);
    }
    const viewIndex = accessor.bufferView;
    if (viewIndex === undefined || viewIndex === null) return;
    if (!isIndex(viewIndex) || viewIndex >= views.length) {
      throw new ModelRefused('bad_structure', `accessors[${index}] names a bufferView that does not exist`);
    }
    const component = COMPONENT_BYTES[accessor.componentType as number];
    const components = TYPE_COMPONENTS[accessor.type as string];
    if (!component || !components) {
      throw new ModelRefused('bad_structure', `accessors[${index}] has an unknown componentType or type`);
    }
    const element = component * components;
    const view = views[viewIndex];
    const stride = view.byteStride ?? element;
    const offset = accessor.byteOffset ?? 0;
    if (!isIndex(stride) || !isIndex(offset)) {
      throw new ModelRefused('bad_structure', `accessors[${index}] has an invalid byteOffset or byteStride`);
    }
    const needed = offset + (count ? stride * (count - 1) + element : 0);
    if (needed > span(view, `bufferViews[${viewIndex}]`)[1]) {
      throw new ModelRefused(
        'bad_structure',
        `accessors[${index}] runs past the end of bufferViews[${viewIndex}]`,
      );
    }
  });
};

const nodeNames = (document: Json, warnings: string[]): Set<string> => {
  const names = new Set<string>();
  const repeated = new Set<string>();
  const unconventional = new Set<string>();
  for (const node of items(document, 'nodes')) {
    const name = node.name;
    if (typeof name !== 'string' || !name) continue;
    if (names.has(name)) repeated.add(name);
    names.add(name);
    if (!NODE_NAME_PATTERN.test(name)) unconventional.add(name);
  }
  if (repeated.size) {
    warnings.push(`node names used more than once cannot be bound reliably: ${[...repeated].sort().join(', ')}`);
  }
  if (unconventional.size) {
    warnings.push(`node names outside [a-z0-9_]+: ${[...unconventional].sort().join(', ')}`);
  }
  return names;
};

const readJoints = (document: Json, names: Set<string>): ModelJoint[] => {
  const extras = document.extras;
  const arkitekt = isRecord(extras) ? extras.arkitekt : undefined;
  if (arkitekt === undefined || arkitekt === null) return [];
  const fail = (message: string) => new ModelRefused('bad_extras', `extras.arkitekt: ${message}`);
  if (!isRecord(arkitekt)) throw fail('must be an object');
  if (arkitekt.version !== 1) throw fail(`version ${JSON.stringify(arkitekt.version)} is not supported, only 1`);
  const joints = arkitekt.joints ?? [];
  if (!Array.isArray(joints)) throw fail('joints must be a list');
  if (arkitekt.source !== undefined && arkitekt.source !== null && !isModelRef(arkitekt.source)) {
    throw fail('source must be a sha256: reference');
  }
  const jointNames = new Set<string>();
  const driven = new Set<string>();
  const parsed: ModelJoint[] = [];
  joints.forEach((joint, index) => {
    if (!isRecord(joint)) throw fail(`joints[${index}] must be an object`);
    const {name, node, type, axis, limit} = joint;
    if (typeof name !== 'string' || !name) throw fail(`joints[${index}] needs a name`);
    if (jointNames.has(name)) throw fail(`joint '${name}' is defined twice`);
    jointNames.add(name);
    if (typeof node !== 'string' || !names.has(node)) {
      throw fail(`joint '${name}' drives node ${JSON.stringify(node)}, which the model does not have`);
    }
    if (driven.has(node)) throw fail(`node '${node}' is driven by more than one joint`);
    driven.add(node);
    if (typeof type !== 'string' || !JOINT_TYPES.has(type)) {
      throw fail(`joint '${name}' has type ${JSON.stringify(type)}; supported are continuous, prismatic, revolute`);
    }
    if (!Array.isArray(axis) || axis.length !== 3 || !axis.every(isNumber)) {
      throw fail(`joint '${name}' needs an axis of three numbers`);
    }
    if (Math.abs(Math.hypot(...(axis as number[])) - 1) > 1e-3) {
      throw fail(`the axis of joint '${name}' is not a unit vector`);
    }
    const entry: ModelJoint = {
      name,
      node,
      type: type as ModelJoint['type'],
      axis: axis as [number, number, number],
    };
    if (type === 'continuous') {
      if (limit !== undefined && limit !== null) throw fail(`continuous joint '${name}' has no limit`);
    } else {
      if (!isRecord(limit) || !isNumber(limit.lower) || !isNumber(limit.upper)) {
        throw fail(`joint '${name}' needs a limit with lower and upper`);
      }
      if (limit.lower > limit.upper) throw fail(`the limit of joint '${name}' has lower above upper`);
      entry.limit = {lower: limit.lower, upper: limit.upper};
    }
    parsed.push(entry);
  });
  joints.forEach((joint, index) => {
    const mimic = (joint as Json).mimic;
    if (mimic === undefined || mimic === null) return;
    const name = parsed[index].name;
    const multiplier = isRecord(mimic) ? (mimic.multiplier ?? 1) : undefined;
    const offset = isRecord(mimic) ? (mimic.offset ?? 0) : undefined;
    if (!isRecord(mimic) || !isNumber(multiplier) || !isNumber(offset)) {
      throw fail(`the mimic of joint '${name}' needs a numeric multiplier and offset`);
    }
    if (typeof mimic.joint !== 'string' || !jointNames.has(mimic.joint) || mimic.joint === name) {
      throw fail(
        `joint '${name}' mimics ${JSON.stringify(mimic.joint)}, which is not another joint of this model`,
      );
    }
    parsed[index].mimic = {joint: mimic.joint, multiplier, offset};
  });
  return parsed;
};

const readStats = (document: Json): ModelStats => {
  const accessors = items(document, 'accessors');
  const countOf = (index: unknown): number => {
    if (!isIndex(index) || index >= accessors.length) {
      throw new ModelRefused('bad_structure', 'a mesh primitive names an accessor that does not exist');
    }
    return Number(accessors[index].count ?? 0);
  };
  let triangles = 0;
  for (const mesh of items(document, 'meshes')) {
    const primitives = mesh.primitives ?? [];
    if (!Array.isArray(primitives)) {
      throw new ModelRefused('bad_structure', 'mesh primitives must be a list');
    }
    for (const primitive of primitives) {
      if (!isRecord(primitive)) {
        throw new ModelRefused('bad_structure', 'a mesh primitive must be an object');
      }
      const mode = primitive.mode ?? 4;
      if (mode !== 4 && mode !== 5 && mode !== 6) continue;
      const attributes = primitive.attributes;
      let vertices: number;
      if ('indices' in primitive) vertices = countOf(primitive.indices);
      else if (isRecord(attributes) && 'POSITION' in attributes) vertices = countOf(attributes.POSITION);
      else continue;
      triangles += mode === 4 ? Math.floor(vertices / 3) : Math.max(vertices - 2, 0);
    }
  }
  return {
    nodes: items(document, 'nodes').length,
    triangles,
    textures: items(document, 'images').length,
    animations: items(document, 'animations').length,
  };
};

/** Width and height from a PNG, JPEG or WebP header; `null` for anything else. */
export const imageSize = (bytes: Uint8Array): {width: number; height: number} | null => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) {
    return {width: view.getUint32(16), height: view.getUint32(20)};
  }
  if (bytes.byteLength >= 4 && view.getUint16(0) === 0xffd8) {
    let offset = 2;
    while (offset + 9 < bytes.byteLength) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      const length = view.getUint16(offset + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) return {width: view.getUint16(offset + 7), height: view.getUint16(offset + 5)};
      offset += 2 + length;
    }
    return null;
  }
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (bytes.byteLength >= 30 && tag(0) === 'RIFF' && tag(8) === 'WEBP') {
    const format = tag(12);
    if (format === 'VP8X') {
      return {
        width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
        height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)),
      };
    }
    if (format === 'VP8 ') {
      return {width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff};
    }
    if (format === 'VP8L') {
      const bits = view.getUint32(21, true);
      return {width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff)};
    }
  }
  return null;
};

const checkTextures = (
  document: Json,
  bytes: Uint8Array,
  binaryOffset: number,
  policy: ModelPolicy,
  warnings: string[],
): void => {
  const views = items(document, 'bufferViews');
  let memory = 0;
  items(document, 'images').forEach((image, index) => {
    const viewIndex = image.bufferView;
    if (!isIndex(viewIndex) || viewIndex >= views.length) {
      throw new ModelRefused('bad_structure', `images[${index}] names a bufferView that does not exist`);
    }
    const [offset, length] = span(views[viewIndex], `bufferViews[${viewIndex}]`);
    const size = imageSize(bytes.subarray(binaryOffset + offset, binaryOffset + offset + length));
    if (size === null) {
      warnings.push(`images[${index}] is not a PNG, JPEG or WebP whose size can be read`);
      return;
    }
    if (size.width > policy.maxTextureSize || size.height > policy.maxTextureSize) {
      throw new ModelRefused(
        'over_budget',
        `images[${index}] is ${size.width} x ${size.height}, over the limit of ${policy.maxTextureSize} px per side`,
      );
    }
    memory += size.width * size.height * 4;
  });
  if (memory > policy.maxTextureMemory) {
    throw new ModelRefused(
      'over_budget',
      `textures decode to ${memory} bytes, over the limit of ${policy.maxTextureMemory}`,
    );
  }
};

/** Whether stored stats still fit a (possibly tightened) policy. */
export const statsExceedPolicy = (stats: ModelStats, policy: ModelPolicy): string | null => {
  const checks: Array<[string, number, number]> = [
    ['nodes', stats.nodes, policy.maxNodes],
    ['triangles', stats.triangles, policy.maxTriangles],
    ['animation clips', stats.animations, policy.maxAnimations],
  ];
  for (const [what, value, limit] of checks) {
    if (value > limit) return `the model has ${value} ${what}, over the limit of ${limit}`;
  }
  return null;
};

/**
 * Check `bytes` against `ref` and `policy`. Returns what the model contains,
 * or throws `ModelRefused`.
 */
export const validateModel = async (
  bytes: Uint8Array,
  ref: string,
  policy: ModelPolicy = DEFAULT_MODEL_POLICY,
): Promise<ModelReport> => {
  if (!isModelRef(ref)) {
    throw new ModelRefused(
      'bad_reference',
      `a model reference is 'sha256:' and 64 lowercase hex characters, not ${JSON.stringify(ref)}`,
    );
  }
  if (bytes.byteLength > policy.maxSize) {
    throw new ModelRefused(
      'too_large',
      `the model is ${bytes.byteLength} bytes, over the limit of ${policy.maxSize}`,
    );
  }
  const actual = await modelRef(bytes);
  if (actual !== ref) {
    throw new ModelRefused('hash_mismatch', `the bytes are ${actual}, not ${ref}`);
  }
  const {document, binaryOffset, binaryLength} = readChunks(bytes, policy);
  const warnings: string[] = [];
  checkSelfContained(document);
  checkExtensions(document, policy, warnings);
  checkBounds(document, binaryLength);
  const names = nodeNames(document, warnings);
  const joints = readJoints(document, names);
  const stats = readStats(document);
  const exceeded = statsExceedPolicy(stats, policy);
  if (exceeded) throw new ModelRefused('over_budget', exceeded);
  checkTextures(document, bytes, binaryOffset, policy, warnings);
  return {
    ref,
    size: bytes.byteLength,
    nodes: [...names].sort(),
    stats,
    joints,
    animations: items(document, 'animations')
      .map(animation => animation.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0),
    warnings,
  };
};
