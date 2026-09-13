import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ActionDescription } from "@/lib/rekuest/ActionDescription";
import { cn } from "@/lib/utils";
import {
  ReactiveImplementation,
  ReactiveNodeFragment,
  RunEventKind,
} from "@/reaktion/api/graphql";
import { InStream } from "@/reaktion/base/Instream";
import { OutStream } from "@/reaktion/base/Outstream";
import { portToLabel } from "@/rekuest/widgets/utils";
import React from "react";
import { FlowNodeData, ReactiveNodeProps } from "../../types";
import { useLatestNodeEvent } from "../hooks/useLatestNodeEvent";
import JustTrack from "./reactive/JustTrack";
import Math from "./reactive/Math";
import TriangleToRight from "./reactive/TriangleToRight";

export type ShapeProps = {
  implementation: ReactiveImplementation;
  data: FlowNodeData<ReactiveNodeFragment>;
  id: string;
  className?: string;
};

export type ContextMenuProps = {
  implementation: ReactiveImplementation;
  data: FlowNodeData<ReactiveNodeFragment>;
  id: string;
};


export const Default = ({ data, className }: ShapeProps) => {
  return (
    <>
      <Card
        className={cn(
          "rounded-md border-blue-400/40 shadow-blue-400/20 dark:border-blue-300 dark:shadow-blue/20 shadow-xl",
          className,
        )}
      >
        <CardHeader className="p-1">
          <Tooltip>
            <TooltipTrigger>
              <CardTitle className="text-sm font-light">
                <ActionDescription
                  description={data.title}
                  variables={{ ...data.constantsMap, __ports: data.ins }}
                />
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent>
              <CardDescription className="text-xs">
                <ActionDescription
                  description={data.description}
                  variables={data.constantsMap}
                />
              </CardDescription>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
      </Card>
    </>
  );
};

export const Select = ({ data, className: _className }: ShapeProps) => {
  return (
    <>
      <Card className="rounded-md border-blue-400/40 shadow-blue-400/20 dark:border-blue-300 dark:shadow-blue/20 shadow-xl">
        <CardHeader className="p-1">
          <Tooltip>
            <TooltipTrigger>
              <CardTitle className="text-sm font-light">
                Select {data.voids.at(data.constantsMap.i)?.key}
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent>
              <CardDescription className="text-xs">
                <ActionDescription
                  description={data.description}
                  variables={data.constantsMap}
                />
              </CardDescription>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
      </Card>
    </>
  );
};





export const Reorder = ({ data }: ShapeProps) => {
  return (
    <>
      <Card className="rounded-md border-blue-400/40 shadow-blue-400/20 dark:border-blue-300 dark:shadow-blue/20 shadow-xl">
        <CardHeader className="p-1">
          <Tooltip>
            <TooltipTrigger>
              <>
                <CardTitle className="text-sm font-light">Reorders</CardTitle>
                <CardDescription>
                  {data.constantsMap.map && (
                    <>
                      {Object.keys(data.constantsMap.map).map((key) => (
                        <div className="text-xs">
                          {" "}
                          {data.ins.at(0)?.at(parseInt(key))?.kind} to{" "}
                          {
                            data.outs.at(0)?.at(data.constantsMap.map[key])
                              ?.kind
                          }
                        </div>
                      ))}
                    </>
                  )}
                </CardDescription>
              </>
            </TooltipTrigger>
            <TooltipContent>
              <CardDescription className="text-xs">Just a</CardDescription>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
      </Card>
    </>
  );
};

export const ToList = ({ data }: ShapeProps) => {
  const firstItem = data?.ins?.at(0)?.at(0);
  const outItem = data?.outs?.at(0)?.at(0);
  return (
    <>
      <Card className="rounded-md">
        <CardHeader className="p-1">
          <Tooltip>
            <TooltipTrigger>
              <CardTitle className="text-xs">{data.title}</CardTitle>
            </TooltipTrigger>
            <TooltipContent>
              <CardDescription className="text-xs">
                {data.description}
                <div className="text-xs mt-0">
                  here {firstItem && portToLabel(firstItem)} to{" "}
                  {outItem && portToLabel(outItem)}
                </div>
              </CardDescription>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
      </Card>
    </>
  );
};

