import { ListRender } from "@/core/layout/ListRender";
import { SidebarLayout } from "@/core/layout/SidebarLayout";
import { Button } from "@/core/ui/button";
import { FancyInput } from "@/core/ui/fancy-input";
import { PaneLink, SidePaneGroup, SidePaneNav } from "@/core/ui/sidepane";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import { AlpakaRoom } from "@/core/linkers";
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
    <SidePaneNav columns={2}>
      <SidePaneGroup title="Explore">
        <PaneLink to="/alpaka">
          <Home />
          Home
        </PaneLink>
        <PaneLink to="/alpaka/rooms">
          <CubeIcon />
          Rooms
        </PaneLink>
        <PaneLink to="/alpaka/collections">
          <CubeIcon />
          Collections
        </PaneLink>
        <PaneLink to="/alpaka/llmmodels">
          <CubeIcon />
          Models
        </PaneLink>
        <PaneLink to="/alpaka/providers">
          <CubeIcon />
          Providers
        </PaneLink>
      </SidePaneGroup>

      <SidePaneGroup
        title="Recent rooms"
        limit={6}
        moreTo="/alpaka/rooms"
        action={
          <Button
            onClick={() =>
              createRoom({
                variables: {
                  input: {
                    title: "Conversation at " + new Date().toLocaleString(),
                    description: "Created by the sidebar",
                  },
                },
              })
            }
            variant={"ghost"}
            size={"icon"}
          >
            <PlusIcon className="h-3 w-3" />
          </Button>
        }
      >
        {data?.rooms.map((room) => (
          <AlpakaRoom.PaneLink object={room} key={room.id}>
            <CubeIcon />
            <span className="truncate">{room.title}</span>
          </AlpakaRoom.PaneLink>
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
