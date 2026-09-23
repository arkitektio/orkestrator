import { Structure } from "@/types";

type Listener = (structures: Structure[]) => void;

const listeners = new Set<Listener>();

/**
 * "Bring these to disk": files download, the first thing that is not a file
 * opens the export dialog. Handled once, by `ExportHost`, which has the
 * dialog, the download rail and the service clients; everything else — a card
 * dragged out onto the desktop, the "Export to file" local action — only asks.
 */
export const requestExport = (structures: Structure[]) => {
  if (structures.length === 0) return;
  for (const listener of [...listeners]) {
    listener(structures);
  }
};

export const subscribeExportRequests = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
