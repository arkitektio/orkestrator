import { Button } from "@/core/components/ui/button";
import { isSceneNavigationTarget } from "@/core/lib/input/keyboardTarget";
import {
  Background,
  ReactFlow,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import { Maximize, Minus, Plus } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { DetailNeuronModelFragment } from "../../api/graphql";
import {
  DEFAULT_WEIGHTS,
  DominanceWeights,
  useImportanceColors,
} from "../../lib/importance";
import { ImportanceControl } from "../ImportanceControl";
import { ImportanceContext } from "./importanceContext";
import SectionNode from "./nodes/SectionNode";
import { SectionEdge, SectionNode as SectionNodeType } from "./types";
import {
  buildCompartmentLegend,
  sectionsToEdges,
  sectionsToNodes,
} from "./utils";

const nodeTypes = { section: SectionNode };

const elk = new ELK();

// Top-down layered layout: parents above, children below — the natural shape
// for a NEURON morphology tree (and forests, when a model has multiple roots).
const treeLayout = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "80",
  "elk.spacing.nodeNode": "40",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
};

export type Props = {
  model: DetailNeuronModelFragment;
  /**
   * Hosted inside the neuron viewport (the "Tree" display mode) rather than on
   * its own page: the zoom controls move out of the top-left corner, which the
   * page's title card owns there, into a bottom-centre strip in the scene
   * viewport's HUD dialect.
   */
  embedded?: boolean;
};

export const NeuronModelTree: React.FC<Props> = ({ model, embedded = false }) => {
  const [reactFlowInstance, setReactFlowInstance] =
    React.useState<ReactFlowInstance<SectionNodeType, SectionEdge> | null>(null);

  const [nodes, setNodes] = useNodesState<SectionNodeType>([]);
  const [edges, setEdges] = useEdgesState<SectionEdge>([]);

  const legend = useMemo(() => buildCompartmentLegend(model), [model]);

  // Importance heatmap: hover the control to preview, click to pin. Recoloring
  // is delivered through context so the memoized nodes need not be rebuilt.
  // Settings tune the dominance blend weights (which refetch the score).
  const [weights, setWeights] = useState<DominanceWeights>(DEFAULT_WEIGHTS);
  const [pinned, setPinned] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const importanceActive = pinned || previewing;
  const importance = useImportanceColors(model, weights);
  const importanceValue = useMemo(
    () => ({
      active: importanceActive,
      colorFor: (id: string) => importance.colors.get(id),
    }),
    [importanceActive, importance],
  );

  useEffect(() => {
    const the_nodes = sectionsToNodes(model);
    const the_edges = sectionsToEdges(model);

    if (the_nodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const graph = {
      id: "root",
      layoutOptions: treeLayout,
      children: the_nodes.map((node) => ({
        id: node.id,
        width: node.width,
        height: node.height,
      })),
      edges: the_edges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    let cancelled = false;
    elk.layout(graph).then(({ children }) => {
      if (cancelled || !children) return;

      const positioned = the_nodes
        .map((node) => {
          const laid = children.find((c) => c.id === node.id);
          if (!laid) return null;
          return { ...node, position: { x: laid.x || 0, y: laid.y || 0 } };
        })
        .filter((n): n is SectionNodeType => n !== null);

      setNodes(positioned);
      setEdges(the_edges);
    });

    return () => {
      cancelled = true;
    };
  }, [model, setNodes, setEdges]);

  useEffect(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView();
    }
  }, [nodes, edges, reactFlowInstance]);

  // F frames the tree, the same key that frames the 3D view — one binding for
  // both display modes, gated like the scene's navigation keys.
  useEffect(() => {
    if (!embedded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.code !== "KeyF") return;
      if (!isSceneNavigationTarget(e.target as { tagName?: string } | null)) return;
      e.preventDefault();
      reactFlowInstance?.fitView();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [embedded, reactFlowInstance]);

  return (
    <ImportanceContext.Provider value={importanceValue}>
    <div className="relative h-full w-full">
      <ReactFlow<SectionNodeType, SectionEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(r) => setReactFlowInstance(r)}
        fitView
        proOptions={{ hideAttribution: true }}
        attributionPosition="top-right"
        className="relative"
      >
        <Background />
      </ReactFlow>

      {importance.hasData && (
        <div className="absolute top-2 right-2 z-10">
          <ImportanceControl
            variant="card"
            weights={weights}
            onWeightsChange={setWeights}
            active={importanceActive}
            pinned={pinned}
            onPreviewChange={setPreviewing}
            onTogglePin={() => setPinned((p) => !p)}
            min={importance.min}
            max={importance.max}
          />
        </div>
      )}

      {/* Custom controls, styled to match the platform's flow surfaces
          (reaktion `DefaultControls`) rather than React Flow's defaults. */}
      <div
        className={
          embedded
            ? "pointer-events-auto absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-black/10 bg-black/40 p-1 backdrop-blur-md"
            : "absolute top-2 left-2 z-10 flex h-10 flex-row items-center gap-2 overflow-hidden rounded-md bg-card px-2"
        }
      >
        <Button
          variant="outline"
          size={embedded ? "xs" : "icon"}
          className={embedded ? "h-7 w-8 bg-black p-0" : undefined}
          onClick={() => reactFlowInstance?.zoomIn()}
          title="Zoom in"
        >
          <Plus className={embedded ? "h-3.5 w-3.5" : undefined} />
        </Button>
        <Button
          variant="outline"
          size={embedded ? "xs" : "icon"}
          className={embedded ? "h-7 w-8 bg-black p-0" : undefined}
          onClick={() => reactFlowInstance?.zoomOut()}
          title="Zoom out"
        >
          <Minus className={embedded ? "h-3.5 w-3.5" : undefined} />
        </Button>
        <Button
          variant="outline"
          size={embedded ? "xs" : "icon"}
          className={embedded ? "h-7 w-8 bg-black p-0" : undefined}
          onClick={() => reactFlowInstance?.fitView()}
          title="Fit view (F)"
        >
          <Maximize className={embedded ? "h-3.5 w-3.5" : undefined} />
        </Button>
      </div>

      {legend.length > 0 && (
        <div className="absolute bottom-2 left-2 z-10 flex max-h-[60%] flex-col gap-1 overflow-y-auto rounded-md border bg-card px-3 py-2 shadow-sm">
          <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-widest text-muted-foreground">
            Compartments
          </div>
          {legend.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 text-xs">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="truncate font-medium">{entry.id}</span>
              <span className="ml-auto pl-2 font-mono text-muted-foreground">
                {entry.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
    </ImportanceContext.Provider>
  );
};

export default NeuronModelTree;
