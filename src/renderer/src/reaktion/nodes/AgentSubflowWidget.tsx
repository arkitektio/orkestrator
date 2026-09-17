import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NodeShowLayout } from "@/reaktion/base/NodeShow";
import { AgentSubFlownNodeProps } from "@/reaktion/types";
import { useAgentsQuery } from "@/rekuest/api/graphql";
import { NodeResizeControl } from "@xyflow/react";
import React, { useMemo } from "react";
import { EditActions, useFlowAdapter } from "./adapter";

// Room for an action card (240–300px wide) at the child offset, with the same
// margin on the right.
const MIN_WIDTH = 360;
const MIN_HEIGHT = 180;

const ResizeHandle = ({ selected }: { selected?: boolean }) => (
  <NodeResizeControl
    position="bottom-right"
    minWidth={MIN_WIDTH}
    minHeight={MIN_HEIGHT}
    maxWidth={1200}
    maxHeight={900}
    className="nodrag nopan nowheel z-40"
  >
    <div
      className={[
        "flex h-6 w-6 items-center justify-center rounded-md border border-amber-300/80 bg-background/95 text-amber-600 shadow-md backdrop-blur-sm",
        "nodrag nopan nowheel",
        selected ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    >
      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M11.3536 11.3536C11.5488 11.1583 11.5488 10.8417 11.3536 10.6465L4.70711 4L9 4C9.27614 4 9.5 3.77614 9.5 3.5C9.5 3.22386 9.27614 3 9 3L3.5 3C3.36739 3 3.24021 3.05268 3.14645 3.14645C3.05268 3.24022 3 3.36739 3 3.5L3 9.00001C3 9.27615 3.22386 9.50001 3.5 9.50001C3.77614 9.50001 4 9.27615 4 9.00001V4.70711L10.6464 11.3536C10.8417 11.5488 11.1583 11.5488 11.3536 11.3536Z"
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    </div>
  </NodeResizeControl>
);

/** Editor-only chrome: agent availability check, resolution toggle, empty hint. */
const EditorControls = ({
  id,
  data,
  edit,
}: {
  id: string;
  data: AgentSubFlownNodeProps["data"];
  edit: EditActions;
}) => {
  const adapter = useFlowAdapter();
  const childCount = adapter.useSubflowChildCount(id);
  const variables = useMemo(
    () => ({ filters: { appIdentifier: data.appFilter, versionNumber: data.versionFilter } }),
    [data.appFilter, data.versionFilter],
  );
  const { error: agentError } = useAgentsQuery({ variables });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="nodrag"
        onClick={(e) => {
          e.stopPropagation();
          edit.setAutoResolvable(!data.autoResolvable, id);
        }}
      >
        {data.autoResolvable ? "Auto-Resolvable" : "Manual Resolution"}
      </Button>
      {agentError && (
        <div className="px-4 pb-4">
          <div className="flex min-h-[92px] items-center justify-center rounded-lg border border-dashed border-amber-300/80 bg-background/70 text-center text-sm text-muted-foreground dark:border-amber-700/70 dark:bg-background/20">
            Error fetching agents.
          </div>
        </div>
      )}
      {childCount === 0 && (
        <div className="px-4 pb-4">
          <div className="flex min-h-[92px] items-center justify-center rounded-lg border border-dashed border-amber-300/80 bg-background/70 text-center text-sm text-muted-foreground dark:border-amber-700/70 dark:bg-background/20">
            Click the node to add an implementation.
          </div>
        </div>
      )}
    </>
  );
};

const AgentSubflowWidgetInner: React.FC<AgentSubFlownNodeProps> = ({ data, id, selected }) => {
  const edit = useFlowAdapter().useEditActions();

  return (
    <>
      {edit && <ResizeHandle selected={selected} />}
      <NodeShowLayout
        id={id}
        selected={selected}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        maxWidth={1200}
        maxHeight={900}
        showResizeControl={false}
        className="overflow-hidden border-primary/70 bg-chart-2/10 shadow-primary/40"
      >
        <div className="relative h-full min-h-[180px] w-full">
          <Card className="h-full min-h-[180px] w-full border-0 bg-transparent shadow-none">
            <CardHeader className="custom-drag-handle cursor-grab px-4 active:cursor-grabbing w-full">
              <CardTitle className="text-sm font-medium flex flex-row gap-2 justify-between w-full">
                <span className="rounded bg-chart-1/10 px-1 py-0.5 text-xs text-primary">
                  {data.appFilter || "any"}
                  {data.versionFilter ? `:v${data.versionFilter}` : ""}
                </span>
                <span className="flex-grow" />
                {edit && (
                  <span className="text-xs text-muted-foreground">
                    {data.autoResolvable ? "auto" : "manual"}
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs">{data.description}</CardDescription>
            </CardHeader>
            {edit && (
              <div className="px-4 pb-4 flex flex-col gap-2">
                <EditorControls id={id} data={data} edit={edit} />
              </div>
            )}
          </Card>
        </div>
      </NodeShowLayout>
    </>
  );
};

export const AgentSubflowWidget = React.memo(AgentSubflowWidgetInner);
