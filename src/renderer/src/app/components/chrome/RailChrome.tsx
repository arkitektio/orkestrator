import { dragZoneDoubleClick, getChromeMode, trafficLightGutter, useWindowState } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, ChevronsRight, Code2, Link2, Link2Off, MoreHorizontal, RotateCw, Share2 } from "lucide-react";

import { Fragment } from "react";

import { useActiveTabNavigation } from "@/command/tabs/useActiveTabNavigation";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCopyUniversalLink } from "@/hooks/use-copy-universal-link";
import { useMeasuredWidth, visibleNavCount } from "./navOverflow";
import { TitleSearchBar } from "./TitleSearchBar";
import { WindowControls } from "./WindowControls";

/**
 * The window's chrome, with no title bar.
 *
 * There is no horizontal bar anywhere in this app: the traffic lights sit
 * directly on the rail's surface and the rail IS the chrome, so the window reads
 * as one continuous surface with the content floating on top of it. A title bar
 * row would reintroduce exactly the hard horizontal divide this shape exists to
 * remove.
 *
 * Two rows: the lights and the navigation controls share the first, the search
 * pill gets the second. The consequence of having no bar is that dragging lives
 * here — `app-drag` on this zone is the only way to move the window, which makes
 * the `app-no-drag` on every control up here load-bearing rather than
 * defensive. A drag region swallows clicks silently.
 */

const navButtonClass =
  "app-no-drag flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent";

type NavItem = {
  key: string;
  label: string;
  title?: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onSelect: () => void;
  /**
   * The other forms of this button's action, on right-click — the same thing
   * copied differently, never a second action hidden under the first.
   */
  more?: { key: string; label: string; icon: React.ReactNode; onSelect: () => void }[];
};

/**
 * Back, forward, reload, share — the row above the search, as a browser has.
 *
 * Each tab has a memory history of its own, which — unlike the old
 * `HashRouter` — knows its depth. So Back and Forward are greyed at the ends
 * rather than silently doing nothing. Share copies the active tab's universal
 * link (`lib/universalLink.ts`): the one URL that opens this page from a chat
 * or an email — scoped to this deployment, so it cannot quietly open a
 * different object on someone else's.
 *
 * The rail can be dragged narrow, and on macOS the traffic lights take the
 * first 78px of this row, so the buttons do not always fit. The row measures
 * itself and folds buttons from the right behind a "…" menu — Share goes
 * first, Back last, in the order they are least missed.
 */
