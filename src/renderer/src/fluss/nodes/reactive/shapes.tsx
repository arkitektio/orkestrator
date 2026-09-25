import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ActionDescription } from "@/lib/ports/ActionDescription";
import { cn } from "@/lib/utils";
import { ReactiveImplementation, ReactiveNodeFragment } from "@/fluss/api/graphql";
import { FlowNodeData, ReactiveNodeData } from "@/fluss/types";
import { portToLabel } from "@/lib/ports/utils";
import { useUpdateNodeInternals } from "@xyflow/react";
import React from "react";
import { useFlowAdapter } from "../adapter";

export type ShapeProps = {
  implementation: ReactiveImplementation;
  data: FlowNodeData<ReactiveNodeFragment>;
  id: string;
  className?: string;
};

const CARD = "rounded-md border-chart-3/40 shadow-chart-3/20 dark:border-chart-3 dark:shadow-blue/20 shadow-xl";

export const TriangleToRight = ({ implementation }: ShapeProps) => (
  <svg height="40" width="40">
    <polygon
      points="0,40 40,20 0,0"
      style={{ strokeWidth: 1, stroke: "hsl(var(--accent))", fill: "hsl(var(--accent))" }}
    />
    <text>{implementation}</text>
  </svg>
);

export const Default = ({ data, className }: ShapeProps) => (
  <Card className={cn(CARD, className)}>
    <CardHeader className="p-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <CardTitle className="text-sm font-light">
            <ActionDescription description={data.title} variables={{ ...data.constantsMap, __ports: data.ins }} />
          </CardTitle>
        </TooltipTrigger>
        <TooltipContent>
          <CardDescription className="text-xs">
            <ActionDescription description={data.description} variables={data.constantsMap} />
          </CardDescription>
        </TooltipContent>
      </Tooltip>
    </CardHeader>
  </Card>
);

export const Select = ({ data, className }: ShapeProps) => (
  <Card className={cn(CARD, className)}>
    <CardHeader className="p-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <CardTitle className="text-sm font-light">
            Select {data.outs.at(0)?.at(0)?.key ?? data.voids.at(data.constantsMap?.index)?.key}
          </CardTitle>
        </TooltipTrigger>
        <TooltipContent>
          <CardDescription className="text-xs">
            <ActionDescription description={data.description} variables={data.constantsMap} />
          </CardDescription>
        </TooltipContent>
      </Tooltip>
    </CardHeader>
  </Card>
);

export const Just = ({ data, className }: ShapeProps) => (
  <Card className={cn(CARD, className)}>
    <CardHeader className="p-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <CardTitle className="text-sm font-light">
            Just <pre className="inline">{String(data.constantsMap?.value ?? "")}</pre>
          </CardTitle>
        </TooltipTrigger>
        <TooltipContent>
          <CardDescription className="text-xs">Just a {String(data.constantsMap?.value ?? "")}</CardDescription>
        </TooltipContent>
      </Tooltip>
    </CardHeader>
  </Card>
);

export const MathShape = ({ data, implementation, className }: ShapeProps) => (
  <Card className={cn(CARD, className)}>
    <CardHeader className="p-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <CardTitle className="text-sm font-light">
            {implementation} <pre className="inline">{String(data.constantsMap?.value ?? "")}</pre>
          </CardTitle>
        </TooltipTrigger>
        <TooltipContent>
          <CardDescription className="text-xs">
            {implementation} {String(data.constantsMap?.value ?? "")}
          </CardDescription>
        </TooltipContent>
      </Tooltip>
    </CardHeader>
  </Card>
);

export const Reorder = ({ data, className }: ShapeProps) => {
  const map = (data.constantsMap?.map ?? {}) as Record<string, number>;
  return (
    <Card className={cn(CARD, className)}>
      <CardHeader className="p-1">
        <CardTitle className="text-sm font-light">Reorders</CardTitle>
        <CardDescription>
          {Object.keys(map).map((key) => (
            <div className="text-xs" key={key}>
              {data.ins.at(0)?.at(Number(key))?.kind} to {data.outs.at(0)?.at(map[key])?.kind}
            </div>
          ))}
        </CardDescription>
      </CardHeader>
    </Card>
  );
};

