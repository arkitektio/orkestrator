import { ListRender } from "@/components/layout/ListRender";
import { KabinetRelease } from "@/linkers";

import { OffsetPaginationInput, useListReleasesQuery } from "../../api/graphql";
import ReleaseCard from "../cards/ReleaseCard";

export type Props = {
  filters?: any;
  pagination?: OffsetPaginationInput;
};

const List = (_props: Props) => {
  const { data, error, refetch } = useListReleasesQuery({
    variables: {},
  });

  return (
    <>
      {JSON.stringify(error)}
      <ListRender
        array={data?.releases}
        title={
          <KabinetRelease.ListLink className="flex-0 mb-5">
            <h2 className="text-2xl font-bold ">Latest Releases</h2>
            <div className="text-muted-foreground text-xs mb-3">
              {data?.releases.length} nodes that your peers have been working on
            </div>
          </KabinetRelease.ListLink>
        }
        refetch={() => refetch()}
      >
        {(ex) => <ReleaseCard key={ex.id} item={ex} />}
      </ListRender>
    </>
  );
};

export default List;