const NavButtons = ({ appMenu }: { appMenu: boolean }) => {
  const { back, forward, canGoBack, canGoForward, location } = useActiveTabNavigation();
  const { copy, copyPrivate, copyBadge, copied } = useCopyUniversalLink(location);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  const reload = () => {
    if (window.api) {
      void window.api.reloadWindow();
    } else {
      window.location.reload();
    }
  };

  const items: NavItem[] = [
    { key: "back", label: "Back", icon: <ArrowLeft className="h-3.5 w-3.5" />, disabled: !canGoBack, onSelect: back },
    { key: "forward", label: "Forward", icon: <ArrowRight className="h-3.5 w-3.5" />, disabled: !canGoForward, onSelect: forward },
    { key: "reload", label: "Reload", icon: <RotateCw className="h-3.5 w-3.5" />, onSelect: reload },
    {
      key: "share",
      label: "Share",
      title: copied ? "Link copied" : "Copy a link to this page — right-click for the README badge",
      icon: copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Share2 className="h-3.5 w-3.5" />,
      onSelect: () => void copy(),
      more: [
        {
          key: "link",
          label: "Copy link",
          icon: <Link2 className="h-3.5 w-3.5" />,
          onSelect: () => void copy(),
        },
        {
          key: "private",
          label: "Copy private link",
          icon: <Link2Off className="h-3.5 w-3.5" />,
          onSelect: () => void copyPrivate(),
        },
        {
          key: "badge",
          label: "Copy as badge",
          icon: <Code2 className="h-3.5 w-3.5" />,
          onSelect: () => void copyBadge(),
        },
      ],
    },
  ];

  const visible = visibleNavCount(width, items.length);
  const inline = items.slice(0, visible);
  const overflow = items.slice(visible);

  return (
    // `min-w-0` so this can shrink below its content and report the width
    // that is actually there, instead of pushing the row wider.
    <div ref={ref} className="flex min-w-0 flex-1 items-center gap-0.5">
      {inline.map((item) => {
        const button = (
          <button
            type="button"
            aria-label={item.label}
            title={item.title}
            className={navButtonClass}
            disabled={item.disabled}
            onClick={item.onSelect}
          >
            {item.icon}
          </button>
        );
        if (!item.more) return <Fragment key={item.key}>{button}</Fragment>;
        return (
          <ContextMenu key={item.key}>
            <ContextMenuTrigger asChild>{button}</ContextMenuTrigger>
            <ContextMenuContent className="min-w-40">
              {item.more.map((entry) => (
                <ContextMenuItem key={entry.key} onSelect={entry.onSelect}>
                  {entry.icon}
                  {entry.label}
                </ContextMenuItem>
              ))}
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="More" title="More" className={navButtonClass}>
              {/* "…" is taken by the app menu where there is one, so the
                  overflow reads as the browser's "more buttons" chevron. */}
              {appMenu ? <ChevronsRight className="h-3.5 w-3.5" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-36">
            {overflow.map((item) => (
              <Fragment key={item.key}>
                <DropdownMenuItem disabled={item.disabled} onSelect={item.onSelect}>
                  {item.icon}
                  {item.title ?? item.label}
                </DropdownMenuItem>
                {/* A menu row has no right-click, so the other forms get rows
                    of their own once the button is folded away. */}
                {item.more
                  ?.filter((entry) => entry.key !== "link")
                  .map((entry) => (
                    <DropdownMenuItem key={entry.key} onSelect={entry.onSelect}>
                      {entry.icon}
                      {entry.label}
                    </DropdownMenuItem>
                  ))}
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

/**
 * The application menu (File / Edit / View / Window), where the OS no longer
 * shows it. Windows has lost its caption and Linux its frame, so neither has a
 * menu bar; main pops the real menu up natively under this button — the same
 * items and accelerators macOS keeps in its global menu bar.
 */
const AppMenuButton = () => (
  <button
    type="button"
    aria-label="Application menu"
    title="Menu"
    className={navButtonClass}
    onClick={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      window.api?.windowControls?.popupAppMenu?.(rect.left, rect.bottom + 4);
    }}
  >
    <MoreHorizontal className="h-3.5 w-3.5" />
  </button>
);

export const RailChrome = () => {
  const mode = getChromeMode();
  // `autohide` is Windows, `buttons` Linux: the two with no menu bar.
  const appMenu = mode === "autohide" || mode === "buttons";
  const { fullscreen, maximized } = useWindowState();

  const gutter = trafficLightGutter(mode, fullscreen);

  return (
    <div
      className={cn("flex shrink-0 flex-col gap-1.5 px-2 pb-2 pt-2", mode !== "none" && "app-drag")}
      onDoubleClick={dragZoneDoubleClick(mode)}
    >
      <div className="flex h-7 items-center gap-0.5">
        {/* Horizontal room for the real traffic lights, which macOS draws over
            this surface. Collapses in fullscreen, where it removes them —
            otherwise the controls beside them would sit permanently indented. */}
        {gutter > 0 && (
          <div
            aria-hidden
            data-testid="traffic-light-gutter"
            className="shrink-0 transition-[width] duration-150"
            style={{ width: gutter }}
          />
        )}

        <NavButtons appMenu={appMenu} />

        {appMenu && <AppMenuButton />}

        {/* Linux is the one genuinely frameless platform, so it is the one that
            needs us to supply these — inline here rather than stranded at the
            foot of the rail. */}
        {mode === "buttons" && <WindowControls maximized={maximized} compact />}
      </div>

      <TitleSearchBar />
    </div>
  );
};
