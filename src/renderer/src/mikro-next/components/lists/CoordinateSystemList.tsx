import { ListRender } from "@/components/layout/ListRender";
import { MikroCoordinateSystem } from "@/linkers";
import {
  CoordinateSystemFilter,
  OffsetPaginationInput,
  useGetCoordinateSystemsQuery,
} from "../../api/graphql";
import CoordinateSystemCard from "../cards/CoordinateSystemCard";

export type Props = {
  filters?: CoordinateSystemFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useGetCoordinateSystemsQuery({
    variables: { filters, pagination },
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
