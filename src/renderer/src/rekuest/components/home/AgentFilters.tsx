import { useSelf } from "@/core/connection/useSelf";
import { useStructureOptionList } from "@/core/modules/hooks/useStructureOptions";
import { Badge } from "@/core/ui/badge";
import { FilterClear, FilterPicker, FilterSearchField, FilterToggle } from "@/core/ui/filter-bar";
import { parseAsBoolean, parseAsString, useQueryState } from "@/core/util/hooks/use-search-param-state";
import { AgentKind } from "@/rekuest/api/graphql";
import { useDebounce } from "@uidotdev/usehooks";
import { AppWindow, Eye, MonitorSmartphone, Shapes, Users, Wifi } from "lucide-react";

/** URL value that lifts a filter whose default is NOT "everything" (`user`, `kind`). */
export const ALL = "__all__";

const DEFAULT_KIND = AgentKind.Websocket;
const KIND_LABELS: Record<AgentKind, string> = {
  [AgentKind.Websocket]: "Apps",
  [AgentKind.Webhook]: "Webhooks",
};

/**
 * The home page's app filters, kept in the URL so a filtered home is a link.
 * Only what departs from the defaults is written. `user`, `kind` and `online`
 * have a default that is not "everything": absent means the signed-in user's
 * agents / the non-hook ones / the connected ones; `ALL` and `online=false`
 * lift them.
 */
export const useAgentFilters = () => {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  // Debounced so a keystroke does not refetch; the field shows what was typed at once.
  const debouncedSearch = useDebounce(search.trim(), 400);
  const [user, setUser] = useQueryState("user", parseAsString);
  const [app, setApp] = useQueryState("app", parseAsString);
  const [device, setDevice] = useQueryState("device", parseAsString);
  const [kind, setKind] = useQueryState("kind", parseAsString);
  const [supervisor, setSupervisor] = useQueryState("supervisor", parseAsString);
  // Online only unless the URL says `online=false`: what can run comes first.
  const [onlineOnly, setOnlineOnly] = useQueryState("online", parseAsBoolean.withDefault(true));

  // No `user` in the URL means the signed-in user's own agents.
  const { userId } = useSelf();

  return {
    state: { search, user, app, device, kind, supervisor, onlineOnly },
    /** What the list is narrowed to, defaults resolved. */
    resolved: {
      search: debouncedSearch,
      user: user === ALL ? null : (user ?? userId ?? null),
      kind: kind === ALL ? null : ((kind as AgentKind | null) ?? DEFAULT_KIND),
      app,
      device,
      supervisor,
      onlineOnly,
    },
    /** "Mine" before the identity is known would list everyone's agents. */
    pending: user === null && !userId,
    // The typed text counts at once, so Clear shows while the search is still settling.
    // Showing offline apps too departs from the default, so it counts.
    active: Boolean(search.trim() || user || app || device || kind || supervisor || !onlineOnly),
    setSearch: (next: string) => setSearch(next || null),
    setUser,
    setApp,
    setDevice,
    setKind,
    setSupervisor,
    setOnlineOnly,
    clear: () => {
      setSearch(null);
      setUser(null);
      setApp(null);
      setDevice(null);
      setKind(null);
      setSupervisor(null);
      setOnlineOnly(null);
    },
  };
};

export type AgentFilters = ReturnType<typeof useAgentFilters>;

/**
 * The home page's filter row, over the apps it narrows: what the app is
 * called, whose it is, what kind of agent, which app, device and supervisor,
 * and whether it is online. Lok's users, apps and devices are answered by lok
 * (its option sources).
 */
export const AgentFilterBar = ({ filters, onlineCount }: { filters: AgentFilters; onlineCount: number }) => {
  const { state, active, setSearch, setUser, setApp, setDevice, setKind, setSupervisor, setOnlineOnly, clear } = filters;
  const { userId } = useSelf();
  const users = useStructureOptionList("@lok/user");
  const apps = useStructureOptionList("@lok/app", "identifier");
  const devices = useStructureOptionList("@lok/device", "nodeId");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSearchField value={state.search} onChange={setSearch} placeholder="Search apps…" />
      <FilterPicker
        icon={Users}
        label="People"
        value={state.user}
        onChange={setUser}
        defaultLabel="Mine"
        pinned={[{ value: ALL, label: "Everyone" }]}
        options={users.filter((option) => option.value !== userId)}
        heading="Members"
        searchable
      />
      <FilterPicker
        icon={Shapes}
        label="Type"
        value={state.kind}
        onChange={setKind}
        defaultLabel={KIND_LABELS[DEFAULT_KIND]}
        pinned={[
          { value: AgentKind.Webhook, label: KIND_LABELS[AgentKind.Webhook] },
          { value: ALL, label: "All types" },
        ]}
        options={[]}
      />
      <FilterPicker
        icon={AppWindow}
        label="Apps"
        value={state.app}
        onChange={setApp}
        defaultLabel="Any app"
        options={apps}
        searchable
      />
      <FilterPicker
        icon={MonitorSmartphone}
        label="Devices"
        value={state.device}
        onChange={setDevice}
        defaultLabel="Any device"
        options={devices}
        searchable
      />
      {/* A supervisor is an app (e.g. plugin_engine), named by its identifier. */}
      <FilterPicker
        icon={Eye}
        label="Supervisors"
        value={state.supervisor}
        onChange={setSupervisor}
        defaultLabel="Any supervisor"
        options={apps}
        searchable
      />
      <FilterToggle icon={Wifi} pressed={state.onlineOnly} onPressedChange={setOnlineOnly}>
        Online
        {onlineCount > 0 && <Badge variant="secondary">{onlineCount}</Badge>}
      </FilterToggle>
      {active && <FilterClear onClear={clear} />}
    </div>
  );
};
