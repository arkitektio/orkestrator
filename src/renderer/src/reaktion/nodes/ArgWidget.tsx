import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RunEventKind } from "@/reaktion/api/graphql";
import { NodeShowLayout } from "@/reaktion/base/NodeShow";
import { OutStream } from "@/reaktion/base/Outstream";
import { ArgNodeProps } from "@/reaktion/types";
import { portToLabel } from "@/rekuest/widgets/utils";
import React from "react";
import { useFlowAdapter } from "./adapter";
import { errorClassName, statusClassName } from "./status";

const BASE = "border-blue-400/40 shadow-blue-400/10 dark:border-blue-300 dark:shadow-blue/20 shadow-xl";

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
      <CardHeader className="p-4">
        <CardTitle>Inputs {status?.kind === RunEventKind.Complete && "✅"}</CardTitle>
        <CardDescription>{outs.at(0)?.map((o) => portToLabel(o)).join(" | ")}</CardDescription>
      </CardHeader>
      {outs.map((s, index) => (
        <OutStream key={index} stream={s} id={index} length={outs.length} />
      ))}
    </NodeShowLayout>
  );
};

export const ArgWidget = React.memo(ArgWidgetInner);
