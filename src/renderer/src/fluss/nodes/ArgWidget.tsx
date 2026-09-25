import { RunEventKind } from "@/fluss/api/graphql";
import { NodeDescription, NodeHeader, NodeShowLayout, NodeTitle } from "@/fluss/base/NodeShow";
import { OutStream } from "@/fluss/base/Outstream";
import { ArgNodeProps } from "@/fluss/types";
import { portToLabel } from "@/rekuest/widgets/utils";
import React from "react";
import { useFlowAdapter } from "./adapter";
import { errorClassName, statusClassName } from "./status";

const BASE = "border-chart-3/40 shadow-chart-3/10 dark:border-chart-3 dark:shadow-blue/20 shadow-xl";

const ArgWidgetInner: React.FC<ArgNodeProps> = ({ data: { outs }, id, selected }) => {
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
        <NodeTitle>Inputs {status?.kind === RunEventKind.Complete && "✅"}</NodeTitle>
        <NodeDescription className="w-auto min-w-0 max-w-[16rem]">{outs.at(0)?.map((o) => portToLabel(o)).join(" | ")}</NodeDescription>
      </NodeHeader>
      {outs.map((s, index) => (
        <OutStream key={index} stream={s} id={index} length={outs.length} />
      ))}
    </NodeShowLayout>
  );
};

export const ArgWidget = React.memo(ArgWidgetInner);
