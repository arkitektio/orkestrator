import React, { createContext, useContext, useRef } from "react";
import { createStore, useStore } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { X, CheckCircle2, AlertCircle, Loader2, FolderOpen, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/core/ui/button";
import { structureTabTarget } from "@/core/smart/tabTargets";
import type { Structure } from "@/core/types";
import {
  RailIsland,
  RailIslandRow,
  RailIslandName,
  RailIslandProgress,
} from "@/core/ui/rail/RailIsland";

export type UploadStatus = "pending" | "uploading" | "completed" | "error";

/**
 * What an upload became once its record exists: the object itself and the
 * container it was filed in (a mikro file and its folder). Structures only, so
 * the island can link to another module's pages without knowing the module.
 */
export type UploadRefs = {
  object?: Structure;
  container?: Structure;
};

export interface UploadTask {
  id: string;
  /** The name only: the `File` itself is never pinned by the list. */
  fileName: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  refs?: UploadRefs;
  abortController?: AbortController;
}

export interface UploadProps {
  uploads: UploadTask[];
  startUpload: <U>(
    file: File,
    uploader: (
      file: File,
      options: {
        id: string;
        onProgress: (ev: ProgressEvent) => void;
        signal: AbortSignal;
      }
    ) => Promise<U>,
    /** Registers the uploaded store; what it returns is what the row links to. */
    creator?: (file: File, result: U) => Promise<UploadRefs | void>
  ) => Promise<U>;
  cancelUpload: (id: string) => void;
  clearCompleted: () => void;
}

export type UploadStore = ReturnType<typeof createUploadStore>;

// A completed upload with nothing to link to has nothing left to offer, so it
// leaves on its own after this delay rather than waiting on a manual dismiss.
const COMPLETED_UPLOAD_TTL_MS = 8000;

// One that links to what it created keeps its row, like a finished download
// keeps its "show in folder": capped so the list can't grow unbounded over a
// long session.
const MAX_LINKED_UPLOADS = 50;

const hasRefs = (u: UploadTask) => !!(u.refs?.object || u.refs?.container);

const trimLinkedUploads = (uploads: UploadTask[]): UploadTask[] => {
  const linked = uploads.filter((u) => u.status === "completed" && hasRefs(u));
  if (linked.length <= MAX_LINKED_UPLOADS) {
    return uploads;
  }
  const dropIds = new Set(
    linked.slice(0, linked.length - MAX_LINKED_UPLOADS).map((u) => u.id),
  );
  return uploads.filter((u) => !dropIds.has(u.id));
};

export const createUploadStore = () =>
  createStore<UploadProps>((set) => ({
    uploads: [],
    startUpload: async <U,>(
      file: File,
      uploader: (
        file: File,
        options: {
          id: string;
          onProgress: (ev: ProgressEvent) => void;
          signal: AbortSignal;
        }
      ) => Promise<U>,
      creator?: (file: File, result: U) => Promise<UploadRefs | void>
    ) => {
      const id = uuidv4();
      const abortController = new AbortController();

      const newUpload: UploadTask = {
        id,
        fileName: file.name,
        progress: 0,
        status: "pending",
        abortController,
      };

      set((state) => ({ uploads: [...state.uploads, newUpload] }));

      let removeProgress: (() => void) | undefined;
      let removeError: (() => void) | undefined;

      // Drop a completed upload from the list after a delay.
      const scheduleEviction = () => {
        setTimeout(() => {
          set((state) => ({ uploads: state.uploads.filter((u) => u.id !== id) }));
        }, COMPLETED_UPLOAD_TTL_MS);
      };

      try {
        set((state) => ({
          uploads: state.uploads.map((u) =>
            u.id === id ? { ...u, status: "uploading" } : u
          ),
        }));

        if (window.api?.onUploadProgress) {
          removeProgress = window.api.onUploadProgress(id, (progress: any) => {
            set((state) => ({
              uploads: state.uploads.map((u) =>
                u.id === id ? { ...u, progress: (progress.loaded / progress.total) * 100 } : u
              ),
            }));
          });
        }

        const result = await uploader(file, {
          id,
          onProgress: (ev: ProgressEvent) => {
            if (ev.lengthComputable) {
              const progress = (ev.loaded / ev.total) * 100;
              set((state) => ({
                uploads: state.uploads.map((u) =>
                  u.id === id ? { ...u, progress } : u
                ),
              }));
            }
          },
          signal: abortController.signal,
        });

        if (removeProgress) removeProgress();
        if (removeError) removeError();

        if (creator) {
          if (abortController.signal.aborted) {
            throw new DOMException("Aborted", "AbortError");
          }
          const refs = (await creator(file, result)) || undefined;
          const done: Partial<UploadTask> = { status: "completed", progress: 100, refs };
          set((state) => ({
            uploads: trimLinkedUploads(
              state.uploads.map((u) => (u.id === id ? { ...u, ...done } : u)),
            ),
          }));
          // Something to open: the row stays until it is dismissed.
          if (!refs?.object && !refs?.container) scheduleEviction();
          return result;
        }

        set((state) => ({
          uploads: state.uploads.map((u) =>
            u.id === id ? { ...u, status: "completed", progress: 100 } : u
          ),
        }));
        scheduleEviction();
        return result;
      } catch (err: any) {
        if (removeProgress) removeProgress();
        if (removeError) removeError();

        if (err.name === "AbortError") {
          console.log("Upload cancelled");
          set((state) => ({
            uploads: state.uploads.filter((u) => u.id !== id),
          }));
          throw err;
        } else {
          set((state) => ({
            uploads: state.uploads.map((u) =>
              u.id === id
                ? { ...u, status: "error", error: err.message || "Unknown error" }
                : u
            ),
          }));
          throw err;
        }
      }
    },
    cancelUpload: (id: string) => {
      set((state) => {
        const t = state.uploads.find((u) => u.id === id);
        // Only a transfer still moving is aborted: dismissing a finished row
        // must not send a cancel for an upload that is already done.
        if (t?.abortController && (t.status === "pending" || t.status === "uploading")) {
          t.abortController.abort();
        }
        return { uploads: state.uploads.filter((u) => u.id !== id) };
      });
    },
    clearCompleted: () => {
      set((state) => ({
        uploads: state.uploads.filter((u) => u.status !== "completed"),
      }));
    },
  }));

const UploadContext = createContext<UploadStore | null>(null);

/** A link from a finished row to the page of what the upload created. */
const UploadRefButton = ({
  structure,
  label,
  icon: Icon,
}: {
  structure?: Structure;
  label: string;
  icon: typeof FolderOpen;
}) => {
  const navigate = useNavigate();
  // Nothing claims the identifier (the module is not installed): no button.
  const target = structure ? structureTabTarget(structure) : null;
  if (!target) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={() => navigate(target.to)}
      aria-label={label}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
};

/**
 * Uploads in flight, as an island in the rail.
 *
 * Styled after the rail's task island (`rekuest/components/global/
 * TaskNotificationStack`): one soft card for the list, one compact line per
 * upload — icon, name, percentage — a hairline progress bar and, while a file
 * is moving, the same band of light sweeping across the row. No header and no
 * minimize control.
 *
 * A finished upload that knows what it created (mikro, elektro) keeps its row
 * and offers the same pair a finished download does — "open folder" and "open
 * file" — as links to those pages; the X dismisses it. One that created nothing
 * linkable evicts itself, so there is never an empty panel to fold away.
 */
export const UploadIsland: React.FC = () => {
  const { uploads, cancelUpload } = useUpload();

  return (
    <RailIsland
      show={uploads.length > 0}
      islandKey="upload-island"
      testId="upload-island"
    >
      {uploads
        .slice()
        .reverse()
        .map((u) => {
          const working = u.status === "uploading" || u.status === "pending";
          return (
            <RailIslandRow
              key={u.id}
              working={working}
              testId="upload-island-row"
            >
              <div className="relative flex min-w-0 items-center gap-2">
                {u.status === "completed" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                ) : u.status === "error" ? (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                )}

                <RailIslandName name={u.fileName} working={working} />

                {u.status === "uploading" && (
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {u.progress.toFixed(0)}%
                  </span>
                )}

                {u.status === "completed" && (
                  <>
                    <UploadRefButton
                      structure={u.refs?.container}
                      label="Open folder"
                      icon={FolderOpen}
                    />
                    <UploadRefButton
                      structure={u.refs?.object}
                      label="Open file"
                      icon={ExternalLink}
                    />
                  </>
                )}

                {(u.status !== "completed" || hasRefs(u)) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => cancelUpload(u.id)}
                    aria-label={working ? "Cancel upload" : "Dismiss upload"}
                    title={working ? "Cancel upload" : "Dismiss"}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {working && (
                <RailIslandProgress
                  progress={u.progress}
                  started={u.status === "uploading"}
                />
              )}

              {u.status === "error" && (
                <p className="relative mt-1 line-clamp-2 break-words text-[11px] leading-snug text-destructive">
                  {u.error}
                </p>
              )}
            </RailIslandRow>
          );
        })}
    </RailIsland>
  );
};

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const storeRef = useRef<UploadStore>(null);
  if (!storeRef.current) {
    storeRef.current = createUploadStore();
  }
  return (
    <UploadContext.Provider value={storeRef.current}>
      {children}
    </UploadContext.Provider>
  );
};

export function useUploadStore<T>(selector: (state: UploadProps) => T): T {
  const store = useContext(UploadContext);
  if (!store) throw new Error("Missing UploadContext.Provider in the tree");
  return useStore(store, selector);
}

export const useUpload = () => {
  const startUpload = useUploadStore((state) => state.startUpload);
  const cancelUpload = useUploadStore((state) => state.cancelUpload);
  const clearCompleted = useUploadStore((state) => state.clearCompleted);
  const uploads = useUploadStore((state) => state.uploads);
  return { startUpload, cancelUpload, clearCompleted, uploads };
};
