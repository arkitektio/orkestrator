import { ListRender } from "@/components/layout/ListRender";
import { LokUser } from "@/linkers";

import {
  GroupFilter,
  OffsetPaginationInput,
  useUsersQuery
} from "@/lok-next/api/graphql";
import UserCard from "../cards/UserCard";

export type Props = {
  filters?: GroupFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useUsersQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.users}
      title={<LokUser.ListLink className="flex-0">Users</LokUser.ListLink>}
      refetch={refetch}
    >
      {(ex) => <UserCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
