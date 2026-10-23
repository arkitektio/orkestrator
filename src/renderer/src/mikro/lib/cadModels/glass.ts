import * as THREE from "three";

/**
 * Transmissive glass, drawn as blended glass.
 *
 * glTF glass usually arrives as `KHR_materials_transmission`: an OPAQUE
 * material that refracts what is behind it. three implements that by copying
 * the framebuffer drawn so far and sampling it through the surface. Neither
 * viewer here has anything in that copy: the canvas is transparent (the page
 * behind it is the background), and the scene's volumes are composited AFTER
 * the transmission pass. So the copy is transparent black, and real
 * transmission draws the glass dark — the more transmissive, the darker.
 *
 * Instead the material becomes what glass looks like without a backdrop to
 * bend: a tinted see-through surface. Alpha falls as transmission rises
 * (fully transmissive glass keeps `MIN_GLASS_ALPHA`, so its surface still
 * reads), and the tint is the base colour times the volume's attenuation
 * colour, which is where an exporter puts the green of a glass edge.
 *
 * Mutates `material`: call it on a clone, never on a file's shared material.
 */
export const MIN_GLASS_ALPHA = 0.12;

export const isTransmissive = (material: THREE.Material): boolean =>
  ((material as THREE.MeshPhysicalMaterial).transmission ?? 0) > 0;

export const asBlendedGlass = (material: THREE.Material): void => {
  const glass = material as THREE.MeshPhysicalMaterial;
  if (!isTransmissive(glass)) return;
  const transmission = Math.min(glass.transmission, 1);
  if (glass.attenuationColor) glass.color.multiply(glass.attenuationColor);
  glass.opacity *= 1 - transmission * (1 - MIN_GLASS_ALPHA);
  glass.transmission = 0;
  glass.transparent = true;
  glass.depthWrite = false;
  glass.needsUpdate = true;
};

/**
 * A view's own copy of a loaded model: the scene graph cloned and every
 * material cloned, transmissive glass drawn as blended glass. The cache's
 * file stays untouched; the returned `dispose` frees only the clones.
 */
export const cloneForView = (root: THREE.Object3D): { root: THREE.Object3D; dispose: () => void } => {
  const copy = root.clone(true);
  const clones: THREE.Material[] = [];
  copy.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh !== true || !mesh.material) return;
    const own = (source: THREE.Material) => {
      const material = source.clone();
      asBlendedGlass(material);
      clones.push(material);
      return material;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
  });
  return { root: copy, dispose: () => clones.forEach((material) => material.dispose()) };
};
