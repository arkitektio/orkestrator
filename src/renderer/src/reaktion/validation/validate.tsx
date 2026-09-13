import { GraphNodeKind } from "@/reaktion/api/graphql";
import { buildZodSchema } from "@/rekuest/widgets/utils";
import { ZodError } from "zod";
import { FlowEdge, FlowNode } from "../types";
import { SolvedError, ValidationError, ValidationResult } from "./types";
import { PortKind } from "@/rekuest/api/graphql";

const handleToStream = (sourceHandle: string | null | undefined): number => {
  if (!sourceHandle) return -1;
  const parts = sourceHandle.split("_");
  return parseInt(parts[parts.length - 1]);
};

const validateMatchingPorts = (
  previous: ValidationResult,
): Partial<ValidationResult> => {
  const validatedEdges: FlowEdge[] = [];
  const solvedErrors: SolvedError[] = previous.solvedErrors;
  const remain: ValidationError[] = [];

  for (const edge of previous.edges) {
    const sourceNode = previous.nodes.find((n) => n.id == edge.source);
    const targetNode = previous.nodes.find((n) => n.id == edge.target);

    const sourceStreamIndex = handleToStream(edge.sourceHandle);
    const targetStreamIndex = handleToStream(edge.targetHandle);

    const sourceStream = sourceNode?.data.outs.at(sourceStreamIndex);
    const targetStream = targetNode?.data.ins.at(targetStreamIndex);

    if (sourceStream == undefined || targetStream == undefined) {
      solvedErrors.push({
        type: "edge",
        id: edge.id,
        level: "critical",
        message: "Edge with non existing handles. This is bad",
        solvedBy: "Removing the edge",
      });
      continue;
    }

    if (sourceStream.length != targetStream.length) {
      solvedErrors.push({
        type: "edge",
        id: edge.id,
        level: "warning",
        message: "Connecting edge does not have correct number of ports",
        solvedBy: "Removing the edge",
      });
      continue;
    }

    let streamsMatch = true;

    for (
      let sourceItemIndex = 0;
      sourceItemIndex < sourceStream.length;
      sourceItemIndex++
    ) {
      if (
        sourceStream[sourceItemIndex].kind != targetStream[sourceItemIndex].kind
      ) {
        solvedErrors.push({
          type: "edge",
          id: edge.id,
          comparing: {
            sourceItemIndex,
            sourceStreamIndex,
            targetItemIndex: sourceItemIndex,
            targetStreamIndex,
          },
          level: "warning",
          message: "Port Kind mismatch",
          solvedBy: "Removing the edge",
        });
        streamsMatch = false;
      }
      if (
        sourceStream[sourceItemIndex].identifier !=
        targetStream[sourceItemIndex].identifier
      ) {
        solvedErrors.push({
          type: "edge",
          id: edge.id,
          comparing: {
            sourceItemIndex,
            sourceStreamIndex,
            targetItemIndex: sourceItemIndex,
            targetStreamIndex,
          },
          level: "warning",
          message: "Port Identifier mismatch",
          solvedBy: "Removing the edge",
        });
        streamsMatch = false;
      }
    }

    if (!streamsMatch) continue;
    validatedEdges.push(edge);
  }

  return {
    ...previous,
    edges: validatedEdges,
    solvedErrors: solvedErrors,
    remainingErrors: remain,
  };
};

const validateNoUnconnectedNodes = (
  previous: ValidationResult,
): Partial<ValidationResult> => {
  const remain: ValidationError[] = previous.remainingErrors;

  for (const node of previous.nodes.filter(x => x.type != "AgentSubFlowNode")) {
    const targetEdge = previous.edges.find((n) => n.target == node.id);
    const sourceEdge = previous.edges.find((n) => n.source == node.id);

    if (targetEdge == undefined && sourceEdge == undefined) {
      console.log("Node with no ins and outs", node);
      remain.push({
        type: "node",
        id: node.id,
        level: "critical",
        message: "Node with no ins and outs. This is bad",
      });
      continue;
    }
  }

  return {
    ...previous,
    remainingErrors: remain,
  };
};

