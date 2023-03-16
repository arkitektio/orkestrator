import React, { useEffect } from "react";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import {
  PortGlobalSearchQueryVariables,
  usePortGlobalSearchQuery,
} from "../../port/api/graphql";
import { ContainerCard } from "../../port/components/cards/ContainerCard";
import { WhaleCard } from "../../port/components/cards/WhaleCard";
import { PortSearch } from "../../port/components/PortSearch";
import { withPort } from "../../port/PortContext";

export type IWhalesSidebarProps = {};

const PortSidebar: React.FC<IWhalesSidebarProps> = ({}) => {
  const [filter, setFilter] = React.useState<PortGlobalSearchQueryVariables>({
    search: "",
  });
  const { data, refetch } = withPort(usePortGlobalSearchQuery)({
    //pollInterval: 1000,
  });

  useEffect(() => {
    refetch(filter);
  }, [filter, fetch]);

  return (
    <div className="flex h-full flex-col" data-enableselect={true}>
      <div className="flex-none p-5 dark:text-slate-50">
        <PortSearch onSearch={(v) => setFilter(v)} />
      </div>
      <div
        className="flex-grow flex flex-col gap-2  p-3 overflow-y-scroll "
        data-enableselect={true}
      >
        {data?.containers && data?.containers.length > 0 && (
          <>
            <div className="font-semibold text-center text-xs dark:text-slate-50 mt-2">
              Containers
            </div>
            <ResponsiveContainerGrid>
              {data?.containers?.filter(notEmpty).map((container, index) => (
                <ContainerCard key={index} container={container} mates={[]} />
              ))}
            </ResponsiveContainerGrid>
          </>
        )}

        {data?.whales && data?.whales.length > 0 && (
          <>
            <div
              className="font-semibold text-center text-xs dark:text-slate-50 mt-2"
              data-enableselect={true}
            >
              Whales
            </div>
            <ResponsiveContainerGrid>
              {data?.whales?.filter(notEmpty).map((whale, index) => (
                <WhaleCard key={index} whale={whale} mates={[]} />
              ))}
            </ResponsiveContainerGrid>
          </>
        )}
      </div>
    </div>
  );
};

export { PortSidebar };
