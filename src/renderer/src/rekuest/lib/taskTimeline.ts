import { PostmanTaskFragment, TaskEventKind } from "../api/graphql";

/**
 * Shared timeline-building core for every gantt view of a task's children
 * (task timeline page, agent space page, the 3D task-space store). Groups
 * children by dependency → method and interpolates start/end positions onto
 * a 0..1 range.
 */

export type TimelineEvent = {
  kind: TaskEventKind;
  message?: string | null;
  createdAt: string;
  position: number;
};

export type TimelineItem = {
  task: PostmanTaskFragment;
  start: number;
  end: number;
  startTime: number;
  endTime: number;
  events: TimelineEvent[];
};

export type TimelineMethodRow = {
  id: string;
  method: string;
  summary?: string;
  items: TimelineItem[];
};

export type TimelineDependencyGroup = {
  id: string;
  dependency: string;
  summary?: string;
  items: TimelineItem[];
  methods: TimelineMethodRow[];
};

/** Compact human duration: `340 ms`, `4.20 s`, `42.5 s`, `3m 07s`, `2h 05m`. */
export const formatDuration = (ms: number) => {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 2 : 1)} s`;
  const totalSeconds = Math.round(seconds);
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (totalSeconds < 3600) {
    return `${Math.floor(totalSeconds / 60)}m ${pad(totalSeconds % 60)}s`;
  }
  const totalMinutes = Math.round(totalSeconds / 60);
  return `${Math.floor(totalMinutes / 60)}h ${pad(totalMinutes % 60)}m`;
};

export function notEmpty<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined;
}

/** Best human label for an entry of a task's raw `dependencies` JSON blob. */
export const dependencyCandidateToLabel = (
  candidate: unknown,
): string | undefined => {
  if (typeof candidate === "string" || typeof candidate === "number") {
    const label = String(candidate).trim();
    return label.length > 0 ? label : undefined;
  }
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
    return undefined;

  const obj = candidate as Record<string, unknown>;
  for (const key of ["name", "title", "reference", "key", "id"]) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
};

/** A task's end for bar-sizing: finishedAt, else its latest event, else now. */
export const getEndTime = (a: PostmanTaskFragment) => {
  if (a.finishedAt) return new Date(a.finishedAt).getTime();
  if (a.events && a.events.length > 0) {
    const times = a.events.map((e) => new Date(e.createdAt).getTime());
    if (times.length > 0) return Math.max(...times);
  }
  return new Date().getTime();
};

/** Group children into dependency → method gantt rows on a 0..1 range. */
export function buildTimeline(children: PostmanTaskFragment[]): {
  groups: TimelineDependencyGroup[];
  startTime: number;
  endTime: number;
} {
  if (children.length === 0) {
    return { groups: [], startTime: 0, endTime: 0 };
  }

  const times = children.flatMap((a) => [
    new Date(a.createdAt).getTime(),
    getEndTime(a),
  ]);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const interpolate = (t: number) => (max === min ? 0 : (t - min) / (max - min));

  const groupMap = new Map<string, TimelineDependencyGroup>();
  const methodMap = new Map<string, Map<string, TimelineMethodRow>>();

  for (const a of children) {
    const dependencyMethod = a.dependencyMethod?.trim() || "dynamic";
    const dependencyKey = a.dependency?.trim() || "catch-all";

    const dependencies = a.dependencies;
    const dependenciesByKey =
      dependencies &&
      typeof dependencies === "object" &&
      !Array.isArray(dependencies)
        ? (dependencies as Record<string, unknown>)
        : undefined;

    const selectedDependencyValue = dependenciesByKey?.[dependencyKey];
    const selectedMethodValue =
      selectedDependencyValue &&
      typeof selectedDependencyValue === "object" &&
      !Array.isArray(selectedDependencyValue)
        ? (selectedDependencyValue as Record<string, unknown>)[dependencyMethod]
        : undefined;

    const dependencyLabel =
      dependencyKey === "catch-all" ? "Catch-all dependency" : dependencyKey;
    const resolvedDepLabel = dependencyCandidateToLabel(selectedDependencyValue);
    const resolvedMethodLabel = dependencyCandidateToLabel(selectedMethodValue);

    const startTime = new Date(a.createdAt).getTime();
    const endTime = getEndTime(a);

    const item: TimelineItem = {
      task: a,
      start: interpolate(startTime),
      end: interpolate(endTime),
      startTime,
      endTime,
      events: [],
    };

    if (!groupMap.has(dependencyKey)) {
      groupMap.set(dependencyKey, {
        id: dependencyKey,
        dependency: dependencyLabel,
        summary: resolvedDepLabel
          ? `resolved via ${resolvedDepLabel}`
          : "Dependency group",
        items: [],
        methods: [],
      });
      methodMap.set(dependencyKey, new Map());
    }

    const group = groupMap.get(dependencyKey)!;
    group.items.push(item);

    const methodsForDep = methodMap.get(dependencyKey)!;
    if (!methodsForDep.has(dependencyMethod)) {
      const row: TimelineMethodRow = {
        id: `${dependencyKey}:${dependencyMethod}`,
        method: dependencyMethod,
        summary: resolvedMethodLabel || resolvedDepLabel || "Delegated path",
        items: [],
      };
      methodsForDep.set(dependencyMethod, row);
      group.methods.push(row);
    }
    methodsForDep.get(dependencyMethod)!.items.push(item);
  }

  const groups = Array.from(groupMap.values())
    .map((g) => ({
      ...g,
      methods: [...g.methods].sort((a, b) => a.method.localeCompare(b.method)),
    }))
    .sort((a, b) => a.dependency.localeCompare(b.dependency));

  return { groups, startTime: min, endTime: max };
}

/** Position a parent task's own events onto the children's 0..1 range. */
export const mapParentEvents = (
  events: readonly Pick<TimelineEvent, "kind" | "message" | "createdAt">[],
  startTime: number,
  endTime: number,
): TimelineEvent[] =>
  events.map((e) => ({
    kind: e.kind,
    message: e.message,
    createdAt: e.createdAt,
    position:
      endTime === startTime
        ? 0
        : (new Date(e.createdAt).getTime() - startTime) / (endTime - startTime),
  }));
