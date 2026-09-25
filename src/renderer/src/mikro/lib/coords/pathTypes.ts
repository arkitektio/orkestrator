import type { TransformLike } from "@/core/lib/scene/coords/transformGraph";

/**
 * Path-step types shared by coordinate mapping (`axisPath`) and the
 * attribute-plan model. Structural subsets of the generated transformation
 * fragments (the `TransformLike` convention) — nothing here is
 * attribute-specific, so coordinate consumers never import plan types.
 */

/** A path-step transformation: the shared shape plus the cache-key fields. */
export type PathTransformLike = NonNullable<TransformLike> & {
  id?: string;
  version?: number;
};

/** One step from a source system toward the path's root (pathToWorld contract). */
export type PathStep = {
  transformation: PathTransformLike | null;
  /** Walk the edge output→input: invert it before composing. */
  inverted: boolean;
};
