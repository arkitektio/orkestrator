import { useSyncExternalStore } from "react";

/** The longest a run may be estimated to take, in seconds, for what the menu's Run section offers. */
const LIMITS = [
  { label: "any time", seconds: undefined },
  { label: "≤ 1 min", seconds: 60 },
  { label: "≤ 10 min", seconds: 600 },
  { label: "≤ 1 h", seconds: 3600 },
];

let current: number | undefined;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useRunLimit = () => useSyncExternalStore(subscribe, () => current);

/** Sits in the section's title, so a click stays on it instead of reaching the menu. */
export const RunLimitSelector = () => {
  const limit = useRunLimit();
  return (
    <select
      aria-label="Longest estimated runtime"
      className="rounded bg-transparent text-[10px] font-normal text-muted-foreground"
      value={limit ?? ""}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        current = event.target.value ? Number(event.target.value) : undefined;
        listeners.forEach((listener) => listener());
      }}
    >
      {LIMITS.map(({ label, seconds }) => (
        <option key={label} value={seconds ?? ""}>
          {label}
        </option>
      ))}
    </select>
  );
};
