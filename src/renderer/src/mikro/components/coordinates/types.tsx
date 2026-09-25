import {
  CoordinateSystemFragment,
  LeafTransformationFragment,
  TransformationFragment,
} from "@/mikro/api/graphql";
import { Edge, Node } from "@xyflow/react";

/**
 * Composites expand only to a fixed depth, so their children come back as
 * LEAF fragments — same kinds, minus the nested `transformations`. Both are
 * describable, so the describer takes either.
 */
export type AnyTransformation =
  | TransformationFragment
  | LeafTransformationFragment;

export type CoordinateSystemNodeData = {
  system: CoordinateSystemFragment;
  /** The system the walk started from — drawn as the anchor of the component. */
  isRoot: boolean;
};

export type CoordinateSystemNode = Node<
  CoordinateSystemNodeData,
  "coordinateSystem"
>;

export type ResidentNodeData = {
  resident: CoordinateSystemFragment["residents"][number];
  /** The space it lives in — the node it hangs off. */
  systemId: string;
};

/**
 * Who lives in a space, drawn as its own node.
 *
 * The alternative — a list of names inside the system's card — makes the most
 * important thing about a space the smallest text on it, and gives a dataset no
 * place of its own in a picture that is otherwise about where things sit. As
 * nodes, residency is structure: you can see which grid a dataset lives in, and
 * a space with nothing attached is visibly the pure reference frame.
 */
export type ResidentNode = Node<ResidentNodeData, "resident">;

export type GraphNode = CoordinateSystemNode | ResidentNode;

/** Plain connectors: transformations carry a label, residency does not. */
export type GraphEdge = Edge;

/**
 * A one-line summary of what an edge actually does. The graph query returns
 * every edge in its true stored direction and composes nothing, so this reads
 * the concrete per-kind payload rather than any resolved matrix.
 */
export const describeTransformation = (
  transformation: AnyTransformation,
): string => {
  const childCount = (composite: AnyTransformation) =>
    "transformations" in composite ? composite.transformations.length : 0;

  const fmt = (n: number) =>
    Number.isInteger(n) ? `${n}` : n.toPrecision(3).replace(/0+$/, "");

  switch (transformation.__typename) {
    case "ScaleTransformation":
      return `scale ${transformation.scale.map(fmt).join(" · ")}`;
    case "TranslationTransformation":
      return `translate ${transformation.translation.map(fmt).join(" · ")}`;
    case "AffineTransformation":
      return `affine ${transformation.outputAxes.length}×${transformation.inputAxes.length}`;
    case "RotationTransformation":
      return `rotation ${transformation.outputAxes.length}×${transformation.inputAxes.length}`;
    case "IdentityTransformation":
      return "identity";
    case "MapAxisTransformation":
      return `map ${transformation.inputAxes.join(",")} → ${transformation.outputAxes.join(",")}`;
    // Was DISPLACEMENTS + COORDINATES, now one edge: what the numbers mean is
    // the field's business, so name the field rather than guess the flavour.
    case "FieldTransformation":
      return transformation.field?.name
        ? `field — ${transformation.field.name}`
        : "field";
    // Not a map at all: a declared non-correspondence. The reason is the whole
    // content of the edge, so it is what gets shown.
    case "UnmappableTransformation":
      return transformation.reason
        ? `unmappable — ${transformation.reason}`
        : "unmappable";
    case "SequenceTransformation":
      return `sequence of ${childCount(transformation)}`;
    case "ByDimensionTransformation":
      return `by dimension (${childCount(transformation)})`;
  }
};
