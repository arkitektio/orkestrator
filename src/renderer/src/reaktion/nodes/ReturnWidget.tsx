import { RunEventKind } from "@/reaktion/api/graphql";
import { InStream } from "@/reaktion/base/Instream";
import { NodeDescription, NodeHeader, NodeShowLayout, NodeTitle } from "@/reaktion/base/NodeShow";
import { ReturnNodeProps } from "@/reaktion/types";
import { portToLabel } from "@/rekuest/widgets/utils";
import React from "react";
import { useFlowAdapter } from "./adapter";
import { errorClassName, statusClassName } from "./status";

const BASE = "border-chart-3/40 shadow-chart-3/10 dark:border-chart-3 dark:shadow-blue/20 shadow-xl";

const ReturnWidgetInner: React.FC<ReturnNodeProps> = ({ data: { ins }, id, selected }) => {
  const adapter = useFlowAdapter();
  const errors = adapter.useNodeErrors(id);
  const status = adapter.useNodeStatus(id);

  return (
    <NodeShowLayout
      className={statusClassName(status, errorClassName(errors.length > 0, BASE))}
      id={id}
      selected={selected}
    >
      <NodeHeader>
        <NodeTitle>Outputs {status?.kind === RunEventKind.Complete && "✅"}</NodeTitle>
        <NodeDescription className="w-auto min-w-0 max-w-[16rem]">{ins.at(0)?.map((o) => portToLabel(o)).join(" | ")}</NodeDescription>
      </NodeHeader>
      {ins.map((s, index) => (
        <InStream key={index} stream={s as never} id={index} length={ins.length} />
      ))}
    </NodeShowLayout>
  );
};

export const ReturnWidget = React.memo(ReturnWidgetInner);
