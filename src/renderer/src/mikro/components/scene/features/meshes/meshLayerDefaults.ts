import { MeshShading } from "@/mikro/api/graphql";

/**
 * The session's `flatNormals` for a mesh layer that has not been toggled:
 * seeded from the STORED shading. A layer registered as SMOOTH (the mesh
 * designer commits that way — its collections are single-cell, so per-cell
 * normals are exact) starts smooth; anything else, or no shading at all,
 * starts flat, the honest default for a decimated segmentation.
 */
export const effectiveFlatNormals = (layer: {
  flatNormals?: boolean;
  shading?: MeshShading | null;
}): boolean => layer.flatNormals ?? !(layer.shading && layer.shading !== MeshShading.Flat);
