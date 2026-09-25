import { ListRender } from "@/core/layout/ListRender";
import ExperimentCard from "../components/cards/ExperimentCard";
import ArrayDatasetCard from "../components/cards/ArrayDatasetCard";
import { SidebarLayout } from "@/core/layout/SidebarLayout";
import { FancyInput } from "@/core/ui/fancy-input";
import { PaneLink, SidePaneGroup, SidePaneNav } from "@/core/ui/sidepane";
import { useDebounce } from "@/core/util/hooks/use-debounce";
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
import { ARRAY_DATASET_SPECS, arrayDatasetSpecLink } from "../specs";
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
        <PaneLink to="/elektro/arraydatasets">
          <LineChartIcon />
          Datasets
        </PaneLink>
        <PaneLink to="/elektro/files">
          <FileIcon />
          Files
        </PaneLink>
      </SidePaneGroup>

      {/* One link per spec, generated from the catalogue so the nav and the
          pages behind it cannot drift apart. */}
      <SidePaneGroup title="By kind">
        {ARRAY_DATASET_SPECS.map((entry) => (
          <PaneLink key={entry.slug} to={arrayDatasetSpecLink(entry.slug)}>
            <entry.icon />
            {entry.label}
          </PaneLink>
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
          <ListRender array={data?.arrayDatasets}>
            {(item, i) => <ArrayDatasetCard item={item} key={i} />}
          </ListRender>
        </>
      )}
    </SidebarLayout>
  );
};



export default Pane;
