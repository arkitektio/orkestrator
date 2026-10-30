import { evaluateCallAt, parsePortCall } from "@/core/ports/engine/portCalls";
import { readHardware, valuePaths, type AgentHardwareValues } from "./estimatedRuntime";

/**
 * A `Fits`: what an implementation can handle of one structure argument, a comparison over that
 * object's descriptors (`value/@pkg~1key`) and the agent's hardware. The server tests the same
 * formula in the action query, and `fits_corpus.json` holds the two to the same answers.
 */
export type FitFormula = { port: string; callJson: unknown; source?: string | null };

export type FitVerdict = "yes" | "no" | "unknown";

const unescape = (segment: string) => segment.replace(/~1/g, "/").replace(/~0/g, "~");

/** Whether one object fits one formula on this hardware. */
export const fitHolds = (
  callJson: unknown,
  descriptors: Record<string, unknown>,
  hardware: AgentHardwareValues | null | undefined,
): boolean => {
  const parsed = parsePortCall(callJson);
  if (!parsed.ok) return false;
  const result = evaluateCallAt(parsed.value, (path) => {
    const [root, name] = path.split("/");
    const value = root === "agent" ? readHardware(hardware, name) : descriptors[unescape(name)];
    return typeof value === "number" ? value : null;
  });
  return result.ok && result.value === true;
};

/** What a formula reads: descriptor keys of the object, and hardware with what this agent reported. */
export const fitReads = (
  callJson: unknown,
  hardware: AgentHardwareValues | null | undefined,
): { descriptors: string[]; hardware: { name: string; value: number | null }[] } => {
  const parsed = parsePortCall(callJson);
  const paths = parsed.ok ? [...new Set(valuePaths(parsed.value.arguments))] : [];
  const named = (root: string) => paths.filter((path) => path.startsWith(`${root}/`)).map((path) => path.slice(root.length + 1));
  return {
    descriptors: named("value").map(unescape),
    hardware: named("agent").map((name) => {
      const value = readHardware(hardware, name);
      return { name, value: typeof value === "number" ? value : null };
    }),
  };
};

/** An implementation's answer for what is picked. Unknown while an object is not picked or described. */
export const fitsImplementation = (
  implementation: {
    fits?: readonly FitFormula[] | null;
    agent: { hardware?: AgentHardwareValues | null };
  },
  descriptors: Record<string, Record<string, unknown>>,
): { verdict: FitVerdict; refused?: FitFormula } => {
  let verdict: FitVerdict = "yes";
  for (const fit of implementation.fits ?? []) {
    const described = descriptors[fit.port];
    if (!described || Object.keys(described).length === 0) {
      verdict = "unknown";
    } else if (!fitHolds(fit.callJson, described, implementation.agent.hardware)) {
      return { verdict: "no", refused: fit };
    }
  }
  return { verdict };
};
