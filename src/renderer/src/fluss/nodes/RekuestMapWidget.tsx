import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ReturnsContainer } from "@/components/widgets/returns/ReturnsContainer";
import { ActionDescription, useActionDescription } from "@/lib/rekuest/ActionDescription";
import { RunEventKind } from "@/fluss/api/graphql";
import { Args } from "@/fluss/base/Args";
import { Constants } from "@/fluss/base/Constants";
import { InStream } from "@/fluss/base/Instream";
import { NodeDescription, NodeHeader, NodeShowLayout, NodeTitle } from "@/fluss/base/NodeShow";
import { OutStream } from "@/fluss/base/Outstream";
import { FlussArgPortFragment } from "@/fluss/api/graphql";
import { RekuestMapNodeProps } from "@/fluss/types";
import { ReturnPortFragment } from "@/rekuest/api/graphql";
import { useWidgetRegistry } from "@/rekuest/widgets/WidgetsContext";
import { GearIcon } from "@radix-ui/react-icons";
import React, { useMemo } from "react";
import { EditActions, useFlowAdapter } from "./adapter";
import { errorClassName, statusClassName } from "./status";

const BASE = "border-chart-3/40 shadow-chart-3/10 dark:border-chart-3 dark:shadow-blue/20 shadow-xl";

// Wide enough for a title plus a two-to-three line description; the expanded
// form is a container-query root (zero intrinsic width), so it needs its own floor.
const MIN_WIDTH = 240;
const EXPANDED_MIN_WIDTH = 360;

const EditableConstants = ({
  id,
  ins,
  constants,
  constantsMap,
  edit,
}: {
  id: string;
  ins: RekuestMapNodeProps["data"]["ins"];
  constants: FlussArgPortFragment[];
  constantsMap: Record<string, unknown>;
  edit: EditActions;
}) => (
  <div className="w-full @container">
    {(ins.at(0)?.length ?? 0) > 0 && (
      <>
        <div className="text-xs text-muted-foreground inline">Args</div>
        <Args
          instream={ins.at(0) || []}
          id={0}
          onClick={(streamIndex, itemIndex) => edit.moveStreamToConstants(id, streamIndex, itemIndex)}
          constream={[]}
        />
      </>
    )}
    <div className="text-xs text-muted-foreground inline">Constants</div>
    <Constants
      ports={constants}
      overwrites={constantsMap}
      onToArg={(port) => edit.moveConstantToStream(id, port.key, 0)}
      onToGlobal={(port, key) => edit.moveConstantToGlobals(id, port.key, key)}
      onSubmit={(values) => edit.updateData({ constantsMap: values }, id)}
      path={[]}
    />
  </div>
);

const TrackReturns = ({
  outs,
  value,
}: {
  outs: RekuestMapNodeProps["data"]["outs"];
  value: unknown[];
}) => {
  const { registry } = useWidgetRegistry();
  const ports = (outs.at(0) || []) as unknown as ReturnPortFragment[];
  const values = useMemo(
    () => Object.fromEntries(ports.map((port, index) => [port.key, value[index]])),
    [ports, value],
  );
  return <ReturnsContainer ports={ports} values={values} registry={registry} />;
};

const RekuestMapWidgetInner: React.FC<RekuestMapNodeProps> = ({
  data: { ins, outs, constants, ...data },
  id,
  selected,
}) => {
  const adapter = useFlowAdapter();
  const edit = adapter.useEditActions();
  const errors = adapter.useNodeErrors(id);
  const status = adapter.useNodeStatus(id);
  const dependency = adapter.useDependency(id);
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
      minWidth={expanded ? EXPANDED_MIN_WIDTH : MIN_WIDTH}
    >
      {ins.map((s, index) => (
        <InStream key={index} stream={s} id={index} length={ins.length} />
      ))}

      <NodeHeader>
        <NodeTitle onDoubleClick={() => setExpanded((e) => !e)}>
          <span className="flex min-w-0 items-center gap-2">
            <span className="max-w-[15rem] truncate">{data?.title}</span>
            {status?.kind === RunEventKind.Complete && "✅"}
          </span>
          {edit && (
            <Sheet>
              <SheetTrigger className="nodrag text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
                <GearIcon />
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>These are advanced settings</SheetTitle>
                  <SheetDescription asChild>
                    <div>
                      <EditableConstants
                        id={id}
                        ins={ins}
                        constants={nonGlobalConstants}
                        constantsMap={data.constantsMap}
                        edit={edit}
                      />
                    </div>
                  </SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          )}
        </NodeTitle>
        {status?.kind === RunEventKind.Error && (
          <NodeDescription className="text-red-300">❌ {status.exception}</NodeDescription>
        )}
        <NodeDescription>
          <ActionDescription description={description} />
          {dependency && (
            <div className="mt-1 text-muted-foreground/60">
              {dependency.appFilter ?? "any app"}
              {dependency.versionFilter ? `:${dependency.versionFilter}` : ""}
            </div>
          )}
        </NodeDescription>
        {expanded && edit && (
          <EditableConstants
            id={id}
            ins={ins}
            constants={nonGlobalConstants}
            constantsMap={data.constantsMap}
            edit={edit}
          />
        )}
        {expanded && status?.kind === RunEventKind.Next && Array.isArray(status.value) && (
          <TrackReturns outs={outs} value={status.value} />
        )}
      </NodeHeader>

      {outs.map((s, index) => (
        <OutStream key={index} stream={s} id={index} length={outs.length} />
      ))}
    </NodeShowLayout>
  );
};

export const RekuestMapWidget = React.memo(RekuestMapWidgetInner);
