import { ListRender } from "@/core/layout/ListRender";
import { KabinetRelease } from "@/core/linkers";

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
    <ListRender
      array={data?.releases}
      error={error}
      title={<KabinetRelease.ListLink className="flex-0">Releases</KabinetRelease.ListLink>}
      refetch={() => refetch()}
    >
      {(ex) => <ReleaseCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
