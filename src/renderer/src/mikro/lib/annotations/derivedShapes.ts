/**
 * Which shapes of a collection's list are made from other shapes of it.
 *
 * A refinement (a path smoothed, a rectangle converted to a polygon, the pieces
 * a shape was split into) is its own annotation naming its sources
 * (`sourceIds`, the server's `AnnotationDerivation` rows). Drawn beside its
 * source it doubles every outline, so a layer hides it by default
 * (`SceneLayer.showDerivedAnnotations`) and draws it as an overlay while its
 * source's card is open.
 *
 * "Derived" means: one of its sources is in THIS list. A shape made from a shape
 * in another collection stays visible in its own layer — hidden there, nothing
 * would ever bring it back. A source cannot be deleted while its children stand
 * (the server refuses), so there are no orphans to hide by mistake.
 */

export type DerivableShape = { id: string; sourceIds: readonly string[] };

export type DerivedPartition<T extends DerivableShape> = {
  /** Shapes no other shape of the list was a source of — what a layer draws by default. */
  roots: T[];
  /** Shapes made from a shape of the same list. */
  derived: T[];
  /** Source id → the shapes of the list made from it, in list order. */
  childrenOf: ReadonlyMap<string, readonly T[]>;
};

export function partitionDerived<T extends DerivableShape>(shapes: readonly T[]): DerivedPartition<T> {
  const ids = new Set(shapes.map((shape) => shape.id));
  const roots: T[] = [];
  const derived: T[] = [];
  const childrenOf = new Map<string, T[]>();
  for (const shape of shapes) {
    const local = shape.sourceIds.filter((id) => ids.has(id) && id !== shape.id);
    if (local.length === 0) {
      roots.push(shape);
      continue;
    }
    derived.push(shape);
    for (const source of local) {
      const children = childrenOf.get(source);
      if (children) children.push(shape);
      else childrenOf.set(source, [shape]);
    }
  }
  return { roots, derived, childrenOf };
}

/**
 * Everything made from `id`, transitively: a refinement of a refinement too,
 * since the middle one is hidden and could never be hovered to reveal the last.
 * Nearest first; each once; cycle-safe.
 */
export function descendantsOf<T extends DerivableShape>(id: string, childrenOf: ReadonlyMap<string, readonly T[]>): T[] {
  const seen = new Set<string>([id]);
  const found: T[] = [];
  let frontier = [id];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const current of frontier) {
      for (const child of childrenOf.get(current) ?? []) {
        if (seen.has(child.id)) continue;
        seen.add(child.id);
        found.push(child);
        next.push(child.id);
      }
    }
    frontier = next;
  }
  return found;
}