export const BufferCount = ({ data }: ShapeProps) => {
  return (
    <>
      <Card className="rounded-md">
        Buffer {data.constantsMap.count}
      </Card>
    </>
  );
};

export const DefaultContext = ({ data }: ContextMenuProps) => {
  return (
    <>
      <Card className="rounded-md">
        <CardHeader className="p-1">
          <Tooltip>
            <TooltipTrigger>
              <CardTitle className="text-xs">{data.title}</CardTitle>
            </TooltipTrigger>
            <TooltipContent>
              <CardDescription className="text-xs">
                {data.description}
              </CardDescription>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
      </Card>
    </>
  );
};

export const ChangeZipImplementation = ({ data, id: _id }: ContextMenuProps) => {
  return (
    <>
      <div className="text-xs">Current: {data.implementation}</div>
    </>
  );
};

const shapeMap: { [key in ReactiveImplementation]: React.FC<ShapeProps> } = {
  [ReactiveImplementation.Combinelatest]: TriangleToRight,
  [ReactiveImplementation.Withlatest]: TriangleToRight,
  [ReactiveImplementation.Zip]: TriangleToRight,
  [ReactiveImplementation.Gate]: Default,
  [ReactiveImplementation.Filter]: Default,
  [ReactiveImplementation.Split]: Default,
  [ReactiveImplementation.ToList]: ToList,
  [ReactiveImplementation.BufferComplete]: Default,
  [ReactiveImplementation.Chunk]: Default,
  [ReactiveImplementation.Reorder]: Default,
  [ReactiveImplementation.BufferCount]: BufferCount,
  [ReactiveImplementation.Omit]: Default,
  [ReactiveImplementation.Add]: Math,
  [ReactiveImplementation.All]: Default,
  [ReactiveImplementation.And]: Default,
  [ReactiveImplementation.BufferUntil]: Default,
  [ReactiveImplementation.Delay]: Default,
  [ReactiveImplementation.DelayUntil]: Default,
  [ReactiveImplementation.Divide]: Default,
  [ReactiveImplementation.Ensure]: Default,
  [ReactiveImplementation.Foreach]: Default,
  [ReactiveImplementation.If]: Default,
  [ReactiveImplementation.Modulo]: Default,
  [ReactiveImplementation.Power]: Default,
  [ReactiveImplementation.Prefix]: Default,
  [ReactiveImplementation.Subtract]: Math,
  [ReactiveImplementation.Multiply]: Math,
  [ReactiveImplementation.Suffix]: Math,
  [ReactiveImplementation.Select]: Select,
  [ReactiveImplementation.Just]: JustTrack,
};

const shapeForImplementation = (
  implementation: ReactiveImplementation,
): React.FC<ShapeProps> => {
  return shapeMap[implementation] || Default;
};

export const ReactiveTrackNodeWidget: React.FC<ReactiveNodeProps> = ({
  data,
  id,
}) => {
  const latestEvent = useLatestNodeEvent(id);

  const Shape = shapeForImplementation(data.implementation);


  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <div className="group custom-drag-handle relative">
            {data.ins.map((s, index) => (
              <InStream stream={s} id={index} length={data.ins.length} />
            ))}
            <Shape
              implementation={data.implementation}
              data={data}
              id={id}
              className={cn(
                "border-blue-400/40 shadow-blue-400/10 dark:border-blue-300 dark:shadow-blue/20 shadow-xl",
                latestEvent?.kind === RunEventKind.Error &&
                "border-red-400 dark:border-red-300  dark:shadow-red/20 shadow-red-400/10",
                latestEvent?.kind === RunEventKind.Complete &&
                "border-green-400 dark:border-green-300  dark:shadow-green/20 shadow-green-400/10",
              )}
            />

            {data.outs.map((s, index) => (
              <OutStream stream={s} id={index} length={data.outs.length} />
            ))}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <div className="text-xs">
            {data.implementation} {id}
          </div>
          <div className="text-xs">Latest Event: {latestEvent?.kind}</div>
          <div className="text-xs">Latest Event: {latestEvent?.id}</div>
          <div className="text-xs">
            Latest Event:{" "}
          </div>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
};
