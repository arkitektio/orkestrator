import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { RekuestTask } from "@/linkers";
import { FlowFragment } from "@/reaktion/api/graphql";
import { DetailImplementationFragment } from "@/rekuest/api/graphql";
import { ImplementationActionButton } from "@/rekuest/buttons/ImplementationActionButton";
import { EyeOpenIcon, LetterCaseToggleIcon } from "@radix-ui/react-icons";
import { Controls, useNodesState } from "@xyflow/react";
import { AnimatePresence } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Graph } from "../base/Graph";
import { FlowAdapterProvider, showAdapter } from "../nodes/adapter";
import { flowEdgeTypes, flowNodeTypes } from "../nodes/flowTypes";
import { edges_to_flowedges, nodes_to_flownodes } from "../utils";
import { ShowRiverContext, ShowRiverContextType } from "./context";

export type Props = {
  flow: FlowFragment;
  template?: DetailImplementationFragment;
};

/** Read-only rendering of a flow (implementation pages, carousels). */
export const ShowFlow: React.FC<Props> = ({ flow, template }) => {
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);

  // Nodes/edges are derived from the fragment exactly once per flow; React
  // Flow owns node measurements through `useNodesState`.
  const initialNodes = useMemo(() => nodes_to_flownodes(flow.graph?.nodes || []), [flow]);
  const edges = useMemo(() => edges_to_flowedges(flow.graph?.edges || []), [flow]);
  const globals = flow.graph?.globals ?? [];
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  useEffect(() => setNodes(initialNodes), [initialNodes, setNodes]);

  const navigate = useNavigate();

  const context = useMemo<ShowRiverContextType>(
    () => ({ flow, template, showEdgeLabels }),
    [flow, template, showEdgeLabels],
  );

  return (
    <ShowRiverContext.Provider value={context}>
      <FlowAdapterProvider adapter={showAdapter}>
        <div className="h-full w-full" data-disableselect>
          <div className="flex flex-grow h-full w-full relative">
            <AnimatePresence>
              {globals.length > 0 && (
                <div className="absolute top-0 left-0 ml-3 mt-5 z-50">
                  <Card className="max-w-md">
                    <CardHeader>
                      <CardDescription>Globals</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-xs text-muted-foreground">
                        These are global variables that will be constants to the whole workflow and are
                        mapping to the following ports:
                      </CardDescription>
                    </CardContent>
                  </Card>
                </div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {template && (
                <div className="absolute bottom-0 right-0 ml-3 mt-5 z-50">
                  <ImplementationActionButton
                    id={template.id}
                    onAssign={(e) => navigate(RekuestTask.linkBuilder(e.id))}
                  >
                    <Button> Run </Button>
                  </ImplementationActionButton>
                </div>
              )}
            </AnimatePresence>
            <Graph
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              elementsSelectable={true}
              nodeTypes={flowNodeTypes}
              edgeTypes={flowEdgeTypes}
              fitView
              nodesConnectable={false}
              nodesDraggable={false}
              nodesFocusable={false}
              attributionPosition="bottom-right"
            >
              <Controls className="flex flex-row bg-white gap-2 rounded-md overflow-hidden px-2">
                <button
                  onClick={() => setShowEdgeLabels((v) => !v)}
                  className={cn("hover:bg-primary", showEdgeLabels ? "text-muted" : "text-gray-400")}
                >
                  <LetterCaseToggleIcon />
                </button>
                <Sheet>
                  <SheetTrigger className={cn("hover:bg-primary", "text-muted disabled:text-gray-200")}>
                    <EyeOpenIcon />
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Debug Screen</SheetTitle>
                      <SheetDescription></SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-full dark:text-white">
                      <pre>{JSON.stringify(nodes, null, 2)}</pre>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </Controls>
            </Graph>
          </div>
        </div>
      </FlowAdapterProvider>
    </ShowRiverContext.Provider>
  );
};
