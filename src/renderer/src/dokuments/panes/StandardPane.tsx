import { ListRender } from "@/core/layout/ListRender";
import { SidebarLayout } from "@/core/layout/SidebarLayout";
import { FancyInput } from "@/core/ui/fancy-input";
import { PaneLink, SidePaneGroup, SidePaneNav } from "@/core/ui/sidepane";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/core/ui/popover";
import { useDebounce } from "@uidotdev/usehooks";
import { ArrowDown, Home } from "lucide-react";
import * as React from "react";
import {
  GlobalSearchQueryVariables,
  useGlobalSearchQuery,
} from "../api/graphql";
import PageCard from "../components/cards/PageCard";

export const NavigationPane = () => (
  <SidePaneNav columns={1}>
    <SidePaneGroup title="Explore">
      <PaneLink to="/dokuments">
        <Home />
        Home
      </PaneLink>
    </SidePaneGroup>
  </SidePaneNav>
);

const Pane: React.FunctionComponent = () => {
  const [search, setSearch] = React.useState("");

  const debouncedSearch = useDebounce(search, 300);

  const variables: GlobalSearchQueryVariables = {
    search: debouncedSearch,
  };

  const { data, refetch } = useGlobalSearchQuery({ variables });

  React.useEffect(() => {
    refetch(variables);
  }, [debouncedSearch]);

  const searchBar = (
    <div className="w-full flex flex-row">
      <Popover>
        <PopoverAnchor asChild>
          <div className="h-full w-full relative flex flex-row">
            <FancyInput
              placeholder="Search..."
              type="string"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-grow h-full bg-background text-foreground w-full"
            />
            <PopoverTrigger className="absolute right-1 top-1 text-foreground">
              <ArrowDown />
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
        <PopoverContent>
          <div className="flex flex-col gap-2">
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <SidebarLayout searchBar={searchBar}>
      {search.trim() === "" ? (
        <NavigationPane />
      ) : (
        <div className="h-full">
          <ListRender array={data?.pages}>
            {(item, i) => <PageCard item={item} key={i} />}
          </ListRender>
        </div>
      )}
    </SidebarLayout>
  );
};

export default Pane;
