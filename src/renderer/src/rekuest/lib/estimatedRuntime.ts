import { evaluateCallAt, parsePortCall } from "@/core/ports/engine/portCalls";
import type { BlokActionArgument } from "@arkitektio/bsx/renderer/runtime/index";

/**
 * A runtime formula: a pure blok call, declared on an implementation. Its paths read
 * `args/<port>`, `args/<port>/@pkg~1key` (a descriptor of the structure picked there) and
 * `agent/<hardware>`. Whatever it cannot read is null, and null makes the whole estimate
 * unknown, never a wrong one. The form shows `uiCallJson` when there is one; the server computes
 * `callJson` for the menu.
 */

export type AgentHardwareValues = {
  cpuCount?: number | null;
  memoryMib?: number | null;
  gpus?: ReadonlyArray<{ memoryMib?: number | null }> | null;
};

export type EstimateScope = {
  args: Record<string, unknown>;
  /** What the structure picked for each port says of itself, by port and key. */
  descriptors: Record<string, Record<string, unknown>>;
  hardware?: AgentHardwareValues | null;
};

const unescape = (segment: string) => segment.replace(/~1/g, "/").replace(/~0/g, "~");

const walk = (value: unknown, segments: readonly string[]): unknown =>
  segments.reduce<unknown>(
    (current, segment) =>
      current !== null && typeof current === "object"
        ? (current as Record<string, unknown>)[segment]
        : undefined,
    value,
  );

export const readHardware = (hardware: AgentHardwareValues | null | undefined, name: string): unknown => {
  const gpus = hardware?.gpus;
  switch (name) {
    case "cpu_count":
      return hardware?.cpuCount;
    case "memory_mib":
      return hardware?.memoryMib;
    case "gpu_count":
      return gpus?.length;
    case "gpu_memory_mib": {
      const memories = (gpus ?? []).flatMap((gpu) => gpu.memoryMib ?? []);
      return memories.length ? Math.max(...memories) : null;
    }
    default:
      return undefined;
  }
};

const readPath = (path: string, scope: EstimateScope): unknown => {
  const [root, ...rest] = path.split("/").map(unescape);
  if (root === "args") {
    const [port, ...below] = rest;
    if (below[0]?.startsWith("@")) return scope.descriptors[port]?.[below[0]];
    return walk(scope.args[port], below);
  }
  if (root === "agent") {
    return readHardware(scope.hardware, rest[0]);
  }
  return undefined;
};

export const valuePaths = (args: readonly BlokActionArgument[] | null | undefined): string[] =>
  (args ?? []).flatMap((argument) => [
    ...(argument.value_path ? [argument.value_path] : []),
    ...valuePaths(argument.util_call?.arguments),
    ...valuePaths(argument.value_list),
    ...valuePaths(argument.value_dict),
  ]);

/** The ports whose picked structures a formula reads the descriptors of: nothing else is fetched. */
export const estimateDescriptorPorts = (raw: unknown): string[] => {
  const parsed = parsePortCall(raw);
  if (!parsed.ok) return [];
  const ports = new Set<string>();
  for (const path of valuePaths(parsed.value.arguments)) {
    const [root, first, second] = path.split("/");
    if (root === "args" && second?.startsWith("@")) ports.add(first);
  }
  return [...ports];
};

/** The estimate in seconds, or null when any of it is unknown. */
export const evaluateEstimate = (raw: unknown, scope: EstimateScope): number | null => {
  const parsed = parsePortCall(raw);
  if (!parsed.ok) return null;
  const result = evaluateCallAt(parsed.value, (path) => readPath(path, scope));
  return result.ok && typeof result.value === "number" && Number.isFinite(result.value) && result.value >= 0
    ? result.value
    : null;
};

const formatOne = (seconds: number): string => {
  if (seconds < 1) return "<1 s";
  if (seconds < 90) return `${Math.round(seconds)} s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
};

/** `~2 min`, or `~2 min – 1.5 h` across several agents. */
export const formatEstimate = (seconds: readonly number[]): string | null => {
  if (seconds.length === 0) return null;
  const low = formatOne(Math.min(...seconds));
  const high = formatOne(Math.max(...seconds));
  return low === high ? `~${low}` : `~${low} – ${high}`;
};
