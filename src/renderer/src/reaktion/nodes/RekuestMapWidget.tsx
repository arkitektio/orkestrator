import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ReturnsContainer } from "@/components/widgets/returns/ReturnsContainer";
import { ActionDescription, useActionDescription } from "@/lib/rekuest/ActionDescription";
import { RunEventKind } from "@/reaktion/api/graphql";
import { Args } from "@/reaktion/base/Args";
import { Constants } from "@/reaktion/base/Constants";
import { InStream } from "@/reaktion/base/Instream";
import { NodeShowLayout } from "@/reaktion/base/NodeShow";
import { OutStream } from "@/reaktion/base/Outstream";
import { FlussArgPortFragment } from "@/reaktion/api/graphql";
import { RekuestMapNodeProps } from "@/reaktion/types";
import { ReturnPortFragment } from "@/rekuest/api/graphql";
import { useWidgetRegistry } from "@/rekuest/widgets/WidgetsContext";
import { GearIcon } from "@radix-ui/react-icons";
import React, { useMemo } from "react";
import { EditActions, useFlowAdapter } from "./adapter";
import { errorClassName, statusClassName } from "./status";

const BASE = "border-blue-400/40 shadow-blue-400/10 dark:border-blue-300 dark:shadow-blue/20 shadow-xl";

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
    >
      {ins.map((s, index) => (
        <InStream key={index} stream={s} id={index} length={ins.length} />
      ))}

      <CardHeader className="p-4">
        <CardTitle onDoubleClick={() => setExpanded((e) => !e)}>
          <div className="flex justify-between">
            {data?.title}
            {edit && (
              <div className="group-hover:opacity-100 opacity-0 transition-all duration-3000">
                <Sheet>
                  <SheetTrigger>
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
              </div>
            )}
          </div>
          {status && (
            <div className="text-center font-light text-xs p-1">
              {status.kind === RunEventKind.Complete && "✅"}
              {status.kind === RunEventKind.Error && (
                <span className="text-red-300">❌ {status.exception}</span>
              )}
            </div>
          )}
        </CardTitle>
        <CardDescription>
          <ActionDescription description={description} />
          {dependency && (
            <div className="text-xs text-muted-foreground mt-1">
              {dependency.appFilter ?? "any app"}
              {dependency.versionFilter ? `:${dependency.versionFilter}` : ""}
            </div>
          )}
        </CardDescription>
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
      </CardHeader>

      {outs.map((s, index) => (
        <OutStream key={index} stream={s} id={index} length={outs.length} />
      ))}
    </NodeShowLayout>
  );
};

export const RekuestMapWidget = React.memo(RekuestMapWidgetInner);
