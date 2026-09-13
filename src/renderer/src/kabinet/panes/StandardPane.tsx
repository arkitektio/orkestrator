import { ListRender } from "@/components/layout/ListRender";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { FancyInput } from "@/components/ui/fancy-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PaneLink, SidePaneGroup } from "@/components/ui/sidepane";
import { KabinetBackend } from "@/linkers";
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
    <div className="flex-1 flex-col">
      <nav className="grid items-start px-1 text-xs font-medium lg:px-2">
        <SidePaneGroup title="Explore">
          <PaneLink
            to="/kabinet/home"
            className="flex flex-row w-full gap-3 rounded-lg text-muted-foreground transition-all hover:text-primary"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </PaneLink>
          <PaneLink
            to="/kabinet/app-store"
            className="flex flex-row w-full gap-3 rounded-lg text-muted-foreground transition-all hover:text-primary"
          >
            <ShoppingCart className="h-4 w-4" />
            App Store
          </PaneLink>
        </SidePaneGroup>

        <SidePaneGroup title="Manage All">
          <PaneLink
            to="/kabinet/repos"
            className="flex flex-row w-full gap-3 rounded-lg text-muted-foreground transition-all hover:text-primary"
          >
            <GitBranch className="h-4 w-4" />
            Repos
          </PaneLink>
          <PaneLink
            to="/kabinet/pods"
            className="flex flex-row w-full gap-3 rounded-lg text-muted-foreground transition-all hover:text-primary"
          >
            <CubeIcon className="h-4 w-4" />
            Pods
          </PaneLink>
        </SidePaneGroup>

        <SidePaneGroup title={
          <Popover>
            <PopoverTrigger className="flex flex-row w-full gap-3 rounded-lg text-muted-foreground transition-all hover:text-primary items-center uppercase">

              Backends
              <HelpCircle className="h-3 w-3 cursor-pointer" />
            </PopoverTrigger>
            <PopoverContent>
              <h3 className="mb-2 font-bold">What is an engine?</h3>
              <p>
                Engines allow you to execute package plugins on a specific
                computer (computational node). You need to install the engine
                just like an arkitekt app. For more information, please visit
                the documentation.
              </p>
            </PopoverContent>
          </Popover>
        }>


          {data?.backends.map((backend) => (
            <KabinetBackend.PaneLink
              object={backend}
              key={backend.id}
              className="flex flex-row w-full gap-3 rounded-lg text-muted-foreground transition-all hover:text-primary"
            >
              <IconForBackendKind kind={backend.kind} className="h-4 w-4" />
              {backend.name}
            </KabinetBackend.PaneLink>
          ))}

        </SidePaneGroup>
      </nav>
    </div>
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
