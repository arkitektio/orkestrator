import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { Team } from "../../linker";
import {
  LokGlobalSearchQueryVariables,
  useLokGlobalSearchLazyQuery,
  useLokGlobalSearchQuery,
  useMyGroupsQuery,
} from "../../lok/api/graphql";
import { AppCard } from "../../lok/components/cards/AppCard";
import { TeamCard } from "../../lok/components/cards/TeamCard";
import { UserCard } from "../../lok/components/cards/UserCard";
import { LokSearch } from "../../lok/components/LokSearch";
import { withMan } from "../../lok/man";
export type IMyRepresentationsProps = {};

const limit = 20;

const LokSidebar: React.FC<IMyRepresentationsProps> = () => {
  const [filter, setFilter] = React.useState<LokGlobalSearchQueryVariables>({
    search: "",
  });
  const { data, refetch } = withMan(useLokGlobalSearchQuery)({
    //pollInterval: 1000,
  });

  useEffect(() => {
    refetch(filter);
  }, [filter, fetch]);

  return (
    <div className="flex h-full flex-col" data-enableselect={true}>
      <div className="flex-none p-5 dark:text-slate-50">
        <LokSearch onSearch={(v) => setFilter(v)} />
      </div>
      <div
        className="flex-grow flex flex-col gap-2  p-3 overflow-y-scroll "
        data-enableselect={true}
      >
        {data?.groups && data?.groups.length > 0 && (
          <>
            <div className="font-semibold text-center text-xs dark:text-slate-50 mt-2">
              Groups
            </div>
            <ResponsiveContainerGrid>
              {data?.groups?.filter(notEmpty).map((group, index) => (
                <TeamCard key={index} group={group} />
              ))}
            </ResponsiveContainerGrid>
          </>
        )}

        {data?.users && data?.users.length > 0 && (
          <>
            <div
              className="font-semibold text-center text-xs dark:text-slate-50 mt-2"
              data-enableselect={true}
            >
              Users
            </div>
            <ResponsiveContainerGrid>
              {data?.users?.filter(notEmpty).map((user, index) => (
                <UserCard key={index} user={user} />
              ))}
            </ResponsiveContainerGrid>
          </>
        )}

        {data?.apps && data?.apps.length > 0 && (
          <>
            <div
              className="font-semibold text-center text-xs dark:text-slate-50 mt-2"
              data-enableselect={true}
            >
              Apps
            </div>
            <ResponsiveContainerGrid>
              {data?.apps?.filter(notEmpty).map((a, index) => (
                <AppCard app={a} key={index} />
              ))}
            </ResponsiveContainerGrid>
          </>
        )}
      </div>
    </div>
  );
};

export { LokSidebar };
