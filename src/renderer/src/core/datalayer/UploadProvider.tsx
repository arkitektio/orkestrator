import React, { createContext, useContext, useRef } from "react";
import { createStore, useStore } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/core/ui/button";
import {
  RailIsland,
  RailIslandRow,
  RailIslandName,
  RailIslandProgress,
} from "@/core/ui/rail/RailIsland";

export type UploadStatus = "pending" | "uploading" | "completed" | "error";

export interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  abortController?: AbortController;
}

export interface UploadProps {
  uploads: UploadTask[];
  startUpload: <T, U>(
    file: File,
    uploader: (
      file: File,
      options: {
        id: string;
        onProgress: (ev: ProgressEvent) => void;
        signal: AbortSignal;
      }
    ) => Promise<U>,
    creator?: (file: File, result: U) => Promise<T>
  ) => Promise<T | U>;
  cancelUpload: (id: string) => void;
  clearCompleted: () => void;
}

export type UploadStore = ReturnType<typeof createUploadStore>;

// Auto-remove completed uploads after this delay so the list (and the File
// objects each task pins in memory) doesn't grow for the whole session waiting
// on a manual "Clear".
const COMPLETED_UPLOAD_TTL_MS = 8000;

export const createUploadStore = () =>
  createStore<UploadProps>((set) => ({
    uploads: [],
    startUpload: async <T, U>(
      file: File,
      uploader: (
        file: File,
        options: {
          id: string;
          onProgress: (ev: ProgressEvent) => void;
          signal: AbortSignal;
        }
      ) => Promise<U>,
      creator?: (file: File, result: U) => Promise<T>
    ) => {
      const id = uuidv4();
      const abortController = new AbortController();

      const newUpload: UploadTask = {
        id,
        file,
        progress: 0,
        status: "pending",
        abortController,
      };

      set((state) => ({ uploads: [...state.uploads, newUpload] }));

      let removeProgress: (() => void) | undefined;
      let removeError: (() => void) | undefined;

      // Drop a completed upload (and its pinned File) from the list after a delay.
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
          const createResult = await creator(file, result);
          set((state) => ({
            uploads: state.uploads.map((u) =>
              u.id === id ? { ...u, status: "completed", progress: 100 } : u
            ),
          }));
          scheduleEviction();
          return createResult;
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
        if (t?.abortController) {
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

/**
 * Uploads in flight, as an island in the rail.
 *
 * Styled after the rail's task island (`rekuest/components/global/
 * TaskNotificationStack`): one soft card for the list, one compact line per
 * upload — icon, name, percentage — a hairline progress bar and, while a file
 * is moving, the same band of light sweeping across the row. No header and no
 * minimize control: completed uploads evict themselves, so there is never an
 * empty panel to fold away.
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

                <RailIslandName name={u.file.name} working={working} />

                {u.status === "uploading" && (
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {u.progress.toFixed(0)}%
                  </span>
                )}

                {u.status !== "completed" && (
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
