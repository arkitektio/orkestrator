import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActionDescription } from "@/lib/rekuest/ActionDescription";
import { Args } from "@/reaktion/base/Args";
import { Constants } from "@/reaktion/base/Constants";
import { InStream } from "@/reaktion/base/Instream";
import { NodeShowLayout } from "@/reaktion/base/NodeShow";
import { OutStream } from "@/reaktion/base/Outstream";
import { RekuestFilterNodeProps } from "@/reaktion/types";
import React, { useMemo } from "react";
import { useFlowAdapter } from "./adapter";
import { errorClassName, statusClassName } from "./status";

const BASE = "border-gray-800/40 shadow-accent/30 dark:border-accent dark:shadow-accent/20 shadow-xl";

const RekuestFilterWidgetInner: React.FC<RekuestFilterNodeProps> = ({
  data: { ins, outs, constants, ...data },
  id,
  selected,
}) => {
  const adapter = useFlowAdapter();
  const edit = adapter.useEditActions();
  const errors = adapter.useNodeErrors(id);
  const status = adapter.useNodeStatus(id);
  const [expanded, setExpanded] = React.useState(false);

  const description = useActionDescription({ description: data.description, variables: data.constantsMap });
  const nonGlobalConstants = useMemo(
    () => constants.filter((port) => data.globalsMap?.[port.key] == null),
    [constants, data.globalsMap],
  );

  return (
    <NodeShowLayout
      id={id}
      className={statusClassName(status, errorClassName(errors.length > 0, BASE))}
      selected={selected}
    >
      {ins.map((s, index) => (
        <InStream key={index} stream={s} id={index} length={ins.length} />
      ))}
      <CardHeader className="p-4">
        <CardTitle onDoubleClick={() => setExpanded((e) => !e)}>
          <Card className="absolute top-0 left-[50%] translate-x-[-50%] px-3 translate-y-[-50%] text-sm">
            Conditional
          </Card>
          <div className="text-xl font-bold">{data?.title}</div>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        {expanded && edit && (
          <div>
            <div className="text-xs text-muted-foreground inline">Args</div>
            <Args
              instream={ins.at(0) || []}
              id={0}
              onClick={(streamIndex, itemIndex) => edit.filterArgToConstant(id, streamIndex, itemIndex)}
              constream={[]}
            />
            <div className="text-xs text-muted-foreground inline">Constants</div>
            <Constants
              ports={nonGlobalConstants}
              overwrites={data.constantsMap}
              onToArg={(port) => edit.filterConstantToArg(id, port.key)}
              onToGlobal={(port, key) => edit.moveConstantToGlobals(id, port.key, key)}
              onSubmit={(values) => edit.updateData({ constantsMap: values }, id)}
              path={[]}
            />
          </div>
        )}
      </CardHeader>
      {outs.map((s, index) => (
        <OutStream key={index} stream={s} id={index} length={outs.length} />
      ))}
    </NodeShowLayout>
  );
};

export const RekuestFilterWidget = React.memo(RekuestFilterWidgetInner);
