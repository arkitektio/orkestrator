import { reportError } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Button } from "@/core/ui/button";
import {
  GetLineageDocument,
  GetLineageQuery,
  GetLineageQueryVariables,
} from "@/mikro/api/graphql";
import { useMikro } from "@/mikro/api/funcs";
import {
  Background,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GitBranch, X } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { DATA_NODE_SIZE, fallbackPositions, HEADER_CENTRE, layoutLineage, lensRowCentre, TASK_NODE_SIZE } from "./layout";
import {
  Direction,
  Expansion,
  IDENTIFIER_BY_KIND,
  KIND_LABEL,
  lensHandle,
  OUT_HANDLE,
  LineageAnswer,
  LineageState,
  lineageLink,
  mergeLineage,
  toFlow,
} from "./lineageGraph";
import {
  edgeTypes,
  FlowNodeType,
  bandOf,
  heightOf,
  KIND_ICON,
  LineageEdgeType,
  nodeTypes,
  SMART_BY_KIND,
} from "./LineageNodes";

// `currentColor`, resolved against the wrapper's `text-muted-foreground`; see
// CoordinateGraphFlow for why not `hsl(var(--…))`.
const marker = { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "currentColor" };

type Positioned = {
  nodes: FlowNodeType[];
  edges: LineageEdgeType[];
};

/**
 * The lineage around one object, as a left-to-right picture: files and data,
 * and between them the tasks that made each step.
 *
 * Opens with what the page asked for and grows from there: a "+" on a node
 * asks the server for one more hop that way and merges the answer in. The
 * picture is laid out again around the new nodes, but the node that was
 * expanded stays where it was on screen, so the graph grows around where
 * someone is looking rather than jumping.
 */
