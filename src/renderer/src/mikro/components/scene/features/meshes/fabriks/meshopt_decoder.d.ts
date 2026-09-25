// three ships meshopt_decoder.module.js without a .d.ts (unlike e.g.
// OBJLoader). Surface only what `meshDecode.MeshoptDecoderLike` consumes.
declare module "three/examples/jsm/libs/meshopt_decoder.module.js" {
  export const MeshoptDecoder: {
    ready: Promise<void>;
    supported: boolean;
    decodeVertexBuffer(
      target: Uint8Array,
      count: number,
      size: number,
      source: Uint8Array,
      filter?: string,
    ): void;
    decodeIndexBuffer(
      target: Uint8Array,
      count: number,
      size: number,
      source: Uint8Array,
    ): void;
    decodeGltfBuffer(
      target: Uint8Array,
      count: number,
      size: number,
      source: Uint8Array,
      mode: string,
      filter?: string,
    ): void;
  };
}
