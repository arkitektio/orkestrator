import { ListRender } from "@/components/layout/ListRender";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { FancyInput } from "@/components/ui/fancy-input";
import { PaneLink, SidePaneGroup, SidePaneNav } from "@/components/ui/sidepane";
import { useDebounce } from "@/hooks/use-debounce";
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
        <PaneLink to="/team">
          <Users />
          Members
        </PaneLink>
        <PaneLink to="/team/me">
          <RiProfileFill />
          Me
        </PaneLink>
        <PaneLink to="/team/overview">
          <Home />
          Overview
        </PaneLink>
      </SidePaneGroup>

      <SidePaneGroup title="Admin">
        <PaneLink to="/team/users">
          <User />
          Users
        </PaneLink>
        <PaneLink to="/team/apps">
          <AppleIcon />
          Apps
        </PaneLink>
        <PaneLink to="/team/services">
          <CubeIcon />
          Services
        </PaneLink>
        <PaneLink to="/team/instances">
          <CubeIcon />
          Instances
        </PaneLink>
        <PaneLink to="/team/redeemtokens">
          <CubeIcon />
          Redeem Tokens
        </PaneLink>
        <PaneLink to="/team/devices">
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

