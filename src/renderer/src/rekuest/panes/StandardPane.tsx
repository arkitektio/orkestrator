import { AgentController } from "@/core/agent/AgentController";
import { ListRender } from "@/core/layout/ListRender";
import { SidebarLayout } from "@/core/layout/SidebarLayout";
import { FancyInput } from "@/core/ui/fancy-input";
import { PaneLink, SidePaneGroup, SidePaneNav } from "@/core/ui/sidepane";
import { cn } from "@/core/util/utils";
import { RekuestAgent, RekuestDashboard } from "@/core/linkers";
import { ListAgentFragment } from "@/rekuest/api/graphql";
import { useDebounce } from "@uidotdev/usehooks";
import { Box, FunctionSquare, Home, ShoppingCart } from "lucide-react";
import * as React from "react";
import {
  GlobalSearchQueryVariables,
  Ordering,
  useAgentsQuery,
  useGlobalSearchQuery,
  useListDashboardsQuery,
} from "../api/graphql";
import ActionCard from "../components/cards/ActionCard";
import SearchAgentCard from "../components/cards/SearchAgentCard";

const agentStatusDot = (agent: ListAgentFragment) => {
  if (agent.blocked) return "bg-destructive";
  if (agent.connected) return "bg-emerald-500";
  if (agent.active) return "bg-yellow-500";
  return "bg-muted-foreground/30";
};

const AgentNavItem = ({ agent }: { agent: ListAgentFragment }) => (
  <RekuestAgent.Smart object={agent}>
    <RekuestAgent.PaneLink object={agent}>
      <span
        className={cn("h-1.5 w-1.5 rounded-full shrink-0", agentStatusDot(agent))}
      />
      <span className="flex-1 min-w-0">
        <span className="block text-xs leading-tight truncate">{agent.name}</span>
        <span className="block text-[10px] text-muted-foreground/60 leading-tight truncate">
          {agent.app.identifier}
        </span>
      </span>
    </RekuestAgent.PaneLink>
  </RekuestAgent.Smart>
);

export const NavigationPane = () => {
  const { data } = useAgentsQuery({
    variables: {
      filters: { pinned: false },
      ordering: [{ lastSeen: Ordering.Desc }],
      pagination: { limit: 10 },
    },
  });

  const { data: pinnedAgents } = useAgentsQuery({
    variables: { filters: { pinned: true } },
  });

  const { data: allDashboards } = useListDashboardsQuery();

  return (
    <SidePaneNav columns={3}>
      <SidePaneGroup title="Manage">
        <PaneLink to="/rekuest/home">
          <Home />
          Home
        </PaneLink>
        <PaneLink to="/rekuest/actions">
          <FunctionSquare />
          Actions
        </PaneLink>
        <PaneLink to="/rekuest/tasks">
          <Box />
          Tasks
        </PaneLink>
        <PaneLink to="/rekuest/org-tasks">
          <Box />
          Org Tasks
        </PaneLink>
        <PaneLink to="/rekuest/implementations">
          <FunctionSquare />
          Implementations
        </PaneLink>
        <PaneLink to="/rekuest/toolboxes">
          <Box />
          Toolboxes
        </PaneLink>
        <PaneLink to="/rekuest/spaces">
          <Box />
          Spaces
        </PaneLink>
        <PaneLink to="/rekuest/dashboards">
          <Box />
          Dashboards
        </PaneLink>
        <PaneLink to="/rekuest/bloks">
          <Box />
          Bloks
        </PaneLink>
        <PaneLink to="/rekuest/shortcuts">
          <ShoppingCart />
          Shortcuts
        </PaneLink>
      </SidePaneGroup>

      <SidePaneGroup title="Pinned Apps" limit={6} moreTo="/rekuest/agents">
        {pinnedAgents?.agents.map((agent) => (
          <AgentNavItem key={agent.id} agent={agent} />
        ))}
      </SidePaneGroup>

      <SidePaneGroup title="Recent Apps" limit={6} moreTo="/rekuest/agents">
        {data?.agents.map((agent) => (
          <AgentNavItem key={agent.id} agent={agent} />
        ))}
      </SidePaneGroup>

      <SidePaneGroup title="Dashboards" limit={6} moreTo="/rekuest/dashboards">
        {allDashboards?.dashboards.map((dashboard) => (
          <RekuestDashboard.Smart object={dashboard} key={dashboard.id}>
            <RekuestDashboard.PaneLink object={dashboard}>
              <Box />
              <span className="truncate">{dashboard.name}</span>
            </RekuestDashboard.PaneLink>
          </RekuestDashboard.Smart>
        ))}
      </SidePaneGroup>
    </SidePaneNav>
  );
};

const Pane: React.FunctionComponent = () => {
  const [search, setSearch] = React.useState("");

  const debouncedSearch = useDebounce(search, 300);

  const variables: GlobalSearchQueryVariables = {
    search: debouncedSearch,
    noActions: false,
    noAgents: false,
    pagination: {
      limit: 10,
    },
  };

  const { data } = useGlobalSearchQuery({ variables });

  const searchBar = (
    <div className="w-full flex flex-row">
      <FancyInput
        placeholder="Search..."
        type="string"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-grow h-full bg-background text-foreground w-full"
      />
    </div>
  );

  return (
    <SidebarLayout searchBar={searchBar} bottomBar={<AgentController />}>
      {search.trim() === "" ? (
        <NavigationPane />
      ) : (
        <div className="h-full">
          <ListRender array={data?.agents} >
            {(item, i) => <SearchAgentCard item={item} key={i} />}
          </ListRender>
          <ListRender array={data?.actions}>
            {(item, i) => <ActionCard item={item} key={i} />}
          </ListRender>
        </div>
      )}
    </SidebarLayout>
  );
};

export default Pane;
