import React, { useCallback, useRef, useState } from "react";
import {
  Connection,
  Edge,
  EdgeTypes,
  Position,
  ReactFlowInstance,
  updateEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import { v4 as uuidv4 } from "uuid";
import { useAlert } from "../../components/alerter/alerter-context";
import {
  ArkitektFilterNodeFragment,
  ArkitektNodeFragment,
  FlowFragment,
  GlobalFragment,
  GraphInput,
  GraphNodeFragment,
  LocalNodeFragment,
  MapStrategy,
  PortFragment,
  PortInput,
  ReactiveNodeFragment,
  ReactiveTemplateDocument,
  ReactiveTemplateQuery,
  Scope,
  StreamKind,
} from "../../fluss/api/graphql";
import { useFluss } from "../../fluss/fluss-context";
import { useRekuest } from "../../rekuest/RekuestContext";
import {
  DetailNodeDocument,
  DetailNodeQuery,
  DetailTemplateDocument,
  DetailTemplateQuery,
  NodeKind,
} from "../../rekuest/api/graphql";
import { Graph } from "../base/Graph";
import { ConnectionMap, FlowNode, NodeTypes } from "../types";
import {
  edges_to_flowedges,
  flowedges_to_edges,
  flowglobals_to_globals,
  flownodes_to_nodes,
  noTypename,
  nodes_to_flownodes,
  notEmpty,
  rekuestPortToFluss,
} from "../utils";
import { EditActions } from "./EditActions";
import { EditSidebar } from "./components/EditSidebar";
import { EditRiverContext } from "./context";
import { LabeledEditEdge } from "./edges/LabeledEditEdge";
import { defaultConnectionHandler, handle_to_index } from "./logic/connect";
import { ArkitektEditNodeWidget } from "./nodes/ArkitektEditNodeWidget";
import { ReactiveEditNodeWidget } from "./nodes/ReactiveEditNodeWidget";
import { ArgEditNodeWidget } from "./nodes/generic/ArgEditNodeWidget";
import { KwargEditNodeWidget } from "./nodes/generic/KwargEditNodeWidget";
import { ReturnEditNodeWidget } from "./nodes/generic/ReturnEditNodeWidget";

import dagre from "dagre";
import { useDrop } from "react-dnd";
import { SMART_MODEL_DROP_TYPE } from "../../constants";
import { PageLayout } from "../../layout/PageLayout";
import { useDialog } from "../../layout/dialog/DialogProvider";
import { Komments } from "../../lok/komment/Komments";
import { DynamicSidebar } from "./DynamicSidebar";
import { AskTypeDialog } from "./dialogs/AskTypeDialog";
import { ArkitektFilterNodeWidget } from "./nodes/ArkitektFilterNodeWidget";
import { GraphNodeEditWidget } from "./nodes/GraphNodeEditWidget";
import { LocalEditNodeWidget } from "./nodes/LocalEditNodeWidget";

const nodeTypes: NodeTypes = {
  ArkitektNode: ArkitektEditNodeWidget,
  ArkitektFilterNode: ArkitektFilterNodeWidget,
  ReactiveNode: ReactiveEditNodeWidget,
  LocalNode: LocalEditNodeWidget,
  ArgNode: ArgEditNodeWidget,
  ReturnNode: ReturnEditNodeWidget,
  KwargNode: KwargEditNodeWidget,
  GraphNode: GraphNodeEditWidget,
};

const edgeTypes: EdgeTypes = {
  LabeledEdge: LabeledEditEdge,
  FancyEdge: LabeledEditEdge,
};

export type Props = {
  flow: FlowFragment;
  connectionHandler?: ConnectionMap;
  onFlowSave: (graph_input: GraphInput) => Promise<void>;
};

function base64ToBlob(image: string, mime = "image/png") {
  let base64 = image.replace(/^data:image\/(png|jpg);base64,/, "");
  var sliceSize = 1024;
  var byteChars = window.atob(base64);
  var byteArrays = [];

  for (
    var offset = 0, len = byteChars.length;
    offset < len;
    offset += sliceSize
  ) {
    var slice = byteChars.slice(offset, offset + sliceSize);

    var byteNumbers = new Array(slice.length);
    for (var i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    var byteArray = new Uint8Array(byteNumbers);

    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mime });
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (
  nodes: FlowNode[],
  edges: Edge[],
  direction = "TB"
) => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};

export const port_to_input = (port: PortFragment): PortInput => {
  return {
    key: port.key,
    kind: port.kind,
    label: port.label,
    scope: port.scope,
    identifier: port.identifier,
    assignWidget: port.assignWidget,
    returnWidget: port.returnWidget,
    nullable: port.nullable,
  };
};

export const EditRiver: React.FC<Props> = ({
  flow,
  onFlowSave,
  connectionHandler = defaultConnectionHandler,
}) => {
  const { client: arkitektapi } = useRekuest();
  const { client: flussapi } = useFluss();
  const [selectedNode, setSelectedNode] = useState<string>();
  const [internalSignal, setInternalSignal] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    nodes_to_flownodes(flow.graph?.nodes)
  );
  const [args, setArgs] = useState(flow?.graph.args);
  const [returns, setReturns] = useState(flow?.graph.returns);
  const { ask } = useDialog();

  const [edges, setEdges, onEdgesChange] = useEdgesState(
    edges_to_flowedges(flow.graph?.edges)
  );
  const [globals, setGlobals] = useState(flow.graph.globals);
  const [saving, setSaving] = useState(false);

  const { alert } = useAlert();

  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, direction);

      setNodes((nodes) => [...layoutedNodes]);
      setEdges((edges) => [...layoutedEdges]);
    },
    [nodes, edges]
  );

  const onExport = useCallback(() => {
    let x = JSON.stringify(flow);
    // Download the file
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(x)
    );
    element.setAttribute("download", "flow.json");

    element.style.display = "none";

    element.click();

    document.body.removeChild(element);
  }, [flow]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: FlowNode) => {
    setSelectedNode(node.id);
  }, []);

  const onConnect = (params: Connection) => {
    const { source, target, sourceHandle, targetHandle } = params;
    const sourceNode = nodes.find((node) => node.id === source);
    const targetNode = nodes.find((node) => node.id === target);

    console.log(sourceNode, targetNode);

    if (!sourceNode?.data.__typename || !targetNode?.data.__typename) {
      alert({ message: "Source or target node not found" });
    } else {
      let handler =
        connectionHandler[sourceNode.data.__typename][
          targetNode.data.__typename
        ];

      try {
        let source_index = handle_to_index(params.sourceHandle);
        let target_index = handle_to_index(params.targetHandle);

        let sourceStream =
          sourceNode.data.outstream[source_index]?.filter(notEmpty) || [];
        let targetStream =
          targetNode.data.instream[target_index]?.filter(notEmpty) || [];

        let targetTypes = targetStream?.map((a) => a?.identifier || a?.kind);
        let sourceTypes = sourceStream?.map((a) => a?.identifier || a?.kind);

        let update = handler({
          params,
          nodes,
          edges,
          sourceNode,
          targetNode,
          sourceStream,
          targetStream,
          sourceTypes,
          targetTypes,
          args,
          returns,
        });
        if (update.nodes) {
          console.log(update.nodes);
          setNodes(update.nodes);
        }
        if (update.edges) {
          setEdges(update.edges);
        }
        if (update.args) {
          setArgs(update.args);
        }
        if (update.returns) {
          setReturns(update.returns);
        }

        if (update.errors) {
          alert({ message: update.errors.map((x) => x.message).join(" | ") });
        }
      } catch (e: any) {
        alert({ message: e.message });
      }
    }
  };

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const updateNodeIn = (id: string, instream: any) => {
    setNodes((els) =>
      els.map((el) =>
        el.id === id ? { ...el, data: { ...el.data, instream: instream } } : el
      )
    );
    setEdges((edg) => edg.filter((el) => el.target !== id));
    console.log("update node", id, instream);
    setInternalSignal(!internalSignal);
  };

  const updateNodeExtras = (id: string, data: any) => {
    setNodes((els) =>
      els.map((el) => (el.id === id ? { ...el, data: { ...data } } : el))
    );
    console.log("Updating Node Extras for", id);
    setInternalSignal(!internalSignal);
  };

  const updateNodeOut = (id: string, outstream: any) => {
    setNodes((els) =>
      els.map((el) =>
        el.id === id
          ? { ...el, data: { ...el.data, outstream: outstream } }
          : el
      )
    );
    setEdges((edg) => edg.filter((el) => el.source !== id));
    console.log("update node", id, outstream);
    setInternalSignal(!internalSignal);
  };

  const removeEdge = (id: string) => {
    setEdges((edg) => edg.filter((el) => el.id !== id));
  };

  const onEdgeUpdate = (oldEdge: Edge, newConnection: Connection) =>
    setEdges((els) => updateEdge(oldEdge, newConnection, els));

  const addArkitekt = (node: FlowNode) => {
    setNodes((nodes) => [...nodes, node]);
  };

  const addLocal = (node: FlowNode) => {
    setNodes((nodes) => [...nodes, node]);
  };

  const addGlobal = (global: GlobalFragment) => {
    setGlobals([...globals, global]);
  };

  const updateGlobal = (key: string, global: GlobalFragment) => {
    setGlobals([...globals, global]);
  };

  const addReactive = (node: FlowNode<ReactiveNodeFragment>) => {
    setNodes((nodes) => [...nodes, node]);
  };

  const addNodes = (newnodes: FlowNode<any>[]) => {
    setNodes((nodes) => [...nodes, ...newnodes]);
  };

  const saveDiagram = async () => {
    const flownodes = flownodes_to_nodes(nodes);
    const flowedges = flowedges_to_edges(edges);
    const flowglobals = flowglobals_to_globals(globals);

    setSaving(true);

    //let image = await getImage();

    await onFlowSave({
      nodes: flownodes,
      edges: flowedges,
      globals: flowglobals,
      args: args.filter(notEmpty).map(noTypename),
      returns: returns.filter(notEmpty).map(noTypename),
    });
  };

  const exportDiagram = () => {
    const flownodes = flownodes_to_nodes(nodes);
    const flowedges = flowedges_to_edges(edges);

    //let image = await getImage();

    return {
      nodes: flownodes,
      edges: flowedges,
      globals: [],
      args: args.filter(notEmpty).map(noTypename),
      returns: returns.filter(notEmpty).map(noTypename),
    };
  };

  const [{ isOver, canDrop, type }, dropref] = useDrop(() => {
    return {
      accept: [SMART_MODEL_DROP_TYPE],

      drop: (items: { id: string; identifier: string }[], monitor) => {
        if (!monitor.didDrop()) {
          console.log("Ommitting Parent Drop");
        }

        console.log("hallo");

        const reactFlowBounds =
          reactFlowWrapper?.current?.getBoundingClientRect();

        let x = monitor && monitor.getClientOffset()?.x;
        let y = monitor && monitor.getClientOffset()?.y;

        const flowInstance = reactFlowInstance;

        items.map((i, index) => {
          const id = i.id;
          const type = i.identifier;

          console.log(id, flowInstance, reactFlowBounds, x, y);

          if (id && reactFlowInstance && reactFlowBounds && x && y && type) {
            const position = reactFlowInstance.project({
              x: x - reactFlowBounds.left,
              y: y - reactFlowBounds.top + index * 100,
            });

            if (type == "@arkitekt/node") {
              arkitektapi &&
                arkitektapi
                  .query<DetailNodeQuery>({
                    query: DetailNodeDocument,
                    variables: { id: id },
                  })
                  .then(async (event) => {
                    console.log(event);

                    if (event.data?.node) {
                      if (
                        event.data.node.protocols?.find(
                          (p) => p?.name == "predicate"
                        )
                      ) {
                        const answer = await ask(AskTypeDialog, {
                          filter: ["filter", "map"],
                        });
                        if (answer.type == "filter") {
                          let id = "arkid-" + uuidv4();
                          let node: FlowNode<ArkitektFilterNodeFragment> = {
                            id: id,
                            type: "ArkitektFilterNode",
                            dragHandle: ".custom-drag-handle",
                            data: {
                              __typename: "ArkitektFilterNode",
                              instream: [
                                event?.data?.node?.args
                                  ?.filter(
                                    (x) =>
                                      !x?.nullable && x?.default == undefined
                                  ) // by default, all nullable and default values are optional so not part of stream
                                  .filter(notEmpty)
                                  .map(rekuestPortToFluss) || [],
                              ],
                              mapStrategy: MapStrategy.Map,
                              allowLocal: false,
                              assignTimeout: 100000,
                              yieldTimeout: 100000,
                              reserveTimeout: 100000,
                              maxRetries: 3,
                              retryDelay: 2000,
                              outstream: [
                                event?.data?.node?.args
                                  ?.filter(
                                    (x) =>
                                      !x?.nullable && x?.default == undefined
                                  ) // by default, all nullable and default values are optional so not part of stream
                                  .filter(notEmpty)
                                  .map(rekuestPortToFluss) || [],
                              ],
                              constream: [],
                              name: event.data?.node?.name || "no-name",
                              hash: event.data?.node?.hash || "",
                              kind:
                                event.data?.node?.kind || NodeKind.Generator,
                            },
                            position: position,
                          };
                          addArkitekt(node);
                          return;
                        }
                      }

                      let id = "arkid-" + uuidv4();
                      let node: FlowNode<ArkitektNodeFragment> = {
                        id: id,
                        type: "ArkitektNode",
                        dragHandle: ".custom-drag-handle",
                        data: {
                          __typename: "ArkitektNode",
                          instream: [
                            event?.data?.node?.args
                              ?.filter(
                                (x) => !x?.nullable && x?.default == undefined
                              ) // by default, all nullable and default values are optional so not part of stream
                              .filter(notEmpty)
                              .map(rekuestPortToFluss) || [],
                          ],
                          mapStrategy: MapStrategy.Map,
                          allowLocal: false,
                          assignTimeout: 100000,
                          yieldTimeout: 100000,
                          reserveTimeout: 100000,
                          maxRetries: 3,
                          retryDelay: 2000,
                          outstream: [
                            event?.data?.node?.returns
                              ?.filter(notEmpty)
                              .map(rekuestPortToFluss) || [],
                          ],
                          constream: [],
                          name: event.data?.node?.name || "no-name",
                          hash: event.data?.node?.hash || "",
                          kind: event.data?.node?.kind || NodeKind.Generator,
                        },
                        position: position,
                      };

                      addArkitekt(node);
                    }
                  });
            }

            if (type == "@arkitekt/template") {
              arkitektapi &&
                arkitektapi
                  .query<DetailTemplateQuery>({
                    query: DetailTemplateDocument,
                    variables: { id: id },
                  })
                  .then((event) => {
                    console.log(event);

                    if (event.data?.template?.node) {
                      // two paths according to node scope
                      let node: FlowNode<LocalNodeFragment> = {
                        id: id,
                        type: "LocalNode",
                        dragHandle: ".custom-drag-handle",
                        data: {
                          __typename: "LocalNode",
                          instream: [
                            event?.data?.template.node?.args
                              ?.filter(
                                (x) => !x?.nullable && x?.default == undefined
                              ) // by default, all nullable and default values are optional so not part of stream
                              .filter(notEmpty)
                              .map(rekuestPortToFluss) || [],
                          ],
                          mapStrategy: MapStrategy.Map,
                          allowLocal: false,
                          assignTimeout: 100000,
                          yieldTimeout: 100000,
                          maxRetries: 3,
                          retryDelay: 2000,
                          outstream: [
                            event?.data?.template.node?.returns
                              ?.filter(notEmpty)
                              .map(rekuestPortToFluss) || [],
                          ],
                          constream: [],
                          name: event.data?.template.node?.name || "no-name",
                          hash: event.data?.template.node?.hash || "",
                          kind:
                            event.data?.template.node?.kind ||
                            NodeKind.Generator,
                          interface: event.data?.template.interface || "",
                        },
                        position: position,
                      };
                      addLocal(node);
                    }
                  });
            }

            if (type == "@fluss/reactivetemplate") {
              flussapi &&
                flussapi
                  .query<ReactiveTemplateQuery>({
                    query: ReactiveTemplateDocument,
                    variables: { id: id },
                  })
                  .then((event) => {
                    console.log(event);

                    let id = "reactive-" + uuidv4();
                    if (!event.data?.reactivetemplate?.implementation)
                      return null;

                    let node: FlowNode<ReactiveNodeFragment> = {
                      id: id,
                      type: "ReactiveNode",
                      dragHandle: ".custom-drag-handle",
                      data: {
                        __typename: "ReactiveNode",
                        instream: event.data.reactivetemplate?.instream || [],
                        outstream: event.data.reactivetemplate?.outstream || [],
                        constream: event.data.reactivetemplate?.constream || [],
                        implementation:
                          event.data?.reactivetemplate?.implementation || "",
                      },
                      position: position,
                    };
                    addReactive(node);
                  });
            }
            if (type == "@arkitekt/graphnode") {
              let node: FlowNode<GraphNodeFragment> = {
                id: id,
                type: "GraphNode",
                dragHandle: ".custom-drag-handle",
                data: {
                  __typename: "GraphNode",
                  instream: [
                    [
                      {
                        kind: StreamKind.Unset,
                        nullable: true,
                        scope: Scope.Global,
                        key: "in",
                      },
                    ],
                  ],
                  outstream: [
                    [
                      {
                        kind: StreamKind.Unset,
                        nullable: true,
                        scope: Scope.Global,
                        key: "in",
                      },
                    ],
                  ],
                  constream: [],
                },
                position: position,
              };
              addReactive(node);
            }
          }
        });

        return {};
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        type: monitor.getItemType(),
        canDrop: !!monitor.canDrop(),
      }),
    };
  }, [reactFlowInstance, reactFlowWrapper]);

  return (
    <EditRiverContext.Provider
      value={{
        removeEdge,
        addLocal: addLocal,
        addArkitekt: addArkitekt,
        addReactive: addReactive,
        updateNodeIn: updateNodeIn,
        updateNodeExtras: updateNodeExtras,
        updateNodeOut: updateNodeOut,
        setDiagramError: (error: any) => {
          return;
        },
        exportDiagram,
        internalSignal,
        setLayout: onLayout,
        addGlobal,
        setGlobals,
        updateGlobal,
        saveDiagram: saveDiagram,
        setNodeError: (id: string) => (error: string) => {
          return;
        },
        globals,
        nodes,
        edges,
        selectedNode,
        args,
        setArgs,
        returns,
        setReturns,
        saving,
        flow,
      }}
    >
      <PageLayout
        sidebars={[
          {
            label: "Flow",
            key: "Flow",
            content: <DynamicSidebar />,
          },
          {
            label: "Nodes",
            key: "nodes",
            content: <EditSidebar flow={flow} />,
          },
          {
            label: "Social",
            key: "social",
            content: (
              <div className="p-3">
                {flow.workspace?.id && (
                  <Komments
                    model={"@fluss/workspace"}
                    object={flow.workspace?.id}
                  />
                )}
              </div>
            ),
          },
        ]}
        actions={<EditActions flow={flow} />}
      >
        <div
          ref={reactFlowWrapper}
          className="flex flex-grow h-full w-full"
          data-disableselect
        >
          <div ref={dropref} className="flex flex-grow h-full w-full">
            <Graph
              onPaneClick={(e) => setSelectedNode(undefined)}
              onDragOver={onDragOver}
              nodes={nodes}
              edges={edges}
              elementsSelectable={true}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodeClick={(e, n) => setSelectedNode(n.id)}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onInit={(e) => setReactFlowInstance(e)}
              fitView
              attributionPosition="top-right"
            ></Graph>
          </div>
        </div>
      </PageLayout>
    </EditRiverContext.Provider>
  );
};
