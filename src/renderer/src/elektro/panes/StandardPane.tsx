import { ListRender } from "@/components/layout/ListRender";
import ExperimentCard from "../components/cards/ExperimentCard";
import SimulationCard from "../components/cards/SimulationCard";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { FancyInput } from "@/components/ui/fancy-input";
import { PaneLink, SidePaneGroup, SidePaneNav } from "@/components/ui/sidepane";
import { useDebounce } from "@/hooks/use-debounce";
import { CubeIcon } from "@radix-ui/react-icons";
import {
  FileIcon,
  Home,
  LayoutDashboard,
  LineChartIcon,
  Network,
} from "lucide-react";
import * as React from "react";
import { RiCheckboxMultipleLine } from "react-icons/ri";
import {
  GlobalSearchQueryVariables,
  useGlobalSearchQuery,
} from "../api/graphql";

export const NavigationPane = () => {
  return (
    <SidePaneNav columns={2}>
      <SidePaneGroup title="Neuron">
        <PaneLink to="/elektro">
          <Home />
          Home
        </PaneLink>
        <PaneLink to="/elektro/simulations">
          <LineChartIcon />
          Simulations
        </PaneLink>
        <PaneLink to="/elektro/experiments">
          <RiCheckboxMultipleLine />
          Experiments
        </PaneLink>
        <PaneLink to="/elektro/neuronmodels">
          <Network />
          Neuron models
        </PaneLink>
        <PaneLink to="/elektro/modelcollections">
          <CubeIcon />
          Model Collections
        </PaneLink>
        <PaneLink to="/elektro/modelworkspaces">
          <LayoutDashboard />
          Workspaces
        </PaneLink>
      </SidePaneGroup>

      <SidePaneGroup title="Ephys">
        <PaneLink to="/elektro/files">
          <FileIcon />
          Files
        </PaneLink>
      </SidePaneGroup>
    </SidePaneNav>
  );
};

const Pane: React.FunctionComponent = () => {
  const [search, setSearch] = React.useState("");

  const debouncedSearch = useDebounce(search, 300);

  const variables: GlobalSearchQueryVariables = {
    search: debouncedSearch,
    pagination: {
      limit: 10,
    },
  };

  const { data, refetch } = useGlobalSearchQuery({ variables });

  React.useEffect(() => {
    refetch(variables);
  }, [debouncedSearch]);

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
    <SidebarLayout searchBar={searchBar}>
      {search.trim() === "" ? (
        <NavigationPane />
      ) : (
        <>
          <ListRender array={data?.experiments}>
            {(item, i) => <ExperimentCard item={item} key={i} />}
          </ListRender>
          <ListRender array={data?.simulations}>
            {(item, i) => <SimulationCard item={item} key={i} />}
          </ListRender>
        </>
      )}
    </SidebarLayout>
  );
};



export default Pane;
