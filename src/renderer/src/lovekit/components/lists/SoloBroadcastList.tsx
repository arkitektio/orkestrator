import { ListRender } from "@/components/layout/ListRender";
import { LovekitSoloBroadcast } from "@/linkers";
import { SoloBroadcastFilter, useListSoloBroadcastsQuery } from "@/lovekit/api/graphql";
import {
  OffsetPaginationInput
} from "@/rekuest/api/graphql";
import SoloBroadcastCard from "../cards/SoloBroadcastCard";

export type Props = {
  title?: string;
  filters?: SoloBroadcastFilter;
  pagination?: OffsetPaginationInput;

};

const List = ({ filters, pagination,  title }: Props) => {
  const { data, refetch } = useListSoloBroadcastsQuery({
    variables: { filter: filters, pagination, },
  });

  return (
    <ListRender
      array={data?.soloBroadcasts}
      title={
        title ? (
          <div className="text-lg font-semibold">{title}</div>
        ) : (
          <LovekitSoloBroadcast.ListLink className="flex-0">Latest  Broadcasts</LovekitSoloBroadcast.ListLink>
        )
      }
      refetch={refetch}
    >
      {(ex) => <SoloBroadcastCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
