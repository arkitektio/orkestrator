import { Arkitekt } from "@/app/Arkitekt";
import { ConnectingFallback } from "@/app/components/fallbacks/Connecting";
import { QuietPage } from "@/app/components/fallbacks/QuietPage";
import { ShellSignInNotice } from "@/app/components/shell/ShellSignInNotice";
import { Button } from "@/components/ui/button";
import { ServiceRuntimeState } from "@/lib/arkitekt/types";
import { useMyContextQuery } from "@/lok-next/api/graphql";
import { useDashboardRegistry } from "@/providers/dashboard";
import type { DashboardWidgetRegistration } from "@/providers/dashboard";
import {
  DockviewApi,
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
  IDockviewPanelHeaderProps,
  SerializedDockview,
} from "dockview";
import {
  ArrowRight,
  Circle,
  Pencil,
  Plus,
  RotateCcw,
  Check,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BreadCrumbs from "@/components/navigation/BreadCrumbs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProfileSwitcher from "@/app/components/profile/ProfileSwitcher";
// The dashboard layout scope and the profile id are deliberately the same
// string, so a profile switch re-scopes the dockview layout for free.
import { buildScopeKey } from "@/lib/arkitekt/fakts/profileStorageSchema";
import { hasRestorablePanels, widgetKeysToAdd } from "./dashboardLayout";



// ── DockView panel component ──

const WidgetPanel = (
  props: IDockviewPanelProps<{ widgetKey: string }>,
) => {
  const widgets = useDashboardRegistry((s) => s.widgets);
  const widget = widgets[props.params.widgetKey];

  return (
    <div className="h-full overflow-auto px-5 pb-5 pt-2 @container">
      {/* A restored panel can outlive its widget: the layout is saved per
          scope, but a module only registers its widgets once its service is
          ready. Say so instead of rendering an empty box. */}
      {widget ? (
        widget.component()
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Waiting for this widget's service…
        </div>
      )}
    </div>
  );
};

// ── DockView custom tab component ──

const WidgetTab = (
  props: IDockviewPanelHeaderProps<{ widgetKey: string }>,
) => {
  const widgets = useDashboardRegistry((s) => s.widgets);
  const editing = useDashboardRegistry((s) => s.editing);
  const widget = widgets[props.params.widgetKey];

  return (
    <div className="group flex items-center gap-2 px-3 py-1 text-muted-foreground">
      {widget?.icon}
      <span>{widget?.label ?? props.api.title}</span>
      {editing && (
        <button
          className="ml-1 rounded-full p-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-muted transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            props.api.close();
          }}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

const components = {
  widget: WidgetPanel,
} as const;

// ── Helpers ──

/** Add a widget as a new split panel — never as a tab, alternating right/below */
const addWidgetPanel = (
  api: DockviewApi,
  w: DashboardWidgetRegistration,
) => {
  const panels = api.panels;
  // `addPanel` throws on an id the grid already holds, and a throw inside an
  // effect unmounts the whole dashboard.
  if (panels.some((p) => p.id === w.key)) return;
  const lastPanel = panels.length > 0 ? panels[panels.length - 1] : null;
  // Alternate off the panel count rather than a module-level cursor, which
  // survived remounts and made the same widget set lay out differently.
  const direction = panels.length % 2 === 1 ? "right" : "below";
  api.addPanel({
    id: w.key,
    component: "widget",
    params: { widgetKey: w.key },
    title: w.label,
    ...(lastPanel
      ? {
          position: {
            referencePanel: lastPanel.id,
            direction,
          },
        }
      : {}),

    initialWidth: w.defaultWidth,
    initialHeight: w.defaultHeight,
  });
};

// ── Service health dots ──

const statusColor: Record<string, string> = {
  ready: "text-green-500",
  checking: "text-yellow-500",
  configured: "text-blue-500",
  unconfigured: "text-muted-foreground/40",
  invalid: "text-destructive",
};

const statusLabel: Record<string, string> = {
  ready: "Healthy",
  checking: "Testing",
  configured: "Configuring",
  unconfigured: "Not configured",
  invalid: "Down",
};

const ServiceHealthDot = ({ state }: { state: ServiceRuntimeState }) => (
  <div
    className="flex items-center gap-1.5"
    title={`${state.key}: ${statusLabel[state.status] ?? state.status}`}
  >
    <Circle
      className={`w-2 h-2 fill-current ${statusColor[state.status] ?? "text-muted-foreground"}`}
    />
    <span className="text-xs text-muted-foreground">{state.key}</span>
  </div>
);

// ── Add-widget dropdown ──

const AddWidgetButton = ({ api }: { api: DockviewApi | null }) => {
  const widgets = useDashboardRegistry((s) => s.widgets);
  const [open, setOpen] = useState(false);

  const existingPanelIds = useMemo(() => {
    if (!api) return new Set<string>();
    return new Set(api.panels.map((p) => p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, open]); // re-compute when toggled

  const missing = Object.values(widgets).filter(
    (w) => !existingPanelIds.has(w.key),
  );

  if (missing.length === 0) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="rounded-full"
        onClick={() => setOpen(!open)}
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Add widget
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-2xl shadow-lg p-1.5 min-w-[160px]">
          {missing.map((w) => (
            <button
              key={w.key}
              className="w-full text-left rounded-xl px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              onClick={() => {
                if (api) addWidgetPanel(api, w);
                setOpen(false);
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Dashboard ──

export const Home = () => {
  const disconnect = Arkitekt.useDisconnect();
  const { data: contextData } = useMyContextQuery({ fetchPolicy: "cache-and-network" });
  const connection = Arkitekt.useConnection();
  const availableServices = Arkitekt.useAvailableServices();

  const widgets = useDashboardRegistry((s) => s.widgets);
  const saveLayout = useDashboardRegistry((s) => s.saveLayout);
  const setScope = useDashboardRegistry((s) => s.setScope);
  const clearLayout = useDashboardRegistry((s) => s.clearLayout);
  const editing = useDashboardRegistry((s) => s.editing);
  const setEditing = useDashboardRegistry((s) => s.setEditing);

  const [api, setApi] = useState<DockviewApi | null>(null);
  const widgetsRef = useRef(widgets);
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  // Track which widget keys have been added as panels so far
  const addedKeysRef = useRef<Set<string>>(new Set());
  // Track the current scope to detect changes
  const activeScopeRef = useRef<string | null>(null);

  // Compute scope from context + connection
  const baseUrl = connection?.endpoint?.base_url;
  const userId = contextData?.mycontext?.user.id;
  const orgId = contextData?.mycontext?.organization?.id;
  // Same key the profile book derives, hub and all: two hubs of one
  // organization are two profiles, so they are two dashboards too — a layout
  // shared across them would show widgets scoped to the hub you are not in.
  const hubId = contextData?.mycontext?.hub?.id;
  const currentScope = useMemo(() => {
    if (!baseUrl || !userId) return null;
    return buildScopeKey(baseUrl, userId, orgId ?? "personal", hubId);
  }, [baseUrl, userId, orgId, hubId]);


  const addAllDefaultPanels = useCallback(
    (dockApi: DockviewApi, widgetMap: Record<string, DashboardWidgetRegistration>) => {
      widgetKeysToAdd(
        Object.keys(widgetMap),
        addedKeysRef.current,
        dockApi.panels.map((p) => p.id),
      ).forEach((key) => {
        addWidgetPanel(dockApi, widgetMap[key]);
        addedKeysRef.current.add(key);
      });
    },
    [],
  );

  const restoreLayout = useCallback(
    (dockApi: DockviewApi, saved: SerializedDockview, currentWidgets: Record<string, DashboardWidgetRegistration>) => {
      const layout: SerializedDockview = {
        ...saved,
        panels: Object.fromEntries(
          Object.entries(saved.panels).map(([id, panel]) => [
            id,
            {
              ...panel,
              contentComponent: "widget",
              params: { widgetKey: id },
              title: currentWidgets[id]?.label ?? panel.title ?? id,
            },
          ]),
        ),
      };
      dockApi.fromJSON(layout);
      // Mark all widget keys that were known when the layout was saved.
      // This includes panels the user intentionally removed — they should
      // NOT be re-added. Only genuinely new widgets (not in knownKeys) will pass.
      const knownKeys = useDashboardRegistry.getState().knownWidgetKeys;
      if (knownKeys) {
        knownKeys.forEach((k) => addedKeysRef.current.add(k));
      }
      dockApi.panels.forEach((p) => addedKeysRef.current.add(p.id));
      // Add only genuinely new widgets that weren't known at save time
      addAllDefaultPanels(dockApi, currentWidgets);
    },
    [addAllDefaultPanels],
  );

  /**
   * Fill an empty grid from the active scope's saved layout, or from the
   * default panel set.
   *
   * `addedKeysRef` is reset first: it describes one dockview instance, and
   * every caller here starts from a grid with no panels in it. Carrying the
   * previous instance's keys over is what left the dashboard blank — every
   * default panel looked as though it had already been added.
   */
  const rebuild = useCallback(
    (dockApi: DockviewApi) => {
      dockApi.clear();
      addedKeysRef.current.clear();

      const saved = useDashboardRegistry.getState().serializedLayout;
      if (hasRestorablePanels(saved)) {
        try {
          restoreLayout(dockApi, saved!, widgetsRef.current);
          return;
        } catch {
          // A layout dockview refused to load leaves the grid cleared; the
          // default set below is the recovery.
          dockApi.clear();
          addedKeysRef.current.clear();
        }
      }

      addAllDefaultPanels(dockApi, widgetsRef.current);
    },
    [addAllDefaultPanels, restoreLayout],
  );

  // Set scope when it changes — this reloads the layout from the right storage key
  useEffect(() => {
    if (!currentScope || currentScope === activeScopeRef.current) return;

    setScope(currentScope);

    // `api` is whatever this render saw. On the first pass `onReady` has
    // already run and rebuilt from this scope, but its `setApi` has not
    // landed yet — so the scope is only marked handled once a live grid has
    // actually been rebuilt, and the effect runs again when `api` arrives.
    if (!api) return;

    activeScopeRef.current = currentScope;
    rebuild(api);
  }, [currentScope, api, setScope, rebuild]);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      rebuild(event.api);
      setApi(event.api);
    },
    [rebuild],
  );

  // Persist layout on changes
  useEffect(() => {
    if (!api) return;
    const disposable = api.onDidLayoutChange(() => {
      saveLayout(api.toJSON());
    });
    return () => disposable.dispose();
  }, [api, saveLayout]);

  // Accept unhandled drag-over
  useEffect(() => {
    if (!api) return;
    const disposable = api.onUnhandledDragOverEvent((e) => e.accept());
    return () => disposable.dispose();
  }, [api]);

  // When new widgets register after DockView is ready, add them as new panels
  useEffect(() => {
    if (!api) return;
    const newKeys = widgetKeysToAdd(
      Object.keys(widgets),
      addedKeysRef.current,
      api.panels.map((p) => p.id),
    );
    newKeys.forEach((k) => {
      const w = widgets[k];
      addWidgetPanel(api, w);
      addedKeysRef.current.add(k);
    });
  }, [api, widgets]);

  const resetLayout = useCallback(() => {
    if (!api) return;
    api.clear();
    addedKeysRef.current.clear();
    clearLayout();
    addAllDefaultPanels(api, widgetsRef.current);
  }, [api, addAllDefaultPanels, clearLayout]);

  // A grid that ended up with nothing in it is a dead dashboard: the user sees
  // an empty page and there is no control on it to bring the widgets back.
  // This catches whatever got it there — a layout that would not load, or
  // widgets that only registered once their service came up, after the
  // rebuild had already run against an empty registry.
  //
  // Once per grid: a later emptying is the user's own doing (edit mode closes
  // panels) and must stand.
  const healedApiRef = useRef<DockviewApi | null>(null);
  useEffect(() => {
    if (!api || api.panels.length > 0) return;
    if (healedApiRef.current === api) return;
    if (Object.keys(widgets).length === 0) return;

    healedApiRef.current = api;
    addedKeysRef.current.clear();
    addAllDefaultPanels(api, widgets);
  }, [api, widgets, addAllDefaultPanels]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="px-6 py-5 flex flex-col flex-1 gap-4 min-h-0">
        {/* Breadcrumbs */}
        <div className="shrink-0">
          <BreadCrumbs />
        </div>

        {/* Header */}
        <div className="flex items-end justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {contextData?.mycontext?.user.username || "User"}
            </h1>
            {contextData?.mycontext?.organization && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Working with{" "}
                <span className="font-medium text-foreground">
                  {contextData.mycontext.organization.name}
                </span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <AddWidgetButton api={api} />
                <Button onClick={resetLayout} variant="ghost" size="sm" className="rounded-full">
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Reset
                </Button>
                <Button onClick={() => setEditing(false)} variant="default" size="sm" className="rounded-full">
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Done
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setEditing(true)} variant="ghost" size="sm" className="rounded-full">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Users className="w-3.5 h-3.5 mr-1.5" />
                      Switch
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 rounded-2xl">
                    <ProfileSwitcher />
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={disconnect} variant="ghost" size="sm" className="rounded-full">
                  <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                  Sign out
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Service health strip */}
        {availableServices.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap shrink-0 self-start rounded-full border bg-card px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Services
            </span>
            {availableServices.map((s) => (
              <ServiceHealthDot key={s.key} state={s} />
            ))}
          </div>
        )}

        {/* DockView dashboard */}
        <div className="flex-1 min-h-0 rounded-3xl overflow-hidden">
          <DockviewReact
            components={components}
            defaultTabComponent={WidgetTab}
            onReady={onReady}
            className="dockview-theme-abyss dockview-dashboard h-full w-full"
          />
        </div>
      </div>
    </div>
  );
};

function Page() {
  return (
    <div className="h-full w-full">
      <Arkitekt.Guard
        notConnectedFallback={<ShellSignInNotice />}
        bootingFallback={<QuietPage />}
        connectingFallback={<ConnectingFallback />}
      >
        <Home />
      </Arkitekt.Guard>
    </div>
  );
}

export default Page;