function validateGraphIsConnected(previous: ValidationResult) {
  const remain: ValidationError[] = previous.remainingErrors;
  const nodes = previous.nodes.filter(n => n.type != "AgentSubFlowNode");
  const edges = previous.edges;

  const adjacencyList: { [key: string]: string[] } = {};

  // Initialize adjacency list with empty arrays for each node
  nodes.forEach((node) => {
    adjacencyList[node.id] = [];
  });

  // Populate adjacency list with edges
  edges.forEach((edge) => {
    adjacencyList[edge.source].push(edge.target);
    // If it's an undirected graph, add the edge in the reverse direction as well
    adjacencyList[edge.target].push(edge.source);
  });

  // Depth-First Search to check for connectivity
  function dfs(visited: Set<string>, nodeId: string): void {
    visited.add(nodeId);
    adjacencyList[nodeId].forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        dfs(visited, neighbor);
      }
    });
  }

  const visited = new Set<string>();
  dfs(visited, nodes[0].id); // Start DFS from the first node

  // If the number of visited nodes is the same as the number of nodes, the graph is connected
  if (visited.size !== nodes.length) {
    remain.push({
      type: "graph",
      id: "",
      level: "critical",
      message:
        "Subgraphs exist. Please create at least one connection between all nodes",
    });
  }

  return {
    ...previous,
    remainingErrors: remain,
  };
}

function atLeastOneNode(previous: ValidationResult) {
  const remain: ValidationError[] = previous.remainingErrors;
  const nodes = previous.nodes;
  // If the number of visited nodes is the same as the number of nodes, the graph is connected
  if (!nodes.find((n) => n.data.kind == GraphNodeKind.Args)) {
    remain.push({
      type: "graph",
      id: "",
      level: "critical",
      message: "You need an Args node",
    });
  }

  if (!nodes.find((n) => n.data.kind == GraphNodeKind.Returns)) {
    remain.push({
      type: "graph",
      id: "",
      level: "critical",
      message: "You need an Return node",
    });
  }

  if (
    nodes.filter(
      (n) =>
        n.data.kind != GraphNodeKind.Returns &&
        n.data.kind != GraphNodeKind.Args,
    ).length == 0
  ) {
    remain.push({
      type: "graph",
      id: "",
      level: "critical",
      message: "Very funny. You need at least one node",
    });
  }

  return {
    ...previous,
    remainingErrors: remain,
  };
}

function noDoubleEdgeForOutput(previous: ValidationResult) {
  const solved: SolvedError[] = previous.solvedErrors;
  const remain: ValidationError[] = previous.remainingErrors;
  const nodes = previous.nodes;
  const edges = previous.edges;
  // If the number of visited nodes is the same as the number of nodes, the graph is connected

  const returnNode = nodes.find((n) => n.data.kind == GraphNodeKind.Returns);
  if (!returnNode) {
    remain.push({
      type: "graph",
      id: "",
      level: "critical",
      message: "You need an Return node",
    });
  }

  const returnEdges = edges.filter((e) => e.target == returnNode?.id);

  if (returnEdges.length > 1) {
    solved.push({
      type: "graph",
      id: "",
      level: "critical",
      message:
        "You can only have one edge to the return node: Mabye merge them before sending them to the return node? We will remove the other edges",
      solvedBy: "Removing the other edges",
    });
  }

  const newEdges = edges
    .filter((e) => e.target != returnNode?.id)
    .concat(returnEdges.length > 0 ? [returnEdges[0]] : []);

  return {
    ...previous,
    edges: newEdges,
    remainingErrors: remain,
    solvedErrors: solved,
  };
}

