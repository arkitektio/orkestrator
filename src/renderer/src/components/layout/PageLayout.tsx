import { usePullToRefetch } from "@/hooks/use-pull-to-refetch";
import { useReport } from "@/hooks/use-report";
import { cn } from "@/lib/utils";
import { useRefetch } from "@/providers/refetch/RefetchContext";
import { ChevronDownIcon, PanelLeft, PanelRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { PullToRefetchIndicator } from "./PullToRefetchIndicator";
import BreadCrumbs from "../navigation/BreadCrumbs";
import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";
import { Separator } from "../ui/separator";

export type PageVariant = "black" | "default";

export type PageLayoutProps = {
  title: React.ReactNode | undefined;
  children: React.ReactNode;
  sidebars?: React.ReactNode;
  actions?: React.ReactNode;
  pageActions?: React.ReactNode;
  variant?: "black" | "default";
  /**
   * Seamless sidebar: the rail paints the page's own surface instead of
   * `bg-sidebar` and the resize divider goes invisible (still draggable), so
   * content and rail read as one surface. Meant for the black, canvas-style
   * pages whose sidebar hosts scene chrome (the Layers tab).
   */
  overlay?: boolean;
};

export const PageLayout = ({
  sidebars,
  children,
  actions,
  pageActions,
  variant = "default",
  overlay = false,
}: PageLayoutProps) => {
  const [params, setParams] = useSearchParams({
    pageSidebar: "true",
    sidebar: "true",
  });

  const location = useLocation();

  const refetch = useRefetch();
  const {
    ref: pullRef,
    pull,
    progress,
    refreshing,
  } = usePullToRefetch(refetch);

  const reportBug = useReport();

  const [, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  // Clear the pending copy-reset timer on unmount to avoid a setState-after-unmount.
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const copyPathToClipboard = useCallback(() => {

    const searchText = `${location.pathname}${location.search}`;
    const fullUrl = `https://arkitekt.live/deeplink?orkestrator=${encodeURIComponent(searchText)}`;

    // Try modern clipboard API first
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullUrl)
        .then(() => {
          setCopied(true);
          copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => {
          // Fallback to electron API if available
          const api = (window as any).api;
          if (api?.copyToClipboard) {
            api.copyToClipboard(fullUrl);
            setCopied(true);
            copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
          }
        });
    } else {
      // Try electron API
      const api = (window as any).api;
      if (api?.copyToClipboard) {
        api.copyToClipboard(fullUrl);
        setCopied(true);
        copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
      } else {
        // Last resort: old-school execCommand
        try {
          const textarea = document.createElement("textarea");
          textarea.value = fullUrl;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
          setCopied(true);
          copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
        } catch (e) {
          console.warn("Failed to copy to clipboard", e);
        }
      }
    }
  }, [location.pathname, location.search]);

  const popOut = useCallback(() => {
    window.api.openSecondWindow(location.pathname);
  }, []);

  // Both toggles edit a COPY of the current params rather than passing an object
  // literal: `setParams({...})` replaces the whole query string, so toggling a
  // sidebar used to wipe every other param — a page's search, sort, date range
  // and filters all vanished mid-session.
  const setSidebarParam = useCallback(
    (key: "pageSidebar" | "sidebar", value: string) => {
      const next = new URLSearchParams(params);
      next.set(key, value);
      setParams(next);
    },
    [params, setParams],
  );

  const togglePageSidebar = useCallback(() => {
    setSidebarParam(
      "pageSidebar",
      params.get("pageSidebar") == "true" ? "false" : "true",
    );
  }, [params, setSidebarParam]);

  const toggleSidebar = useCallback(() => {
    setSidebarParam(
      "sidebar",
      params.get("sidebar") == "true" ? "false" : "true",
    );
  }, [params, setSidebarParam]);

  return (
    <ResizablePanelGroup autoSaveId="page" direction="horizontal">
      <ResizablePanel className="h-full w-full" defaultSize={80} id="page" order={1}>
        <div
          className={cn(
            "h-full w-full flex flex-col relative",
            variant == "default" ? "bg-radial-[at_100%_100%] from-background to-backgroundpaired" : "bg-black text-gray-300",
          )}
        >
          {/* `min-h-16 shrink-0` pins the row to exactly 4rem. Without an
              explicit min-height the item's `min-height: auto` lets tall
              content (a breadcrumb trail wrapping to a second line) grow the
              row, and `items-center` then pushes the breadcrumbs down — model
              pages ended up a couple of pixels lower than list pages. */}
          <div
            className={cn(
              "h-16 min-h-16 shrink-0 flex-row flex justify-between dark:border-gray-700 px-2 py-2 items-center",
              variant == "default"
                ? ""
                : "border-0 bg-black bg-clip-padding backdrop-filter backdrop-blur-3xl bg-opacity-20 ",
            )}
          >
            <Button onClick={toggleSidebar} variant={"ghost"}>
              <PanelLeft />
              <span className="sr-only">Toggle ModulePane</span>
            </Button>
            <Separator orientation="vertical" className="h-6 my-auto mr-3" />
            {/* `min-w-0` lets this actually shrink below its content width so
                the trail truncates instead of wrapping. */}
            <div className="flex-grow min-w-0 flex flex-col truncate">
              <div className="flex-shrink min-w-0">
                <BreadCrumbs />
              </div>
            </div>
            <div className="flex-initial shrink-0 text-foreground flex flex-row gap-1 items-center max-w-3xl">

              {actions}
              {pageActions}


              <ButtonGroup className="flex-initial">
                <Button variant="ghost" onClick={togglePageSidebar} className="!pl-2 !pr-2 my-auto"><PanelRight /></Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="!pl-2 !pr-2">
                      <ChevronDownIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="[--radius:1rem]">
                    <DropdownMenuItem onSelect={togglePageSidebar}>
                      {params.get("pageSidebar") == "true" ? "Hide" : "Show"} Page
                      Sidebar
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={toggleSidebar}>
                      {params.get("sidebar") == "true" ? "Hide" : "Show"} Sidebar
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={copyPathToClipboard}>
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={copyPathToClipboard}>
                      Share Universal Link
                    </DropdownMenuItem>

                    <DropdownMenuItem onSelect={popOut}> Popout</DropdownMenuItem>
                    <DropdownMenuItem onSelect={reportBug}> Report Bug</DropdownMenuItem>

                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>

            </div>
          </div>

          <div
            ref={pullRef}
            className={cn(
              "p-3 flex-grow @container flex flex-col overflow-y-auto",
              "transition-[filter,opacity] duration-200 ease-out",
              refreshing && "blur-[3px] opacity-60",
            )}
          >
            {children}
          </div>

          <PullToRefetchIndicator
            pull={pull}
            progress={progress}
            refreshing={refreshing}
          />
        </div>
      </ResizablePanel>
      {params.get("pageSidebar") == "true" && (
        <>
          {/* Overlay: the handle root's `bg-border w-px` IS the divider line;
              its `after:` hit area has no background, so making the root
              transparent hides the line without losing the drag target. */}
          <ResizableHandle className={overlay ? "bg-transparent" : undefined} />
          <ResizablePanel
            minSize={10}
            maxSize={80}
            defaultSize={20}
            order={2}
            className={cn(
              overlay
                ? variant == "default"
                  ? "bg-radial-[at_100%_100%] from-background to-backgroundpaired"
                  : "bg-black text-gray-300"
                : cn(
                    "bg-sidebar",
                    variant == "default" ? "" : "border-0 bg-sidebar bg-clip-padding backdrop-filter backdrop-blur-3xl bg-opacity-20 ",
                  ),
            )}
            id="sidebar"

          >
            {sidebars}
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
};
