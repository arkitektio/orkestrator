import { ListRender } from "@/core/components/layout/ListRender";
import { SidebarLayout } from "@/core/components/layout/SidebarLayout";
import { FancyInput } from "@/core/components/ui/fancy-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { PaneLink, SidePaneGroup, SidePaneNav } from "@/core/components/ui/sidepane";
import { KabinetBackend } from "@/core/linkers";
import { CubeIcon } from "@radix-ui/react-icons";
import { useDebounce } from "@uidotdev/usehooks";
import { GitBranch, HelpCircle, Home, ShoppingCart } from "lucide-react";
import * as React from "react";
import {
  GlobalSearchQueryVariables,
  useGlobalSearchQuery,
  useListBackendsQuery,
} from "../api/graphql";
import DefinitionCard from "../components/cards/DefinitionCard";
import { IconForBackendKind } from "../components/IconForBackendKind";

export const NavigationPane = () => {
  const { data } = useListBackendsQuery();

  return (
    <SidePaneNav columns={2}>
      <SidePaneGroup title="Explore">
        <PaneLink to="/kabinet/home">
          <Home />
          Dashboard
        </PaneLink>
        <PaneLink to="/kabinet/app-store">
          <ShoppingCart />
          App Store
        </PaneLink>
        <PaneLink to="/kabinet/repos">
          <GitBranch />
          Repos
        </PaneLink>
        <PaneLink to="/kabinet/pods">
          <CubeIcon />
          Pods
        </PaneLink>
      </SidePaneGroup>

      <SidePaneGroup
        title="Backends"
        limit={6}
        action={
          <Popover>
            <PopoverTrigger className="flex items-center justify-center text-muted-foreground hover:text-foreground">
              <HelpCircle className="h-3 w-3" />
            </PopoverTrigger>
            <PopoverContent className="text-sm">
              <h3 className="mb-2 font-bold">What is a backend?</h3>
              <p>
                Backends let you run package plugins on a specific computer
                (computational node). You install one just like an Arkitekt
                app. See the documentation for more.
              </p>
            </PopoverContent>
          </Popover>
        }
      >
        {data?.backends.map((backend) => (
          <KabinetBackend.PaneLink object={backend} key={backend.id}>
            <IconForBackendKind kind={backend.kind} className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{backend.name}</span>
          </KabinetBackend.PaneLink>
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

  const { data } = useGlobalSearchQuery({ variables });

  return (
    <>
      <SidebarLayout
        searchBar={
          <FancyInput
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-grow h-full bg-background text-foreground w-full"
          />
        }
      >
        {variables?.search == "" ? (
          <>
            <NavigationPane />
          </>
        ) : (
          <>
            <ListRender array={data?.definitions}>
              {(item) => <DefinitionCard item={item} key={item.id} />}
            </ListRender>
          </>
        )}
      </SidebarLayout>
    </>
  );
};

export default Pane;
