import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Pending task hooks, persisted to localStorage so a "run something when this
 * task finishes" survives an app reload. Generalized from the export-specific
 * store: each entry names a `hookType` (looked up in the task-hook registry) and
 * carries opaque `params`. The `TaskHookRunner` watches each entry's task via
 * the `MyTasks` cache and dispatches the registered handler on completion.
 */
export type PendingHookStatus = "running" | "done" | "error";

export interface PendingHook {
  /** Client-generated reference passed to the assign mutation. */
  reference: string;
  /** Server task id (used to watch the task). */
  taskId: string;
  /** Key into the TASK_HOOKS registry. */
  hookType: string;
  /** Opaque, hook-specific parameters (e.g. a display name). */
  params: Record<string, unknown>;
  createdAt: number;
  status: PendingHookStatus;
  error?: string;
}

interface PendingHooksState {
  hooks: PendingHook[];
  addPendingHook: (
    entry: Omit<PendingHook, "createdAt" | "status" | "params"> &
      Partial<Pick<PendingHook, "createdAt" | "status" | "params">>,
  ) => void;
  setStatus: (reference: string, status: PendingHookStatus, error?: string) => void;
  removePendingHook: (reference: string) => void;
}

export const usePendingHooksStore = create<PendingHooksState>()(
  persist(
    (set) => ({
      hooks: [],
      addPendingHook: (entry) =>
        set((state) => {
          if (state.hooks.some((h) => h.reference === entry.reference)) {
            return state;
          }
          return {
            hooks: [
              ...state.hooks,
              {
                createdAt: Date.now(),
                status: "running",
                params: {},
                ...entry,
              },
            ],
          };
        }),
      setStatus: (reference, status, error) =>
        set((state) => ({
          hooks: state.hooks.map((h) =>
            h.reference === reference ? { ...h, status, error } : h,
          ),
        })),
      removePendingHook: (reference) =>
        set((state) => ({
          hooks: state.hooks.filter((h) => h.reference !== reference),
        })),
    }),
    {
      name: "task-hooks",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
