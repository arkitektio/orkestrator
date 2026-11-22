import { ListRender } from "@/core/layout/ListRender";
import { MikroCoordinateSystem } from "@/core/linkers";
import {
  CoordinateSystemFilter,
  CoordinateSystemOrder,
  OffsetPaginationInput,
  useGetCoordinateSystemsQuery,
} from "../../api/graphql";
import CoordinateSystemCard from "../cards/CoordinateSystemCard";

export type Props = {
  filters?: CoordinateSystemFilter;
  ordering?: CoordinateSystemOrder[];
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, ordering, pagination }: Props) => {
  const { data, refetch } = useGetCoordinateSystemsQuery({
    variables: { filters, ordering, pagination },
  });

  return (
    <ListRender
      array={data?.coordinateSystems}
      title={
        <MikroCoordinateSystem.ListLink className="flex-0">
          Latest Coordinate Systems
        </MikroCoordinateSystem.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <CoordinateSystemCard key={ex.id} system={ex} />}
    </ListRender>
  );
};

export default List;
