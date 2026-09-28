import { Card } from "@/core/ui/card";
import { useActionDescription } from "@/core/ports/engine/ActionDescription";
import { Args } from "@/fluss/base/Args";
import { Constants } from "@/fluss/base/Constants";
import { InStream } from "@/fluss/base/Instream";
import { NodeDescription, NodeHeader, NodeShowLayout, NodeTitle } from "@/fluss/base/NodeShow";
import { OutStream } from "@/fluss/base/Outstream";
import { RekuestFilterNodeProps } from "@/fluss/types";
import React, { useMemo } from "react";
import { useFlowAdapter } from "./adapter";
import { errorClassName, statusClassName } from "./status";

const BASE = "border-border/40 shadow-accent/30 dark:border-accent dark:shadow-accent/20 shadow-xl";

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
      minWidth={expanded ? 360 : 240}
    >
      {ins.map((s, index) => (
        <InStream key={index} stream={s} id={index} length={ins.length} />
      ))}
      <NodeHeader>
        <Card className="absolute top-0 left-[50%] translate-x-[-50%] translate-y-[-50%] px-3 py-0.5 text-xs">
          Conditional
        </Card>
        <NodeTitle onDoubleClick={() => setExpanded((e) => !e)}>
          <span className="max-w-[15rem] truncate">{data?.title}</span>
        </NodeTitle>
        <NodeDescription>{description}</NodeDescription>
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
      </NodeHeader>
      {outs.map((s, index) => (
        <OutStream key={index} stream={s} id={index} length={outs.length} />
      ))}
    </NodeShowLayout>
  );
};

export const RekuestFilterWidget = React.memo(RekuestFilterWidgetInner);
