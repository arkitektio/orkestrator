/** A mesh object's id, `<collection>:<object>` (what `MeshObject.id` answers), as `meshObject(collection:, object:)`'s two arguments; null when it is not one. */
export const parseMeshObjectId = (id: string): { collection: string; object: number } | null => {
  const at = id.lastIndexOf(":");
  if (at <= 0) return null;
  const tail = id.slice(at + 1);
  if (!/^-?\d+$/.test(tail)) return null;
  return { collection: id.slice(0, at), object: Number(tail) };
};
