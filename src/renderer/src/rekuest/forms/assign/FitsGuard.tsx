import { usePickedDescriptors, type PickablePort } from "@/rekuest/hooks/usePickedDescriptors";
import { fitsImplementation, type FitFormula, type FitVerdict } from "@/rekuest/lib/fits";
import type { AgentHardwareValues } from "@/rekuest/lib/estimatedRuntime";
import type { PortFit } from "@/core/ports/engine/PortFitsContext";
import { readHardware } from "@/rekuest/lib/estimatedRuntime";
import { useEffect, useMemo, useState } from "react";
import { useWatch, type Control, type FieldValues } from "react-hook-form";

export type FitsImplementation = {
  id: string;
  fits?: readonly (FitFormula & { compiledPath?: string })[] | null;
  agent: { active?: boolean | null; hardware?: AgentHardwareValues | null };
};

const HARDWARE = ["cpu_count", "memory_mib", "gpu_count", "gpu_memory_mib"];

/**
 * What pickers may narrow to, by port. A live implementation with no `Fits` on a port has stated
 * no limit, so that port is not narrowed at all.
 */
export const portFitsOf = (
  implementations: readonly FitsImplementation[] | undefined,
): Record<string, PortFit[]> => {
  const live = (implementations ?? []).filter((implementation) => implementation.agent.active !== false);
  const ports = new Set(live.flatMap((implementation) => (implementation.fits ?? []).map((fit) => fit.port)));
  const narrowed: Record<string, PortFit[]> = {};
  for (const port of ports) {
    const entries = live.map((implementation) => {
      const fit = implementation.fits?.find((candidate) => candidate.port === port);
      if (!fit?.compiledPath) return null;
      const agent = Object.fromEntries(
        HARDWARE.flatMap((name) => {
          const value = readHardware(implementation.agent.hardware, name);
          return typeof value === "number" ? [[name, value]] : [];
        }),
      );
      return { path: fit.compiledPath, agent };
    });
    if (entries.every((entry) => entry !== null)) narrowed[port] = entries as PortFit[];
  }
  return narrowed;
};

/** What the form does about what is picked. */
export type FitDecision = {
  /** The implementation to send the task to, when some of the live ones refuse. */
  pin?: string;
  /** Why no live implementation can take this, when none can. */
  refused?: FitFormula;
};

/** Reports one implementation's verdict: one per implementation, for its hooks. */
const ImplementationFit = ({
  implementation,
  ports,
  args,
  onVerdict,
}: {
  implementation: FitsImplementation;
  ports: readonly PickablePort[];
  args: Record<string, unknown>;
  onVerdict: (id: string, verdict: FitVerdict, refused?: FitFormula) => void;
}) => {
  const fitPorts = useMemo(() => (implementation.fits ?? []).map((fit) => fit.port), [implementation.fits]);
  const descriptors = usePickedDescriptors(fitPorts, ports, args);
  const { verdict, refused } = fitsImplementation(implementation, descriptors);
  useEffect(() => {
    onVerdict(implementation.id, verdict, refused);
  }, [implementation.id, verdict, refused, onVerdict]);
  return null;
};

/**
 * Picks an agent that can handle what is picked, because takt would take the first available one.
 * A leaf, because watching the form rerenders whoever does on every keystroke. Only the live
 * implementations count, and only when one of them states a `Fits`.
 */
export const FitsGuard = ({
  control,
  ports,
  implementations,
  onDecision,
}: {
  control: Control<FieldValues>;
  ports?: readonly PickablePort[];
  implementations?: readonly FitsImplementation[];
  onDecision: (decision: FitDecision) => void;
}) => {
  const values = useWatch({ control });
  const args = (values?.args ?? {}) as Record<string, unknown>;
  const [verdicts, setVerdicts] = useState<Record<string, { verdict: FitVerdict; refused?: FitFormula }>>({});
  const onVerdict = useMemo(
    () => (id: string, verdict: FitVerdict, refused?: FitFormula) =>
      setVerdicts((known) =>
        known[id]?.verdict === verdict && known[id]?.refused === refused ? known : { ...known, [id]: { verdict, refused } },
      ),
    [],
  );
  const live = (implementations ?? []).filter((implementation) => implementation.agent.active !== false);
  const limited = live.some((implementation) => (implementation.fits ?? []).length > 0) ? live : [];

  const answers = limited.map((implementation) => verdicts[implementation.id]);
  const refusing = answers.filter((answer) => answer?.verdict === "no");
  const pin = limited.find((implementation) => verdicts[implementation.id]?.verdict === "yes") ?? limited.find((implementation) => verdicts[implementation.id]?.verdict === "unknown");
  const everyoneRefuses = limited.length > 0 && refusing.length === limited.length;
  const decisionKey = JSON.stringify([refusing.length > 0 ? pin?.id : null, everyoneRefuses ? refusing[0]?.refused?.source : null]);

  useEffect(() => {
    onDecision({
      pin: refusing.length > 0 ? pin?.id : undefined,
      refused: everyoneRefuses ? refusing[0]?.refused : undefined,
    });
    // `decisionKey` is the decision by value: every render builds a new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisionKey, onDecision]);

  return (
    <>
      {limited.map((implementation) => (
        <ImplementationFit
          key={implementation.id}
          implementation={implementation}
          ports={ports ?? []}
          args={args}
          onVerdict={onVerdict}
        />
      ))}
    </>
  );
};
