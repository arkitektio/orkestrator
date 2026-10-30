import { cn } from "@/core/util/utils";
import { usePickedDescriptors, type PickablePort } from "@/rekuest/hooks/usePickedDescriptors";
import {
  estimateDescriptorPorts,
  evaluateEstimate,
  formatEstimate,
  type AgentHardwareValues,
} from "@/rekuest/lib/estimatedRuntime";
import { Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useWatch, type Control, type FieldValues } from "react-hook-form";

type EstimatingImplementation = {
  id: string;
  estimatedRuntime?: {
    callJson: unknown;
    source?: string | null;
    uiCallJson?: unknown;
    uiSource?: string | null;
  } | null;
  agent: { id: string; active?: boolean | null; hardware?: AgentHardwareValues | null };
};

/** Evaluates one implementation's formula and reports it: one per implementation, for its hooks. */
const ImplementationEstimate = ({
  implementation,
  ports,
  args,
  onEstimate,
}: {
  implementation: EstimatingImplementation;
  ports: readonly PickablePort[];
  args: Record<string, unknown>;
  onEstimate: (id: string, seconds: number | null) => void;
}) => {
  const estimate = implementation.estimatedRuntime;
  const call = estimate?.uiCallJson ?? estimate?.callJson;
  const descriptorPorts = useMemo(() => estimateDescriptorPorts(call), [call]);
  const descriptors = usePickedDescriptors(descriptorPorts, ports, args);

  const seconds = evaluateEstimate(call, {
    args,
    descriptors,
    hardware: implementation.agent.hardware,
  });
  useEffect(() => {
    onEstimate(implementation.id, seconds);
  }, [implementation.id, seconds, onEstimate]);
  useEffect(() => () => onEstimate(implementation.id, null), [implementation.id, onEstimate]);
  return null;
};

/**
 * How long this will take, next to the button that starts it: one value for one agent, a range
 * when any of several may take it. Nothing at all while any of a formula is unknown. A leaf,
 * because watching the form rerenders whoever does on every keystroke.
 */
export const EstimatedRuntimeHint = ({
  control,
  ports,
  implementations,
  className,
}: {
  control: Control<FieldValues>;
  ports?: readonly PickablePort[];
  implementations?: readonly EstimatingImplementation[];
  className?: string;
}) => {
  const values = useWatch({ control });
  const args = (values?.args ?? {}) as Record<string, unknown>;
  const [estimates, setEstimates] = useState<Record<string, number | null>>({});
  const onEstimate = useMemo(
    () => (id: string, seconds: number | null) =>
      setEstimates((known) => (known[id] === seconds ? known : { ...known, [id]: seconds })),
    [],
  );
  const estimating = (implementations ?? []).filter(
    (implementation) => implementation.estimatedRuntime && implementation.agent.active !== false,
  );
  const label = formatEstimate(
    estimating.flatMap((implementation) => estimates[implementation.id] ?? []),
  );

  return (
    <>
      {estimating.map((implementation) => (
        <ImplementationEstimate
          key={implementation.id}
          implementation={implementation}
          ports={ports ?? []}
          args={args}
          onEstimate={onEstimate}
        />
      ))}
      {label && (
        <span
          className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
          title={estimating.length === 1 ? (estimating[0].estimatedRuntime?.uiSource ?? estimating[0].estimatedRuntime?.source ?? undefined) : undefined}
        >
          <Clock className="size-3" />
          {label}
        </span>
      )}
    </>
  );
};