/** Editable stepper in the editor, plain label elsewhere. */
export const BufferCount = ({ data, id, className }: ShapeProps) => {
  const edit = useFlowAdapter().useEditActions();
  const updateNodeInternals = useUpdateNodeInternals();
  const count = Number(data.constantsMap?.count ?? 0);

  const updateCount = (next: number) => {
    edit?.updateData({ constantsMap: { ...data.constantsMap, count: next } }, id);
    updateNodeInternals(id);
  };

  return (
    <Card className={cn(CARD, className)}>
      <CardHeader className="p-1">
        <CardTitle className="text-sm font-light">Buffer</CardTitle>
        <CardDescription>
          {edit ? (
            <>
              <Button onClick={() => updateCount(count + 1)} variant="ghost" size="icon">
                +
              </Button>
              {count}
              <Button onClick={() => updateCount(count - 1)} variant="ghost" size="icon">
                -
              </Button>
            </>
          ) : (
            <>Buffer {count}</>
          )}
        </CardDescription>
      </CardHeader>
    </Card>
  );
};

export const ToList = ({ data, className }: ShapeProps) => {
  const firstItem = data?.ins?.at(0)?.at(0);
  const outItem = data?.outs?.at(0)?.at(0);
  return (
    <Card className={cn("rounded-md", className)}>
      <CardHeader className="p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <CardTitle className="text-xs">{data.title}</CardTitle>
          </TooltipTrigger>
          <TooltipContent>
            <CardDescription className="text-xs">
              {data.description}
              <div className="text-xs mt-0">
                {firstItem && portToLabel(firstItem)} to {outItem && portToLabel(outItem)}
              </div>
            </CardDescription>
          </TooltipContent>
        </Tooltip>
      </CardHeader>
    </Card>
  );
};

/** Context-menu body: switch between the combine implementations (edit only). */
export const ChangeZipImplementation = ({ data, id }: ShapeProps) => {
  const edit = useFlowAdapter().useEditActions();
  const updateNodeInternals = useUpdateNodeInternals();

  const change = (implementation: ReactiveImplementation) => {
    edit?.updateData({ implementation } as Partial<ReactiveNodeData>, id);
    updateNodeInternals(id);
  };

  return (
    <>
      <div className="text-xs">Current: {data.implementation}</div>
      {edit && (
        <div className="flex flex-row gap-2">
          {[ReactiveImplementation.Zip, ReactiveImplementation.Combinelatest, ReactiveImplementation.Withlatest].map((i) => (
            <Button key={i} onClick={() => change(i)} disabled={data.implementation == i}>
              {i}
            </Button>
          ))}
        </div>
      )}
    </>
  );
};

export const DefaultContext = ({ data }: ShapeProps) => (
  <div className="p-1">
    <div className="text-xs font-medium">{data.title}</div>
    <div className="text-xs text-muted-foreground">{data.description}</div>
  </div>
);

const shapeMap: Partial<Record<ReactiveImplementation, React.FC<ShapeProps>>> = {
  [ReactiveImplementation.Combinelatest]: TriangleToRight,
  [ReactiveImplementation.Withlatest]: TriangleToRight,
  [ReactiveImplementation.Zip]: TriangleToRight,
  [ReactiveImplementation.ToList]: ToList,
  [ReactiveImplementation.BufferCount]: BufferCount,
  [ReactiveImplementation.Add]: MathShape,
  [ReactiveImplementation.Subtract]: MathShape,
  [ReactiveImplementation.Multiply]: MathShape,
  [ReactiveImplementation.Divide]: MathShape,
  [ReactiveImplementation.Suffix]: MathShape,
  [ReactiveImplementation.Prefix]: MathShape,
  [ReactiveImplementation.Select]: Select,
  [ReactiveImplementation.Just]: Just,
  [ReactiveImplementation.Reorder]: Reorder,
};

const contextMenuMap: Partial<Record<ReactiveImplementation, React.FC<ShapeProps>>> = {
  [ReactiveImplementation.Combinelatest]: ChangeZipImplementation,
  [ReactiveImplementation.Withlatest]: ChangeZipImplementation,
  [ReactiveImplementation.Zip]: ChangeZipImplementation,
};

export const shapeForImplementation = (implementation: ReactiveImplementation): React.FC<ShapeProps> =>
  shapeMap[implementation] ?? Default;

export const contextMenuForImplementation = (
  implementation: ReactiveImplementation,
): React.FC<ShapeProps> => contextMenuMap[implementation] ?? DefaultContext;
