/** A GLB container around `document` and `binary`, padded as the format requires. */
export const buildGlb = (document: Record<string, unknown>, binary: Uint8Array = new Uint8Array()): Uint8Array => {
  const pad = (bytes: Uint8Array, fill: number): Uint8Array => {
    const padded = new Uint8Array(bytes.length + ((4 - (bytes.length % 4)) % 4)).fill(fill);
    padded.set(bytes);
    return padded;
  };
  const json = pad(new TextEncoder().encode(JSON.stringify(document)), 0x20);
  const bin = pad(binary, 0);
  const total = 12 + 8 + json.length + (bin.length ? 8 + bin.length : 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, json.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(json, 20);
  if (bin.length) {
    view.setUint32(20 + json.length, bin.length, true);
    view.setUint32(24 + json.length, 0x004e4942, true);
    out.set(bin, 28 + json.length);
  }
  return out;
};

/** One triangle on a node called `stage_x`, beside an empty `turret`. */
export const triangleModel = (
  extra: Record<string, unknown> = {},
): [Record<string, unknown>, Uint8Array] => {
  const binary = new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer);
  return [
    {
      asset: {version: '2.0'},
      buffers: [{byteLength: binary.length}],
      bufferViews: [{buffer: 0, byteOffset: 0, byteLength: binary.length}],
      accessors: [{bufferView: 0, componentType: 5126, count: 3, type: 'VEC3'}],
      meshes: [{primitives: [{attributes: {POSITION: 0}}]}],
      nodes: [{name: 'stage_x', mesh: 0}, {name: 'turret'}],
      ...extra,
    },
    binary,
  ];
};

/** A PNG header declaring `width` x `height` (no pixel data). */
export const pngHeader = (width: number, height: number): Uint8Array => {
  const bytes = new Uint8Array(24);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x89504e47);
  view.setUint32(4, 0x0d0a1a0a);
  view.setUint32(8, 13);
  view.setUint32(12, 0x49484452);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
};
