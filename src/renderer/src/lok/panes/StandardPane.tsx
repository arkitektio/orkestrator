import { ListRender } from "@/core/layout/ListRender";
import { SidebarLayout } from "@/core/layout/SidebarLayout";
import { FancyInput } from "@/core/ui/fancy-input";
import { PaneLink, SidePaneGroup, SidePaneNav } from "@/core/ui/sidepane";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import { CubeIcon } from "@radix-ui/react-icons";
import { AppleIcon, Home, User, Users } from "lucide-react";
import * as React from "react";
import { RiProfileFill } from "react-icons/ri";
import {
  GlobalSearchQueryVariables,
  useGlobalSearchQuery,
} from "../api/graphql";
import GroupCard from "../components/cards/GroupCard";
import UserCard from "../components/cards/UserCard";

export const NavigationPane = () => {
  return (
    <SidePaneNav columns={2}>
      <SidePaneGroup title="Team">
        <PaneLink to="/lok">
          <Users />
          Members
        </PaneLink>
        <PaneLink to="/lok/me">
          <RiProfileFill />
          Me
        </PaneLink>
        <PaneLink to="/lok/overview">
          <Home />
          Overview
        </PaneLink>
      </SidePaneGroup>

      <SidePaneGroup title="Admin">
        <PaneLink to="/lok/users">
          <User />
          Users
        </PaneLink>
        <PaneLink to="/lok/apps">
          <AppleIcon />
          Apps
        </PaneLink>
        <PaneLink to="/lok/services">
          <CubeIcon />
          Services
        </PaneLink>
        <PaneLink to="/lok/instances">
          <CubeIcon />
          Instances
        </PaneLink>
        <PaneLink to="/lok/redeemtokens">
          <CubeIcon />
          Redeem Tokens
        </PaneLink>
        <PaneLink to="/lok/devices">
          <CubeIcon />
          Devices
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
    noGroups: false,
    noUsers: false,
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
          <ListRender array={data?.users}>
            {(item, i) => <UserCard item={item} key={i} />}
          </ListRender>
          <ListRender array={data?.groups}>
            {(item, i) => <GroupCard item={item} key={i} />}
          </ListRender>
        </>
      )}
    </SidebarLayout>
  );
};


export default Pane;

