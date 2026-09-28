import { createContext, useContext, useState } from "react";

/**
 * Where overlays opened from the page render: over the content card, not the
 * whole window.
 *
 * The rail is a window-drag region (`app-drag`), and Electron hit-tests drag
 * regions in the OS, beneath z-index — a dialog spanning the window loses every
 * click that lands over the rail. So a dialog that belongs to the page stays on
 * the page: `DialogContent`/`SheetContent`/`AlertDialogContent` portal into this
 * host when one is in context, and the dialog provider remembers the host of
 * whoever called `openDialog`. Anything opened from the rail keeps the window.
 *
 * The host has layout containment, which makes it the containing block for the
 * overlays' `fixed` positioning, and is a size container, the reference for
 * `cqw`/`cqh`. Outside any container those units fall back to the viewport, so
 * the same size classes work for window-level dialogs too.
 */
const PageDialogHostContext = createContext<HTMLElement | null>(null);

export const usePageDialogHost = () => useContext(PageDialogHostContext);

export const PageDialogHost = ({ children }: { children: React.ReactNode }) => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  return (
    <PageDialogHostContext.Provider value={host}>
      {children}
      <div
        ref={setHost}
        data-slot="page-dialog-host"
        // Empty until something portals in; it must never catch the page's
        // clicks itself, only its children (overlay, content) may.
        // `contain: layout` is what anchors the overlays' `fixed` here; the
        // container-type alone does NOT (the spec dropped its implied layout
        // containment), which left dialogs sized to the page but positioned
        // over the window.
        className="pointer-events-none absolute inset-0 z-50 [container-type:size] [contain:layout] [&>*]:pointer-events-auto"
      />
    </PageDialogHostContext.Provider>
  );
};
