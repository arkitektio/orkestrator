import { ListRender } from "@/core/layout/ListRender";
import {
  DeploymentFilter,
  OffsetPaginationInput,
  useListDeploymentsQuery,
} from "../../api/graphql";
import DeploymentCard from "../cards/DeploymentCard";

export type Props = {
  filters?: DeploymentFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, error, refetch } = useListDeploymentsQuery({
    variables: { filters, pagination },
    fetchPolicy: "cache-and-network",
  });

  return (
    <ListRender
      array={data?.deployments}
      error={error}
      refetch={(variables) => refetch(variables)}
      minItemWidth={256}
    >
      {(item) => <DeploymentCard key={item.id} item={item} />}
    </ListRender>
  );
};

export default List;
