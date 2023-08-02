import { PaginatedList } from "../../../layout/PaginatedList";
import { Stage } from "../../../next_linker";
import { withMikroNext } from "../../MikroNextContext";
import {
  DatasetFilter,
  OffsetPaginationInput,
  useGetStagesQuery,
} from "../../api/graphql";
import StageCard from "../cards/StageCard";

export type Props = {
  filters?: DatasetFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, error, subscribeToMore, refetch } = withMikroNext(
    useGetStagesQuery
  )({
    variables: { filters, pagination },
  });

  return (
    <PaginatedList
      array={data?.stages}
      title={<Stage.ListLink className="flex-0">Stage</Stage.ListLink>}
      refetch={refetch}
    >
      {(ex, index) => <StageCard key={index} stage={ex} mates={[]} />}
    </PaginatedList>
  );
};

export default List;