function validateMemoryStructuresSameSubflow(previous: ValidationResult) {
  const remain: ValidationError[] = previous.remainingErrors;
  const nodes = previous.nodes.filter(n => n.parentId != null);
  const edges = previous.edges;

  const hasMemoryStructure = (node: FlowNode): boolean => {
    return !!(
      node.data.ins?.find((stream) =>
        stream && stream.length && stream.find((item) => item.kind === PortKind.MemoryStructure),
      ) ||
      node.data.outs?.find((stream) =>
        stream && stream.length && stream.find((item) => item.kind === PortKind.MemoryStructure),
      ) ||
      node.data.voids?.find((item) => item.kind === PortKind.MemoryStructure) ||
      node.data.constants?.find(
        (item) => item.kind === PortKind.MemoryStructure,
      )
    );
  };

  for (const edge of edges) {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (sourceNode && targetNode) {
      if (hasMemoryStructure(sourceNode) && hasMemoryStructure(targetNode)) {
        if (sourceNode.parentId !== targetNode.parentId) {
          remain.push({
            type: "edge",
            id: edge.id,
            level: "critical",
            message:
              "Nodes with memory structures must be in the same subflow.",
          });
        }
      }
    }
  }

  return {
    ...previous,
    remainingErrors: remain,
  };
}

function validateUniqueAgentSubflows(previous: ValidationResult) {
  const remain: ValidationError[] = previous.remainingErrors;
  const agentSubflows = previous.nodes.filter(
    (node) => node.type === "AgentSubFlowNode",
  ) as Array<FlowNode & { data: { agent?: { id?: string } } }>;

  const agentNodeMap = new Map<string, string[]>();

  for (const node of agentSubflows) {
    const agentId = node.data.agent?.id;

    if (!agentId) {
      continue;
    }

    const existingNodeIds = agentNodeMap.get(agentId) ?? [];
    existingNodeIds.push(node.id);
    agentNodeMap.set(agentId, existingNodeIds);
  }

  for (const nodeIds of agentNodeMap.values()) {
    if (nodeIds.length < 2) {
      continue;
    }

    for (const nodeId of nodeIds) {
      remain.push({
        type: "node",
        id: nodeId,
        level: "critical",
        message:
          "You can only have one subflow per agent in the same workflow.",
      });
    }
  }

  return {
    ...previous,
    remainingErrors: remain,
  };
}

const validators = [
  validateUniqueAgentSubflows,
  validateMemoryStructuresSameSubflow,
  validateMatchingPorts,
  validateNoUnconnectedNodes,
  validateGraphIsConnected,
  atLeastOneNode,
  noDoubleEdgeForOutput,
];

export const validateNodeConstants = (
  state: ValidationResult,
  node: FlowNode,
): ValidationResult => {
  console.log("Validating node constants");
  if (!node.data.constants) return state;
  if (node.data.constants.length == 0) return state;
  try {
    // Only validate non global constants. The schema build is inside the try:
    // an unsupported port kind must surface as a node error, not abort the
    // whole graph validation.
    const schema = buildZodSchema(
      node.data.constants.filter((k) => !(k.key in node.data.globalsMap)),
    );
    schema.parse(node.data.constantsMap);
    return state;
  } catch (e) {
    console.log("Validation error", e, node.data.constantsMap);
    const validationError = e as ZodError;

    const newRemainingErrors: ValidationError[] = [];

    validationError.issues.forEach((element) => {
      const path = element.path;

      newRemainingErrors.push({
        type: "node",
        id: node.id,
        path: path.join("."),
        level: "critical",
        message: element.message,
      });
    });

    return {
      ...state,
      valid: false,
      remainingErrors: [...state.remainingErrors, ...newRemainingErrors],
    };
  }
};

export type ValidationOptions = {
  validateNodeDefaults: boolean;
  validateNoUnconnectedNodes: boolean;
};

export const validateState = (
  initial: ValidationResult,
  options?: ValidationOptions,
): ValidationResult => {
  if (options == undefined)
    options = { validateNodeDefaults: true, validateNoUnconnectedNodes: true };

  console.log("Validation initial", initial);
  for (const validator of validators) {
    const validated = validator(initial);
    initial = { ...initial, ...validated };
  }

  if (options.validateNodeDefaults) {
    for (const node of initial.nodes) {
      const validated = validateNodeConstants(initial, node);
      initial = { ...initial, ...validated };
    }
  }

  console.log("Validation result", initial);

  return initial;
};
