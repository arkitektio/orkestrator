import { ListRender } from "@/components/layout/ListRender";

import {
  AppFilter,
  OffsetPaginationInput,
  useAppsQuery
} from "@/lok-next/api/graphql";
import AppCard from "../cards/AppCard";

export type Props = {
  filters?: AppFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useAppsQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.apps} // changed from clients to apps  here
      title={
        <div className="flex-0">Apps</div>
      }
      refetch={refetch}
    >
      {(ex) => <AppCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
