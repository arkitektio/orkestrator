import { ListRender } from "@/core/layout/ListRender";
import { SidebarLayout } from "@/core/layout/SidebarLayout";
import { FancyInput } from "@/core/ui/fancy-input";
import { PaneLink, SidePaneGroup, SidePaneNav } from "@/core/ui/sidepane";
import { CubeIcon } from "@radix-ui/react-icons";
import { useDebounce } from "@uidotdev/usehooks";
import { Home, Image } from "lucide-react";
import * as React from "react";
import {
  GlobalSearchQueryVariables,
  useGlobalSearchQuery,
} from "../api/graphql";
import ImageCard from "../components/cards/ImageCard";

export const NavigationPane = () => (
  <SidePaneNav columns={1}>
    <SidePaneGroup title="Data">
      <PaneLink to="/omeroark">
        <Home />
        Dashboard
      </PaneLink>
      <PaneLink to="/omeroark/datasets">
        <Image />
        Datasets
      </PaneLink>
      <PaneLink to="/omeroark/projects">
        <CubeIcon />
        Projects
      </PaneLink>
    </SidePaneGroup>
  </SidePaneNav>
);

const Pane: React.FunctionComponent = () => {
  const [search, setSearch] = React.useState("");

  const debouncedSearch = useDebounce(search, 300);

  const variables: GlobalSearchQueryVariables = {
    search: debouncedSearch,
    noImages: false,
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
        <div className="h-full">
          <ListRender array={data?.images}>
            {(item, i) => <ImageCard image={item} key={i} />}
          </ListRender>
        </div>
      )}
    </SidebarLayout>
  );
};

export default Pane;
