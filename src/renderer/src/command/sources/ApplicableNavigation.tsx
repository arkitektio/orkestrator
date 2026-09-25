import { Arkitekt } from "@/app/Arkitekt";
import { useDialog } from "@/app/dialog";
import { moduleIcon } from "@/app/components/navigation/moduleIcons";
import { useDebug } from "@/providers/debug/DebugContext";
import { useSettings } from "@/providers/settings/SettingsContext";
import { useTheme } from "@/providers/ThemeProvider";
import { smartRegistry } from "@/providers/smart/registry";
import { CommandActionRow } from "@/providers/smart/extensions/CommandActionRow";
import type { PassDownProps } from "@/providers/smart/extensions/types";
import { CommandGroup } from "cmdk";
import { ArrowRight, Pin, PinOff } from "lucide-react";
import { useMemo } from "react";
import useReactRouterBreadcrumbs from "use-react-router-breadcrumbs";
import { useNavigate } from "react-router-dom";

import { matchesFilter, rankByFilter } from "../filter";
import { useOpenTarget } from "../useOpenTarget";
import { useActiveTab, useTabActions } from "../tabs/TabsProvider";
import { APP_COMMANDS } from "./appCommands";
import { ROUTE_CATALOG, searchRoutes } from "./routeCatalog";
import { breadcrumbText } from "@/lib/breadcrumbText";
import { isElectron } from "@/lib/platform";

/**
 * Where you can go, and what the app itself can do.
 *
 * Entirely client-side — no GraphQL, no guards — which is deliberate: this is
 * the source that still works on a fresh install with no backend configured, and
 * on the dashboard, where until now the palette did not exist at all.
 *
 * Three kinds of destination: modules from `moduleRegistry` (filtered to the
 * ones whose service is actually ready, so we never offer a route that renders a
 * "not configured" screen), the pages inside them from `ROUTE_CATALOG` — so
 * typing "tasks" finds Rekuest › Tasks — and the 129 entity list pages from
 * `smartRegistry`.
 */
