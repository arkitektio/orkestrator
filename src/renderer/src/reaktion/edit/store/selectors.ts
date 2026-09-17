/**
 * Derived lookup maps, rebuilt once per store write so per-node hooks are
 * O(1) map lookups with stable references instead of a `.filter` over the
 * whole error/node list in every node on every write.
 */
import { FlowNode } from "@/reaktion/types";
import { ValidationError } from "@/reaktion/validation/types";

export const EMPTY_ERRORS: readonly ValidationError[] = Object.freeze([]);

export type DerivedIndexes = {
  nodeById: ReadonlyMap<string, FlowNode>;
  errorsByNodeId: ReadonlyMap<string, readonly ValidationError[]>;
  errorsByEdgeId: ReadonlyMap<string, readonly ValidationError[]>;
  childCountByParent: ReadonlyMap<string, number>;
};

export const deriveNodeIndexes = (
  nodes: readonly FlowNode[],
): Pick<DerivedIndexes, "nodeById" | "childCountByParent"> => {
  const nodeById = new Map<string, FlowNode>();
  const childCountByParent = new Map<string, number>();
  for (const node of nodes) {
    nodeById.set(node.id, node);
    if (node.parentId) {
      childCountByParent.set(node.parentId, (childCountByParent.get(node.parentId) ?? 0) + 1);
    }
  }
  return { nodeById, childCountByParent };
};

export const deriveErrorIndexes = (
  errors: readonly ValidationError[],
): Pick<DerivedIndexes, "errorsByNodeId" | "errorsByEdgeId"> => {
  const errorsByNodeId = new Map<string, ValidationError[]>();
  const errorsByEdgeId = new Map<string, ValidationError[]>();
  for (const error of errors) {
    const target =
      error.type === "node" ? errorsByNodeId : error.type === "edge" ? errorsByEdgeId : null;
    if (!target) continue;
    const list = target.get(error.id);
    if (list) list.push(error);
    else target.set(error.id, [error]);
  }
  return { errorsByNodeId, errorsByEdgeId };
};

export const deriveIndexes = (
  nodes: readonly FlowNode[],
  errors: readonly ValidationError[],
): DerivedIndexes => ({ ...deriveNodeIndexes(nodes), ...deriveErrorIndexes(errors) });
