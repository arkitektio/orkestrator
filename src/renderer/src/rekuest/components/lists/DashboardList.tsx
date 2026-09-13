import { ListRender } from "@/components/layout/ListRender";
import { RekuestDashboard } from "@/linkers";
import {
  AgentFilter,
  OffsetPaginationInput,
  useListDashboardsQuery,
} from "@/rekuest/api/graphql";
import DashboardCard from "../cards/DashboardCard";

export type Props = {
  filters?: AgentFilter;
  pagination?: OffsetPaginationInput;
};

const List = (_props: Props) => {
  const { data, refetch } = useListDashboardsQuery({});

  return (
    <ListRender
      array={data?.dashboards}
      title={
        <RekuestDashboard.ListLink className="flex-0">
          Dashbaords
        </RekuestDashboard.ListLink>
      }
      refetch={() => refetch()}
    >
      {(ex) => <DashboardCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
