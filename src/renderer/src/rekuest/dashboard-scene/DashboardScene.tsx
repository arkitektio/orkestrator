import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { RekuestAgent } from "@/core/linkers";
import { useSmartDrop } from "@/core/smart/hooks";
import MaterializedBlokRenderer from "@/rekuest/components/MaterializedBlokRenderer";
import type { Structure } from "@/core/types";
import {
  Direction,
  DockviewApi,
  DockviewDidDropEvent,
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelHeaderProps,
  IDockviewPanelProps,
  positionToDirection,
  SerializedDockview,
} from "dockview";
import { Check, Circle, Pencil, RotateCcw, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  type DashboardFragment,
  MaterializedBlokFragment,
  useGetBlokQuery,
  useListBloksQuery,
  useMaterializeBlokMutation,
} from "../api/graphql";
import { MaterializeBlokForm } from "../forms/MaterializeBlokForm";

type DroppedAgent = {
  id: string;
  name?: string | null;
};

type DashboardDropContext = {
  blokId?: string;
  agentId?: string;
  agentName?: string;
  position?: {
    group?: string;
    direction: Direction;
  };
};

type DashboardSceneContextValue = {
  dashboard: DashboardFragment;
  refetch: () => Promise<unknown>;
};

type MaterializedBlokPanelParams = {
  title: string;
  mblok: MaterializedBlokFragment;
};

const DashboardSceneContext = createContext<DashboardSceneContextValue | null>(null);

const isStructure = (value: unknown): value is Structure => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "identifier" in value && "object" in value;
};

const isDroppedAgent = (
  structure: Structure,
): structure is Structure & { object: DroppedAgent } => {
  return structure.identifier === RekuestAgent.identifier && typeof structure.id === "string";
};