export const ApplicableNavigation = ({ filter, onDone }: PassDownProps) => {
  const navigate = useNavigate();
  const modules = Arkitekt.useAvailableModules();
  const { openDialog } = useDialog();
  const breadcrumbs = useReactRouterBreadcrumbs();
  const { debug, setDebug } = useDebug();
  const { setTheme, toggleTheme } = useTheme();
  const { settings, setSettings } = useSettings();
  const actions = Arkitekt.useActions();
  const openTarget = useOpenTarget();
  const activeTab = useActiveTab();
  const { setPinned } = useTabActions();

  const moduleRows = useMemo(
    () =>
      rankByFilter(
        // A module whose service is not ready routes to a fallback screen;
        // offering it as a destination is offering a dead end.
        modules.filter((m) => m.status === "ready"),
        (m) => [m.definition.label, m.key],
        filter,
      ),
    [modules, filter],
  );

  const pageRows = useMemo(
    () =>
      searchRoutes(
        ROUTE_CATALOG,
        [
          // Team (lok) is the session's own service: signed in means it is up.
          { key: "lok", label: "Team" },
          ...modules.filter((m) => m.status === "ready").map((m) => ({ key: m.key, label: m.definition.label })),
        ],
        filter,
      ),
    [modules, filter],
  );

  const listRows = useMemo(() => {
    if (!filter?.trim()) {
      // 129 list pages with nothing typed is noise, not navigation.
      return [];
    }
    return rankByFilter(
      smartRegistry.registeredModels(),
      (model) => [model.name, model.identifier],
      filter,
      8,
    );
  }, [filter]);

  // Mirrors the pin on the tab's row in the rail, so the same thing is
  // reachable without the pointer — in both directions, since a pin you cannot
  // undo from where you made it is half a control.
  const tabPinned = Boolean(activeTab.pinned);
  const pinRow = useMemo(
    () =>
      matchesFilter(
        tabPinned ? ["Unpin this tab", "pin", "release"] : ["Pin this tab", "pin", "keep"],
        filter,
      )
        ? [{ label: currentPageLabel(breadcrumbs) }]
        : [],
    [tabPinned, filter, breadcrumbs],
  );

  const commandRows = useMemo(
    () =>
      rankByFilter(
        APP_COMMANDS.filter((c) => !c.electronOnly || isElectron()),
        (c) => [c.title, c.description, ...(c.keywords ?? [])],
        filter,
      ),
    [filter],
  );

  const run = (fn: () => void) => {
    fn();
    onDone?.({ kind: "local" });
  };

  return (
    <>
      {moduleRows.length > 0 && (
        <CommandGroup heading={<GroupHeading>Go to</GroupHeading>}>
          {moduleRows.map((module) => (
            <CommandActionRow
              key={`module-${module.key}`}
              title={module.definition.label || module.key}
              description={module.route}
              trailing={moduleIcon(module.key)}
              icon={ArrowRight}
              onSelect={() =>
                run(() => {
                  openTarget({
                    kind: "route",
                    route: module.route,
                    label: module.definition.label || module.key,
                  });
                })
              }
            />
          ))}
        </CommandGroup>
      )}

      {pageRows.length > 0 && (
        <CommandGroup heading={<GroupHeading>Pages</GroupHeading>}>
          {pageRows.map((page) => (
            <CommandActionRow
              key={`page-${page.route}`}
              title={page.label}
              description={`${moduleLabel(modules, page.module)} · ${page.route}`}
              trailing={moduleIcon(page.module)}
              icon={ArrowRight}
              onSelect={() =>
                run(() => {
                  openTarget({ kind: "route", route: page.route, label: page.label });
                })
              }
            />
          ))}
        </CommandGroup>
      )}

      {listRows.length > 0 && (
        <CommandGroup heading={<GroupHeading>Browse</GroupHeading>}>
          {listRows.map((model) => (
            <CommandActionRow
              key={`list-${model.identifier}`}
              title={smartRegistry.getDisplayName(model.identifier)}
              description={model.identifier}
              icon={ArrowRight}
              onSelect={() =>
                run(() => {
                  openTarget({
                    kind: "route",
                    route: `/${model.path}`,
                    label: smartRegistry.getDisplayName(model.identifier),
                  });
                })
              }
            />
          ))}
        </CommandGroup>
      )}

      {pinRow.length > 0 && (
        <CommandGroup heading={<GroupHeading>This tab</GroupHeading>}>
          <CommandActionRow
            title={tabPinned ? "Unpin this tab" : "Pin this tab"}
            description={pinRow[0].label}
            icon={tabPinned ? PinOff : Pin}
            onSelect={() => run(() => setPinned(activeTab.id, !tabPinned))}
          />
        </CommandGroup>
      )}

      {commandRows.length > 0 && (
        <CommandGroup heading={<GroupHeading>Commands</GroupHeading>}>
          {commandRows.map((command) => (
            <CommandActionRow
              key={`command-${command.id}`}
              title={command.title}
              description={command.description}
              icon={command.icon}
              onSelect={() =>
                run(() =>
                  command.run({
                    navigate,
                    openDialog: openDialog as never,
                    toggleDebug: () => setDebug(!debug),
                    parkSession: () => void actions.disconnect(),
                    // A failure lands in `autoLoginError`, where the shell shows it.
                    reconnect: () => void actions.reconnect().catch(() => {}),
                    clearCaches: () => void actions.clearAllServiceCaches(),
                    setTheme,
                    toggleTheme,
                    zoomLevel: settings.defaultZoomLevel,
                    setZoomLevel: (level) =>
                      setSettings({ ...settings, defaultZoomLevel: level }),
                  }),
                )
              }
            />
          ))}
        </CommandGroup>
      )}
    </>
  );
};

const moduleLabel = (
  modules: { key: string; definition: { label?: string | null } }[],
  key: string,
): string => modules.find((m) => m.key === key)?.definition.label || key;

/** The deepest crumb with text — an entity name still loading comes back as a
 * component, which is not a label. */
const currentPageLabel = (
  breadcrumbs: { breadcrumb: React.ReactNode }[],
): string =>
  [...breadcrumbs]
    .reverse()
    .map(({ breadcrumb }) => breadcrumbText(breadcrumb))
    .find(Boolean) ?? "This page";

const GroupHeading = ({ children }: { children: React.ReactNode }) => (
  <span className="font-light text-xs w-full items-center ml-2">{children}</span>
);

export default ApplicableNavigation;
