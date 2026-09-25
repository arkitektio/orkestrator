import { SidebarLayout } from "@/core/components/layout/SidebarLayout";
import { FancyInput } from "@/core/components/ui/fancy-input";
import { PaneLink, SidePaneGroup, SidePaneNav } from "@/core/components/ui/sidepane";
import { useDebounce } from "@/core/hooks/use-debounce";
import {
  KraphEntityCategory,
  KraphProtocolEventCategory,
  KraphRelationCategory,
  KraphStructureKind
} from "@/core/linkers";
import {
  CatIcon,
  Divide,
  Home,
  Notebook,
  Ruler,
  SparkleIcon,
  SpellCheck,
} from "lucide-react";
import * as React from "react";
import { BsRecord } from "react-icons/bs";
import { PiNumberCircleEight } from "react-icons/pi";
import { TbRelationOneToOne } from "react-icons/tb";
import {
  GlobalSearchQueryVariables,
  useGlobalSearchQuery,
  useStartPaneQuery,
} from "../api/graphql";


export const NavigationPane = () => {
  const { data } = useStartPaneQuery();

  return (
    <SidePaneNav columns={3}>
      <SidePaneGroup title="Explore">
        <PaneLink to="/kraph/home">
          <Home />
          Dashboard
        </PaneLink>
        <PaneLink to="/kraph/graphs">
          <SparkleIcon />
          Graphs
        </PaneLink>
        <PaneLink to="/kraph/terms">
          <SpellCheck />
          Terms
        </PaneLink>
      </SidePaneGroup>

      <SidePaneGroup title="Categories">
        <PaneLink to="/kraph/structurekinds">
          <BsRecord />
          Structures
        </PaneLink>
        <PaneLink to="/kraph/entitycategories">
          <CatIcon />
          Entities
        </PaneLink>
        <PaneLink to="/kraph/protocoleventcategories">
          <Notebook />
          Protocol Events
        </PaneLink>
        <PaneLink to="/kraph/naturaleventcategories">
          <Divide />
          Natural Events
        </PaneLink>
        <PaneLink to="/kraph/relationcategories">
          <TbRelationOneToOne />
          Relations
        </PaneLink>
        <PaneLink to="/kraph/structurerelationcategories">
          <TbRelationOneToOne />
          Structure Relations
        </PaneLink>
        <PaneLink to="/kraph/metrickinds">
          <PiNumberCircleEight />
          Metrics
        </PaneLink>
        <PaneLink to="/kraph/measurementcategories">
          <Ruler />
          Measurements
        </PaneLink>
      </SidePaneGroup>

      <SidePaneGroup title="Pinned Entities" limit={5} moreTo="/kraph/entitycategories">
        {data?.entityCategories.map((i) => (
          <KraphEntityCategory.PaneLink object={i} key={i.id}>
            <SparkleIcon />
            <span className="truncate">{i.label}</span>
          </KraphEntityCategory.PaneLink>
        ))}
      </SidePaneGroup>

      <SidePaneGroup title="Recent Structures" limit={5} moreTo="/kraph/structurekinds">
        {data?.structureKinds.map((i) => (
          <KraphStructureKind.PaneLink object={i} key={i.id}>
            <SparkleIcon />
            <span className="truncate">{i.identifier}</span>
          </KraphStructureKind.PaneLink>
        ))}
      </SidePaneGroup>

      <SidePaneGroup title="Pinned Relations" limit={5} moreTo="/kraph/relationcategories">
        {data?.relationCategories.map((i) => (
          <KraphRelationCategory.PaneLink object={i} key={i.id}>
            <SparkleIcon />
            <span className="truncate">{i.label}</span>
          </KraphRelationCategory.PaneLink>
        ))}
      </SidePaneGroup>

      <SidePaneGroup
        title="Pinned Protocols"
        limit={5}
        moreTo="/kraph/protocoleventcategories"
      >
        {data?.protocolEventCategories.map((i) => (
          <KraphProtocolEventCategory.PaneLink object={i} key={i.id}>
            <SparkleIcon />
            <span className="truncate">{i.label}</span>
          </KraphProtocolEventCategory.PaneLink>
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

  };

  const { refetch } = useGlobalSearchQuery({ variables });

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
        <div className="h-full">
          Not implemented yet
        </div>
      )}
    </SidebarLayout>
  );
};

export default Pane;
