import { Tree } from "@/components/explorer/Tree";
import { ListRender } from "@/components/layout/ListRender";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Button } from "@/components/ui/button";
import { FancyInput } from "@/components/ui/fancy-input";
import { PaneLink, SidePaneGroup } from "@/components/ui/sidepane";
import { useDebounce } from "@/hooks/use-debounce";
import { AlpakaRoom } from "@/linkers";
import { CubeIcon, PlusIcon } from "@radix-ui/react-icons";
import { Home } from "lucide-react";
import * as React from "react";
import {
  GlobalSearchQueryVariables,
  useCreateRoomMutation,
  useGlobalSearchQuery,
  useRoomsQuery,
} from "../api/graphql";
import RoomCard from "../components/cards/RoomCard";


export const NavigationPane = () => {
  const [createRoom] = useCreateRoomMutation({
    refetchQueries: ["Rooms"],
  });

  const { data } = useRoomsQuery();

  return (
    <Tree>
      <SidePaneGroup title="Explore">
        <PaneLink
          to="/alpaka"
          className="flex flex-row w-full gap-3 rounded-lg text-muted-foreground transition-all hover:text-primary"
        >
          <Home className="h-4 w-4" />
          Home
        </PaneLink>
      </SidePaneGroup>

      <SidePaneGroup title="Data">
        <PaneLink
          to="/alpaka/rooms"
          className="flex flex-row w-full gap-3 rounded-lg text-muted-foreground transition-all hover:text-primary"
        >
          <CubeIcon className="h-4 w-4" />
          Rooms
        </PaneLink>
        <PaneLink
          to="/alpaka/collections"
          className="flex flex-row w-full gap-3 rounded-lg text-muted-foreground transition-all hover:text-primary"
        >
          <CubeIcon className="h-4 w-4" />
          Collections
        </PaneLink>
        <PaneLink
          to="/alpaka/llmmodels"
          className="flex flex-row w-full gap-3 rounded-lg text-muted-foreground transition-all hover:text-primary"
        >
          <CubeIcon className="h-4 w-4" />
          Models
        </PaneLink>
        <PaneLink
          to="/alpaka/providers"
          className="flex flex-row w-full gap-3 rounded-lg text-muted-foreground transition-all hover:text-primary"
        >
          <CubeIcon className="h-4 w-4" />
          Providers
        </PaneLink>
      </SidePaneGroup>
      <SidePaneGroup title="Recent"
        action={
          <Button onClick={() => createRoom({
            variables: {
              input: {
                title: "Conversation at " + new Date().toLocaleString(),
                description: "Created by the sidebar",
              }
            }
          })} variant={"ghost"} size={"icon"}>
            <PlusIcon className="h-3 w-3" />
          </Button>
        }
      >
        {data?.rooms.map((room) => (
          <AlpakaRoom.DetailLink
            object={room}
            key={room.id}
            className="flex flex-row w-full gap-3 rounded-lg  text-muted-foreground transition-all hover:text-primary"
          >
            <CubeIcon className="h-4 w-4" />
            {room.title}
          </AlpakaRoom.DetailLink>
        ))}
      </SidePaneGroup>
    </Tree>
  );
};




const Pane: React.FunctionComponent = () => {
  const [search, setSearch] = React.useState("");

  const debouncedSearch = useDebounce(search, 300);

  const variables: GlobalSearchQueryVariables = {
    search: debouncedSearch,
    noRooms: false,
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
          <ListRender array={data?.rooms}>
            {(item) => <RoomCard item={item} key={item.id} />}
          </ListRender>
        </>
      )}
    </SidebarLayout>
  );
};


export default Pane;
