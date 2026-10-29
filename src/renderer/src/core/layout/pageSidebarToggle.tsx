import { acceleratorFromKeyPress } from "@/core/command/accelerator";
import { useSettings } from "@/core/settings/store/SettingsContext";
import { useTabId } from "@/core/tabs/TabContext";
import { useActiveTabIdOrNull } from "@/core/tabs/TabsProvider";
import { useLatestRef } from "@/core/util/hooks/useLatestRef";
import { useEffect } from "react";

/**
 * The page sidebar's shortcut (`pageSidebarShortcut`, ⌘. by default) toggles
 * the sidebar of the page being looked at — the focused pane's, in a split.
 *
 * Kept tabs stay mounted, so many `PageLayout`s are alive at once and only one
 * of them is meant. Rather than have each listen and ask whether it is the
 * active one (which would re-render every kept page on every tab switch), each
 * registers its toggle under its tab, and one listener (`PageSidebarShortcut`,
 * mounted once by the app) calls the active tab's.
 */
type Entry = { toggle: () => void };

const registered = new Map<string | null, Entry[]>();

/** Called by `PageLayout` with its own toggle. */
export const useRegisterPageSidebarToggle = (toggle: () => void): void => {
  const tabId = useTabId();
  const latest = useLatestRef(toggle);

  useEffect(() => {
    const entry: Entry = { toggle: () => latest.current() };
    registered.set(tabId, [...(registered.get(tabId) ?? []), entry]);
    return () => {
      const rest = (registered.get(tabId) ?? []).filter((other) => other !== entry);
      if (rest.length > 0) registered.set(tabId, rest);
      else registered.delete(tabId);
    };
  }, [tabId, latest]);
};

/**
 * Toggles the page sidebar of `tabId`'s page (null: a page outside any tab).
 * A page nested in another registers first (child effects run first), so the
 * last entry is the outermost page: the one whose sidebar is on screen.
 */
export const togglePageSidebarOf = (tabId: string | null): boolean => {
  const entries = registered.get(tabId);
  const entry = entries?.[entries.length - 1];
  if (!entry) return false;
  entry.toggle();
  return true;
};

/**
 * The one listener. Renders nothing; re-renders only itself when the active
 * tab changes. The same guards as the tab and palette hotkeys.
 */
export const PageSidebarShortcut = () => {
  const { settings } = useSettings();
  const shortcut = settings.pageSidebarShortcut;
  const activeTabId = useLatestRef(useActiveTabIdOrNull());

  useEffect(() => {
    if (!shortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-command-hotkey='off']")) return;
      if (acceleratorFromKeyPress(event) !== shortcut) return;
      if (togglePageSidebarOf(activeTabId.current)) event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut, activeTabId]);

  return null;
};