const parseStructureFromText = (value: string): Structure | null => {
  try {
    const parsed = JSON.parse(value) as unknown;

    return isStructure(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const resolveDashboardDropContext = (
  text: string,
  position?: DashboardDropContext["position"],
): DashboardDropContext | null => {
  if (text.startsWith("blok-")) {
    return {
      blokId: text.replace("blok-", ""),
      position,
    };
  }

  const structure = parseStructureFromText(text);

  if (!structure || !isDroppedAgent(structure)) {
    return null;
  }

  return {
    agentId: structure.object.id,
    agentName: structure.object.name || structure.object.id,
    position,
  };
};

const useDashboardScene = () => {
  const context = useContext(DashboardSceneContext);

  if (!context) {
    throw new Error("useDashboardScene must be used within a DashboardSceneProvider");
  }

  return context;
};

const DashboardDynamicLoader = ({ blok }: { blok: MaterializedBlokFragment }) => {
  return (
    <div className="h-full overflow-auto p-3 @container">
      <MaterializedBlokRenderer
        surfaceId={blok.id}
        materializedBlok={blok}
      />
    </div>
  );
};

const dashboardSceneComponents = {
  MBLOK: (
    props: IDockviewPanelProps<MaterializedBlokPanelParams>,
  ) => {
    return <DashboardDynamicLoader blok={props.params.mblok} />;
  },
} as const;

const DashboardMaterializedBlokTab = (
  props: IDockviewPanelHeaderProps<MaterializedBlokPanelParams> & {
    editing: boolean;
  },
) => {
  return (
    <div className="group flex items-center gap-1.5 px-2 py-1 text-muted-foreground">
      <Circle className="h-2 w-2 fill-current text-primary" />
      <span>{props.params.mblok.blok.name ?? props.api.title}</span>
      {props.editing && (
        <button
          className="ml-1 rounded-sm p-0.5 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 hover:bg-muted"
          onClick={(event) => {
            event.stopPropagation();
            props.api.close();
          }}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

const DashboardAgentBlokPicker = (props: {
  agentName: string;
  onSelect: (blokId: string) => void;
}) => {
  const { data, loading, error } = useListBloksQuery();
  const [search, setSearch] = useState("");

  const filteredBloks = useMemo(() => {
    const needle = search.trim().toLowerCase();

    if (!needle) {
      return data?.bloks ?? [];
    }

    return (data?.bloks ?? []).filter((blok) =>
      blok.name.toLowerCase().includes(needle),
    );
  }, [data?.bloks, search]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-medium">Choose a blok for {props.agentName}</div>
        <Input
          placeholder="Search bloks"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Failed to load bloks: {error.message}
        </div>
      )}

      <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
        {loading && filteredBloks.length === 0 ? (
          <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
            Loading bloks...
          </div>
        ) : filteredBloks.length === 0 ? (
          <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
            No bloks match this search.
          </div>
        ) : (
          filteredBloks.map((blok) => (
            <button
              key={blok.id}
              type="button"
              className="rounded-xl border border-border/60 bg-background px-4 py-3 text-left transition hover:border-primary/50 hover:bg-muted/30"
              onClick={() => {
                props.onSelect(blok.id);
              }}
            >
              <div className="font-medium">{blok.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{blok.id}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

const DashboardBlokMaterializeSelector = (props: {
  blokId: string;
  dashboardId: string;
  prefilledAgentId?: string;
  onMaterialized: (mblok: MaterializedBlokFragment) => void;
}) => {
  const { blokId, dashboardId, prefilledAgentId, onMaterialized } = props;
  const { data, error } = useGetBlokQuery({
    variables: {
      id: blokId,
    },
  });
  const [materialize, { loading }] = useMaterializeBlokMutation();
  const autoMaterializedRef = useRef(false);

  useEffect(() => {
    if (!data || autoMaterializedRef.current || data.blok.dependencies.length > 0) {
      return;
    }

    autoMaterializedRef.current = true;

    materialize({
      variables: {
        input: {
          blok: blokId,
          dashboard: dashboardId,
        },
      },
    })
      .then((result) => {
        const materializedBlok = result.data?.materializeBlok;

        if (!materializedBlok) {
          autoMaterializedRef.current = false;
          toast.error("Failed to materialize blok");
          return;
        }

        onMaterialized(materializedBlok);
      })
      .catch((materializeError) => {
        autoMaterializedRef.current = false;
        toast.error(materializeError.message);
      });
  }, [blokId, dashboardId, data, materialize, onMaterialized]);

  if (error) {
    return <div>Error loading blok: {error.message}</div>;
  }

  if (!data) {
    return <div className="text-sm text-muted-foreground">Loading blok...</div>;
  }

  if (data.blok.dependencies.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        {loading ? "Materializing blok..." : "Preparing blok..."}
      </div>
    );
  }

  return (
    <MaterializeBlokForm
      blokId={data.blok.id}
      dashboardId={dashboardId}
      prefilledAgentId={prefilledAgentId}
      dependencies={data.blok.dependencies.map((dependency) => ({
        id: dependency.id,
        key: dependency.key,
      }))}
      onMaterialized={onMaterialized}
    />
  );
};

const DashboardDropDialog = (props: {
  dashboardId: string;
  dropContext: DashboardDropContext | null;
  selectedAgentBlokId: string | null;
  onClose: () => void;
  onSelectAgentBlok: (blokId: string | null) => void;
  onMaterialized: (mblok: MaterializedBlokFragment) => void;
}) => {
  const dialogBlokId = props.dropContext?.blokId ?? props.selectedAgentBlokId;

  return (
    <Dialog
      open={props.dropContext !== null}
      onOpenChange={(open) => {
        if (!open) {
          props.onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {props.dropContext?.agentId ? "Materialize Blok for Agent" : "Materialize Blok"}
          </DialogTitle>
          <DialogDescription>
            {props.dropContext?.agentId
              ? `Choose a blok to materialize for ${props.dropContext.agentName ?? "the dropped agent"}.`
              : "Configure the blok before adding it to this dashboard."}
          </DialogDescription>
        </DialogHeader>

        {props.dropContext?.agentId && !dialogBlokId ? (
          <DashboardAgentBlokPicker
            agentName={props.dropContext.agentName ?? props.dropContext.agentId}
            onSelect={(blokId) => {
              props.onSelectAgentBlok(blokId);
            }}
          />
        ) : dialogBlokId ? (
          <div className="space-y-4">
            {props.dropContext?.agentId && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <div>
                  <div className="text-sm font-medium">
                    {props.dropContext.agentName ?? props.dropContext.agentId}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    This agent will be preselected for the blok dependencies. Adjust the mappings before submitting if needed.
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    props.onSelectAgentBlok(null);
                  }}
                >
                  Change blok
                </Button>
              </div>
            )}

            <DashboardBlokMaterializeSelector
              blokId={dialogBlokId}
              prefilledAgentId={props.dropContext?.agentId}
              dashboardId={props.dashboardId}
              onMaterialized={props.onMaterialized}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export const DashboardBlokSidebar = () => {
  const { data } = useListBloksQuery();

  return (
    <div className="flex flex-col gap-2 p-3">
      {data?.bloks.map((blok) => (
        <Card
          key={blok.id}
          onDragStart={(event) => {
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", `blok-${blok.id}`);
            }
          }}
          className="cursor-move p-3"
          draggable={true}
        >
          {blok.name}
        </Card>
      ))}
    </div>
  );
};

export const DashboardSceneProvider = ({
  dashboard,
  refetch,
  children,
}: {
  dashboard: DashboardFragment;
  refetch: () => Promise<unknown>;
  children: ReactNode;
}) => {
  const value = useMemo(() => ({ dashboard, refetch }), [dashboard, refetch]);

  return (
    <DashboardSceneContext.Provider value={value}>
      {children}
    </DashboardSceneContext.Provider>
  );
};

export const DashboardScene = () => {
  const { dashboard, refetch } = useDashboardScene();
  const materializedBloks = dashboard.placements.flatMap((placement) =>
    placement.blok ? [placement.blok] : [],
  );
  const layoutStorageKey = `layout_${dashboard.id}`;
  const [api, setApi] = useState<DockviewApi | null>(null);
  const [editing, setEditing] = useState(false);
  const [panelCount, setPanelCount] = useState(materializedBloks.length);
  const [dropContext, setDropContext] = useState<DashboardDropContext | null>(null);
  const [selectedAgentBlokId, setSelectedAgentBlokId] = useState<string | null>(null);

  const closeDropDialog = useCallback(() => {
    setDropContext(null);
    setSelectedAgentBlokId(null);
  }, []);

  const addMaterializedBlok = useCallback((
    mblok: MaterializedBlokFragment,
    dockApi: DockviewApi,
    position?: {
      direction: Direction;
      referenceGroup?: string;
    },
  ) => {
    dockApi.addPanel({
      id: mblok.id,
      component: "MBLOK",
      params: {
        title: mblok.blok.name,
        mblok,
      },
      title: mblok.blok.name,
      position,
    });
  }, []);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    const serializedLayout = localStorage.getItem(layoutStorageKey);

    if (serializedLayout) {
      try {
        const layout = JSON.parse(serializedLayout);

        layout.panels = materializedBloks
          .map((blok) => ({
            id: blok.id,
            contentComponent: "MBLOK",
            params: {
              title: blok.blok.name,
              mblok: blok,
            },
            title: blok.blok.name,
          }))
          .reduce<Record<string, unknown>>((accumulator, panel) => {
            accumulator[panel.id] = panel;
            return accumulator;
          }, {});

        event.api.fromJSON(layout);
      } catch {
        materializedBloks.forEach((blok) => {
          addMaterializedBlok(blok, event.api);
        });
      }
    } else {
      materializedBloks.forEach((blok) => {
        addMaterializedBlok(blok, event.api);
      });
    }

    setApi(event.api);
    setPanelCount(event.api.panels.length);
  }, [addMaterializedBlok, layoutStorageKey, materializedBloks]);

  const [{ isOver }, dropRef] = useSmartDrop(
    (structures) => {
      const droppedAgent = structures.find(isDroppedAgent);

      if (!droppedAgent) {
        return;
      }

      setDropContext({
        agentId: droppedAgent.object.id,
        agentName: droppedAgent.object.name || droppedAgent.object.id,
      });
      setSelectedAgentBlokId(null);
    },
  );

  useEffect(() => {
    if (!api) {
      return;
    }

    const dragDisposable = api.onUnhandledDragOverEvent((event) => {
      event.accept();
    });

    const layoutDisposable = api.onDidLayoutChange(() => {
      const layout: SerializedDockview = api.toJSON();
      localStorage.setItem(layoutStorageKey, JSON.stringify(layout));
      setPanelCount(api.panels.length);
    });

    return () => {
      dragDisposable.dispose();
      layoutDisposable.dispose();
    };
  }, [api, layoutStorageKey]);

  const onMaterialized = useCallback((mblok: MaterializedBlokFragment) => {
    if (!api || dropContext == null) {
      toast.error("Dashboard is not ready for dropping panels yet");
      return;
    }

    addMaterializedBlok(
      mblok,
      api,
      dropContext.position
        ? {
            direction: dropContext.position.direction,
            referenceGroup: dropContext.position.group,
          }
        : undefined,
    );
    closeDropDialog();
    void refetch();
  }, [addMaterializedBlok, api, closeDropDialog, dropContext, refetch]);

  const resetLayout = useCallback(() => {
    if (!api) {
      return;
    }

    api.clear();
    localStorage.removeItem(layoutStorageKey);
    materializedBloks.forEach((blok) => {
      addMaterializedBlok(blok, api);
    });
    setPanelCount(api.panels.length);
  }, [addMaterializedBlok, api, layoutStorageKey, materializedBloks]);

  const renderTab = useCallback(
    (props: IDockviewPanelHeaderProps<MaterializedBlokPanelParams>) => (
      <DashboardMaterializedBlokTab {...props} editing={editing} />
    ),
    [editing],
  );

  const onDidDrop = useCallback((event: DockviewDidDropEvent) => {
    const droppedText = event.nativeEvent?.dataTransfer?.getData("text/plain");

    if (!droppedText) {
      return;
    }

    const nextDropContext = resolveDashboardDropContext(droppedText, {
      group: event.group?.id,
      direction: positionToDirection(event.position),
    });

    if (!nextDropContext) {
      return;
    }

    setDropContext(nextDropContext);
    setSelectedAgentBlokId(null);
  }, []);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      ref={(node) => {
        dropRef(node);
      }}
    >
      <DashboardDropDialog
        dashboardId={dashboard.id}
        dropContext={dropContext}
        selectedAgentBlokId={selectedAgentBlokId}
        onClose={closeDropDialog}
        onSelectAgentBlok={setSelectedAgentBlokId}
        onMaterialized={onMaterialized}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
        <div className="flex shrink-0 items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {dashboard.name || "Untitled dashboard"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Drag bloks from the sidebar or drop agents onto the dashboard to materialize and arrange panels.
            </p>
          </div>

          <div className="flex gap-2">
            {editing ? (
              <>
                <Button onClick={resetLayout} variant="ghost" size="sm">
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reset
                </Button>
                <Button onClick={() => setEditing(false)} variant="default" size="sm">
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Done
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setEditing(true)} variant="ghost" size="sm">
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button onClick={() => void refetch()} variant="outline" size="sm">
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Refresh
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Dashboard
          </span>
          <div className="flex items-center gap-1.5">
            <Circle className="h-2 w-2 fill-current text-green-500" />
            <span className="text-xs text-muted-foreground">{panelCount} panels open</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle className="h-2 w-2 fill-current text-primary" />
            <span className="text-xs text-muted-foreground">
              {dashboard.placements.length} placements
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle className="h-2 w-2 fill-current text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Drop enabled</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl">
          <div className="relative h-full w-full">
            {isOver && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-3 text-sm shadow-lg">
                  Drop an agent card to choose and materialize a blok.
                </div>
              </div>
            )}
            <DockviewReact
              components={dashboardSceneComponents}
              defaultTabComponent={renderTab}
              onReady={onReady}
              className="dockview-theme-abyss h-full w-full"
              onDidDrop={onDidDrop}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
