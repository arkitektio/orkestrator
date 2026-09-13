import { ListRender } from "@/components/layout/ListRender";
import { KabinetDefinition } from "@/linkers";
import { OffsetPaginationInput, useListPodQuery } from "../../api/graphql";
import PodCard from "../cards/PodCard";

export type Props = {
  pagination?: OffsetPaginationInput;
};

const List = (_props: Props) => {
  const { data, refetch } = useListPodQuery({
    variables: {},
  });

  return (
    <ListRender
      array={data?.pods}
      title={
        <KabinetDefinition.ListLink className="flex-0 mb-5">
          <h2 className="text-2xl font-bold ">Running Pods</h2>
          <div className="text-muted-foreground text-xs mb-3">
            {data?.pods.length} pods that are currently running
          </div>
        </KabinetDefinition.ListLink>
      }
      refetch={() => refetch()}
    >
      {(ex) => <PodCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
