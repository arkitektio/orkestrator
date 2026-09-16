import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RunEventKind } from "@/reaktion/api/graphql";
import { InStream } from "@/reaktion/base/Instream";
import { NodeShowLayout } from "@/reaktion/base/NodeShow";
import { ReturnNodeProps } from "@/reaktion/types";
import { portToLabel } from "@/rekuest/widgets/utils";
import React from "react";
import { useFlowAdapter } from "./adapter";
import { errorClassName, statusClassName } from "./status";

const BASE = "border-blue-400/40 shadow-blue-400/10 dark:border-blue-300 dark:shadow-blue/20 shadow-xl";

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
      <CardHeader className="p-4 group">
        <CardTitle>Outputs {status?.kind === RunEventKind.Complete && "✅"}</CardTitle>
        <CardDescription>{ins.at(0)?.map((o) => portToLabel(o)).join(" | ")}</CardDescription>
      </CardHeader>
      {ins.map((s, index) => (
        <InStream key={index} stream={s as never} id={index} length={ins.length} />
      ))}
    </NodeShowLayout>
  );
};

export const ReturnWidget = React.memo(ReturnWidgetInner);
