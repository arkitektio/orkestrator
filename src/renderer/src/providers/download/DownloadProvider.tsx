import React, { createContext, useContext, useRef } from "react";
import { createStore, useStore } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { X, CheckCircle2, AlertCircle, Loader2, FolderOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  RailIsland,
  RailIslandRow,
  RailIslandName,
  RailIslandProgress,
} from "@/app/components/rail/RailIsland";

export type DownloadStatus = "pending" | "downloading" | "completed" | "error";

export interface DownloadTask {
  id: string;
  fileName: string;
  progress: number;
  status: DownloadStatus;
  error?: string;
  savePath?: string;
  abortController?: AbortController;
}

export interface DownloadProps {
  downloads: DownloadTask[];
  startDownload: <T>(
    fileName: string,
    downloader: (
      options: {
        id: string;
        onProgress: (ev: { loaded: number; total: number }) => void;
        signal: AbortSignal;
      }
    ) => Promise<T>,
  ) => Promise<T>;
  cancelDownload: (id: string) => void;
  clearCompleted: () => void;
}

export type DownloadStore = ReturnType<typeof createDownloadStore>;

// Bound the number of finished (completed/errored) downloads we keep around.
// Unlike uploads these don't pin a File and completed entries expose useful
// "open file" actions, so we keep the most recent ones rather than auto-evicting,
// but still cap the list so it can't grow unbounded over a long session.
const MAX_FINISHED_DOWNLOADS = 50;

const trimFinishedDownloads = (downloads: DownloadTask[]): DownloadTask[] => {
  const finished = downloads.filter(
    (d) => d.status === "completed" || d.status === "error",
  );
  if (finished.length <= MAX_FINISHED_DOWNLOADS) {
    return downloads;
  }
  const dropIds = new Set(
    finished.slice(0, finished.length - MAX_FINISHED_DOWNLOADS).map((d) => d.id),
  );
  return downloads.filter((d) => !dropIds.has(d.id));
};

export const createDownloadStore = () =>
  createStore<DownloadProps>((set) => ({
    downloads: [],
    startDownload: async <T,>(
      fileName: string,
      downloader: (
        options: {
          id: string;
          onProgress: (ev: { loaded: number; total: number }) => void;
          signal: AbortSignal;
        }
      ) => Promise<T>
    ) => {
      const id = uuidv4();
      const abortController = new AbortController();

      const newDownload: DownloadTask = {
        id,
        fileName,
        progress: 0,
        status: "pending",
        abortController,
      };

      set((state) => ({ downloads: [...state.downloads, newDownload] }));

      let removeProgress: (() => void) | undefined;

      try {
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.id === id ? { ...d, status: "downloading" } : d
          ),
        }));

        if (window.api?.onDownloadProgress) {
          removeProgress = window.api.onDownloadProgress(id, (progress: any) => {
            set((state) => ({
              downloads: state.downloads.map((d) =>
                d.id === id ? { ...d, progress: progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0 } : d
              ),
            }));
          });
        }

        const result = await downloader({
          id,
          onProgress: (ev: { loaded: number, total: number }) => {
             const progress = ev.total > 0 ? (ev.loaded / ev.total) * 100 : 0;
             set((state) => ({
                downloads: state.downloads.map((d) =>
                  d.id === id ? { ...d, progress } : d
                ),
             }));
          },
          signal: abortController.signal,
        });

        if (removeProgress) removeProgress();

        set((state) => ({
          downloads: trimFinishedDownloads(
            state.downloads.map((d) =>
              d.id === id ? { ...d, status: "completed", progress: 100, savePath: typeof result === "string" ? result : undefined } : d
            ),
          ),
        }));
        return result;
      } catch (err: any) {
        if (removeProgress) removeProgress();

        if (err.name === "AbortError" || err.message?.includes("Abort")) {
          set((state) => ({
            downloads: state.downloads.filter((d) => d.id !== id),
          }));
          throw err;
        } else {
          set((state) => ({
            downloads: trimFinishedDownloads(
              state.downloads.map((d) =>
                d.id === id
                  ? { ...d, status: "error", error: err.message || "Unknown error" }
                  : d
              ),
            ),
          }));
          throw err;
        }
      }
    },
    cancelDownload: (id: string) => {
      set((state) => {
        const t = state.downloads.find((d) => d.id === id);
        if (t?.abortController) {
          t.abortController.abort();
        }
        return { downloads: state.downloads.filter((d) => d.id !== id) };
      });
    },
    clearCompleted: () => {
      set((state) => ({
        downloads: state.downloads.filter((d) => d.status !== "completed"),
      }));
    },
  }));

const DownloadContext = createContext<DownloadStore | null>(null);

/**
 * Downloads in flight, as an island in the rail, directly above the uploads
 * and the task island and styled the same way: one soft card, one compact line
 * per download — icon, name, percentage — a hairline progress bar and the same
 * band of light sweeping across a row that is still working.
 *
 * A finished download keeps its row (nothing evicts it) so its "show in
 * folder" / "open" controls stay reachable; the X dismisses it.
 */
export const DownloadIsland: React.FC = () => {
  const { downloads, cancelDownload } = useDownload();

  return (
    <RailIsland
      show={downloads.length > 0}
      islandKey="download-island"
      testId="download-island"
    >
      {downloads
        .slice()
        .reverse()
        .map((d) => {
          const working = d.status === "downloading" || d.status === "pending";
          return (
            <RailIslandRow
              key={d.id}
              working={working}
              testId="download-island-row"
            >
              <div className="relative flex min-w-0 items-center gap-2">
                {d.status === "completed" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                ) : d.status === "error" ? (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                )}

                <RailIslandName name={d.fileName} working={working} />

                {d.status === "downloading" && (
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {d.progress.toFixed(0)}%
                  </span>
                )}

                {d.status === "completed" && d.savePath && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => window.api.showItemInFolder(d.savePath!)}
                      aria-label="Show in folder"
                      title="Show in folder"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => window.api.openPath(d.savePath!)}
                      aria-label="Open file"
                      title="Open file"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => cancelDownload(d.id)}
                  aria-label={working ? "Cancel download" : "Dismiss download"}
                  title={working ? "Cancel download" : "Dismiss"}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {working && (
                <RailIslandProgress
                  progress={d.progress}
                  started={d.status === "downloading"}
                />
              )}

              {d.status === "error" && (
                <p className="relative mt-1 line-clamp-2 break-words text-[11px] leading-snug text-destructive">
                  {d.error}
                </p>
              )}
            </RailIslandRow>
          );
        })}
    </RailIsland>
  );
};

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const storeRef = useRef<DownloadStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createDownloadStore();
  }
  return (
    <DownloadContext.Provider value={storeRef.current}>
      {children}
    </DownloadContext.Provider>
  );
};

export function useDownloadStore<T>(selector: (state: DownloadProps) => T): T {
  const store = useContext(DownloadContext);
  if (!store) throw new Error("Missing DownloadContext.Provider in the tree");
  return useStore(store, selector);
}

export const useDownload = () => {
  const startDownload = useDownloadStore((state) => state.startDownload);
  const cancelDownload = useDownloadStore((state) => state.cancelDownload);
  const clearCompleted = useDownloadStore((state) => state.clearCompleted);
  const downloads = useDownloadStore((state) => state.downloads);
  return { startDownload, cancelDownload, clearCompleted, downloads };
};