export const LineageFlow = ({ answer }: { answer: LineageAnswer }) => {
  const client = useMikro();
  const navigate = useNavigate();
  const [instance, setInstance] = React.useState<ReactFlowInstance<FlowNodeType, LineageEdgeType> | null>(null);

  const [state, setState] = React.useState<LineageState>(() => mergeLineage(null, answer));
  // A refetch of the same root folds in. (A new root is a new graph: the page
  // keys this component by root, so it never arrives here.)
  const merged = React.useRef(answer);
  React.useEffect(() => {
    if (merged.current === answer) return;
    merged.current = answer;
    setState((current) => mergeLineage(current, answer));
  }, [answer]);

  const [expanding, setExpanding] = React.useState<Expansion | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);

  // Read inside the stable `expand` and the layout effect without re-creating
  // them: the nodes' `onExpand` must keep one identity or every node re-renders.
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const positionsRef = React.useRef(new Map<string, { x: number; y: number }>());
  const anchorRef = React.useRef<{ key: string; x: number; y: number } | null>(null);
  const busyRef = React.useRef(false);

  const expand = React.useCallback(
    async (key: string, direction: Direction) => {
      const node = stateRef.current.nodes[key];
      if (!node || busyRef.current) return;
      busyRef.current = true;
      const at = positionsRef.current.get(key);
      anchorRef.current = at ? { key, ...at } : null;
      setExpanding({ key, direction });
      try {
        const { data } = await client.query<GetLineageQuery, GetLineageQueryVariables>({
          query: GetLineageDocument,
          variables: {
            start: { kind: node.kind, id: node.id },
            up: direction === "up" ? 1 : 0,
            down: direction === "down" ? 1 : 0,
          },
          // Each answer is merged into the graph once; caching it would only
          // keep a second, unnormalized copy.
          fetchPolicy: "no-cache",
        });
        setState((current) => mergeLineage(current, data.lineage, { key, direction }));
      } catch (error) {
        anchorRef.current = null;
        reportError(error, "Couldn't load more lineage");
      } finally {
        busyRef.current = false;
        setExpanding(null);
      }
    },
    [client],
  );

  const flow = React.useMemo(() => toFlow(state), [state]);
  const [positioned, setPositioned] = React.useState<Positioned | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const place = (positions: Map<string, { x: number; y: number }>) => {
      positionsRef.current = positions;
      const at = (id: string) => positions.get(id) ?? { x: 0, y: 0 };
      setPositioned({
        nodes: flow.nodes.map((node): FlowNodeType =>
          node.type === "data"
            ? {
                id: node.id,
                type: "data",
                position: at(node.id),
                width: DATA_NODE_SIZE.width,
                height: heightOf(node.node),
                data: { node: node.node, isRoot: node.isRoot, selected: false, expanding: null, onExpand: expand },
              }
            : {
                id: node.id,
                type: "task",
                position: at(node.id),
                ...TASK_NODE_SIZE,
                data: { taskId: node.taskId, inputs: node.inputs, outputs: node.outputs, selected: false },
              },
        ),
        edges: flow.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          sourceHandle: edge.sourceHandle,
          target: edge.target,
          type: "lineage",
          markerEnd: marker,
          data: { label: edge.label, unmappable: edge.unmappable },
        })),
      });
    };

    layoutLineage(
      flow.nodes.map((node) =>
        node.type === "data"
          ? {
              id: node.id,
              type: node.type,
              height: heightOf(node.node),
              // Every lens row is a port, at the y its row is drawn at; the
              // tile's own out-port serves a node with no lens (a file).
              ports: [
                { handle: OUT_HANDLE, y: HEADER_CENTRE },
                ...node.node.lenses.map((lens, index) => ({ handle: lensHandle(lens.id), y: lensRowCentre(index, bandOf(node.node)) })),
              ],
            }
          : { id: node.id, type: node.type },
      ),
      flow.edges,
    )
      .then((positions) => {
        if (!cancelled) place(positions);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[Lineage] ELK layout failed", error);
        // Badly placed beats never placed: the nodes, in rough depth columns.
        anchorRef.current = null;
        place(
          fallbackPositions(
            flow.nodes.map((node) => ({
              id: node.id,
              type: node.type,
              depth: node.type === "data" ? node.node.depth : undefined,
              height: node.type === "data" ? heightOf(node.node) : undefined,
            })),
          ),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [flow, expand]);

  // Keep the expanded node still on screen, or frame everything the first time.
  const framed = React.useRef(false);
  React.useEffect(() => {
    if (!positioned || !instance) return;
    const anchor = anchorRef.current;
    anchorRef.current = null;
    const now = anchor && positionsRef.current.get(anchor.key);
    if (anchor && now) {
      const viewport = instance.getViewport();
      instance.setViewport({
        x: viewport.x - (now.x - anchor.x) * viewport.zoom,
        y: viewport.y - (now.y - anchor.y) * viewport.zoom,
        zoom: viewport.zoom,
      });
    } else if (!framed.current) {
      framed.current = true;
      instance.fitView({ padding: 0.2, maxZoom: 1 });
    }
  }, [positioned, instance]);

  // What changes on every click (selection, the spinner) is laid onto the
  // positioned nodes here, so it never triggers a layout.
  const nodes = React.useMemo(
    () =>
      (positioned?.nodes ?? []).map((node): FlowNodeType =>
        node.type === "data"
          ? {
              ...node,
              data: {
                ...node.data,
                selected: node.id === selected,
                expanding: expanding?.key === node.id ? expanding.direction : null,
              },
            }
          : { ...node, data: { ...node.data, selected: node.id === selected } },
      ),
    [positioned, selected, expanding],
  );

  const counts = React.useMemo(() => {
    const data = Object.keys(state.nodes).length;
    const tasks = flow.nodes.length - data;
    return { data, tasks };
  }, [state, flow]);

  return (
    // `text-muted-foreground` colours the edges, which stroke with currentColor.
    <div className="relative h-full w-full text-muted-foreground">
      <ReactFlow<FlowNodeType, LineageEdgeType>
        nodes={nodes}
        edges={positioned?.edges ?? []}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={setInstance}
        onNodeClick={(_, node) => setSelected(node.id)}
        onPaneClick={() => setSelected(null)}
        nodesDraggable={false}
        nodesConnectable={false}
        onlyRenderVisibleElements
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} />
        {!positioned && (
          <Panel position="top-center">
            <span className="rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
              Laying out {flow.nodes.length} nodes…
            </span>
          </Panel>
        )}
        <Panel position="bottom-left">
          <div className="flex flex-col gap-0.5 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
            <span>
              {counts.data} {counts.data === 1 ? "object" : "objects"} · {counts.tasks}{" "}
              {counts.tasks === 1 ? "task" : "tasks"}
            </span>
            {state.truncated && (
              <span>Not everything is shown. Use + on a node to load more from there.</span>
            )}
          </div>
        </Panel>
        {selected && (
          <Panel position="top-right">
            <SelectionPanel
              state={state}
              selected={selected}
              onClose={() => setSelected(null)}
              onRecenter={(kind, id) => navigate(lineageLink(kind, id))}
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};

/**
 * What the selected node is, and what can be done with it: its own display,
 * its object button (every local action and task that applies), and a way to
 * make it the root of the picture.
 */
const SelectionPanel = ({
  state,
  selected,
  onClose,
  onRecenter,
}: {
  state: LineageState;
  selected: string;
  onClose: () => void;
  onRecenter: (kind: LineageAnswer["nodes"][number]["kind"], id: string) => void;
}) => {
  const node = state.nodes[selected];
  const taskId = selected.startsWith("task:") ? selected.slice("task:".length) : node?.taskId;

  const close = (
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose} aria-label="Close">
      <X className="h-3.5 w-3.5" />
    </Button>
  );

  if (!node) {
    return (
      <div className="flex w-80 flex-col gap-2 rounded-md border bg-popover p-3 text-popover-foreground shadow-md">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">Task</span>
          {close}
        </div>
        <StructureDisplay identifier="@rekuest/task" id={taskId} variant="card" link fallback={<span className="text-xs text-muted-foreground">Task {taskId}</span>} />
      </div>
    );
  }

  const Icon = KIND_ICON[node.kind];
  const SmartObject = SMART_BY_KIND[node.kind];
  const identifier = IDENTIFIER_BY_KIND[node.kind];

  return (
    <div className="flex w-80 flex-col gap-3 rounded-md border bg-popover p-3 text-popover-foreground shadow-md">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-1 flex-col">
          {SmartObject ? (
            <SmartObject.DetailLink object={{ id: node.id }} className="truncate text-sm font-medium">
              {node.name || "Unnamed"}
            </SmartObject.DetailLink>
          ) : (
            <span className="truncate text-sm font-medium">{node.name || "Unnamed"}</span>
          )}
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{KIND_LABEL[node.kind]}</span>
        </div>
        {close}
      </div>

      {identifier && <StructureDisplay identifier={identifier} id={node.id} variant="card" />}

      {taskId && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Made by</span>
          <StructureDisplay identifier="@rekuest/task" id={taskId} variant="inline" link fallback={<span className="text-xs text-muted-foreground">Task {taskId}</span>} />
        </div>
      )}

      <div className="flex flex-row flex-wrap gap-2">
        {SmartObject && <SmartObject.ObjectButton object={{ id: node.id }} />}
        {node.key !== state.root && (
          <Button variant="outline" size="sm" onClick={() => onRecenter(node.kind, node.id)}>
            <GitBranch className="mr-2 h-3.5 w-3.5" />
            Lineage from here
          </Button>
        )}
      </div>
    </div>
  );
};

export default LineageFlow;
