/**
 * Coordinate helpers for the editor. The React Flow instance is only ever
 * used here, and only for screen<->flow conversion; the graph itself always
 * comes from the store.
 */
import { FlowEdge, FlowNode, RelativePosition } from "@/fluss/types";
import type { ReactFlowInstance, XYPosition } from "@xyflow/react";

export type Point = { x: number; y: number };

export const getClientPoint = (event: MouseEvent | TouchEvent): Point | null => {
  if ("touches" in event && event.touches.length > 0) {
    return { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
  if ("changedTouches" in event && event.changedTouches.length > 0) {
    return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
  }
  if ("clientX" in event) {
    return { x: event.clientX, y: event.clientY };
  }
  return null;
};

/** Client point -> position relative to the flow wrapper element (for panels). */
export const toWrapperPosition = (wrapper: DOMRect, client: Point): Point => ({
  x: client.x - wrapper.left,
  y: client.y - wrapper.top,
});

const DEFAULT_NODE_SIZE = { width: 200, height: 100 };

export const nodeSize = (node: FlowNode) => ({
  width: node.measured?.width ?? node.width ?? DEFAULT_NODE_SIZE.width,
  height: node.measured?.height ?? node.height ?? DEFAULT_NODE_SIZE.height,
});

export const nodeCenter = (node: FlowNode): XYPosition => {
  const { width, height } = nodeSize(node);
  return { x: node.position.x + width / 2, y: node.position.y + height / 2 };
};

/** Flow-space midpoint between the centres of two nodes. */
export const midpointBetween = (a: FlowNode, b: FlowNode): XYPosition => {
  const ca = nodeCenter(a);
  const cb = nodeCenter(b);
  return { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 };
};

/** The agent subflow wrapper (if any) whose box contains `flowPoint`. */
export const subflowAt = (nodes: readonly FlowNode[], flowPoint: XYPosition): FlowNode | undefined =>
  nodes.find((node) => {
    if (node.type !== "AgentSubFlowNode") return false;
    const width = node.measured?.width ?? node.width ?? 0;
    const height = node.measured?.height ?? node.height ?? 0;
    if (width <= 0 || height <= 0) return false;
    return (
      flowPoint.x >= node.position.x &&
      flowPoint.x <= node.position.x + width &&
      flowPoint.y >= node.position.y &&
      flowPoint.y <= node.position.y + height
    );
  });

/** Quadrant of `drop` relative to `origin`, both in the same space. */
export const relativePositionOf = (origin: Point, drop: Point): RelativePosition => {
  if (origin.x < drop.x) return origin.y < drop.y ? "bottomright" : "topright";
  return origin.y < drop.y ? "bottomleft" : "topleft";
};

/** Flow position -> position relative to a subflow wrapper's origin. */
export const positionInSubflow = (flowPosition: XYPosition, subflow: FlowNode): XYPosition => ({
  x: flowPosition.x - subflow.position.x,
  y: flowPosition.y - subflow.position.y,
});

type Instance = ReactFlowInstance<FlowNode, FlowEdge> | null;

export const screenToFlow = (instance: Instance, client: Point): XYPosition | null =>
  instance?.screenToFlowPosition(client) ?? null;

export const flowToScreen = (instance: Instance, flow: XYPosition): Point | null =>
  instance?.flowToScreenPosition(flow) ?? null;
